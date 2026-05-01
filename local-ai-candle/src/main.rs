//! Cross-platform AI demo with text generation, image captioning, image generation,
//! audio-to-text (Whisper), and text-to-voice (MetaVoice) using Candle
//!
//! Supports: macOS (Metal/Accelerate), Linux (CPU/CUDA), Android, iOS

use anyhow::{Error as E, Result};
use candle_core::{DType, Device, IndexOp, Module, Tensor};
use candle_nn::VarBuilder;
use clap::{Parser, Subcommand, ValueEnum};
use rand::distr::Distribution;
use rand::SeedableRng;
use std::io::Write;
use std::path::PathBuf;
use tokenizers::Tokenizer;

use candle_transformers::generation::{LogitsProcessor, Sampling};
use candle_transformers::models::blip;
use candle_transformers::models::quantized_blip;
use candle_transformers::models::quantized_qwen2::ModelWeights as Qwen2;
use candle_transformers::models::stable_diffusion;

// Whisper models
use candle_transformers::models::whisper::{self as m, audio, Config as WhisperConfig};

// MetaVoice models
use candle_transformers::models::encodec;
use candle_transformers::models::metavoice::{adapters, gpt, tokenizers as mv_tokenizers, transformer};
use candle_transformers::models::quantized_metavoice::transformer as qtransformer;

// ============================================================================
// Token Output Stream (for streaming text generation)
// ============================================================================

pub struct TokenOutputStream {
    tokenizer: Tokenizer,
    tokens: Vec<u32>,
    prev_index: usize,
    current_index: usize,
}

impl TokenOutputStream {
    pub fn new(tokenizer: Tokenizer) -> Self {
        Self {
            tokenizer,
            tokens: Vec::new(),
            prev_index: 0,
            current_index: 0,
        }
    }

    fn decode(&self, tokens: &[u32]) -> Result<String> {
        self.tokenizer
            .decode(tokens, true)
            .map_err(|e| anyhow::anyhow!("cannot decode: {e}"))
    }

    pub fn next_token(&mut self, token: u32) -> Result<Option<String>> {
        let prev_text = if self.tokens.is_empty() {
            String::new()
        } else {
            self.decode(&self.tokens[self.prev_index..self.current_index])?
        };
        self.tokens.push(token);
        let text = self.decode(&self.tokens[self.prev_index..])?;
        if text.len() > prev_text.len() && text.chars().last().unwrap().is_alphanumeric() {
            let text = text.split_at(prev_text.len());
            self.prev_index = self.current_index;
            self.current_index = self.tokens.len();
            Ok(Some(text.1.to_string()))
        } else {
            Ok(None)
        }
    }

    pub fn decode_rest(&self) -> Result<Option<String>> {
        let prev_text = if self.tokens.is_empty() {
            String::new()
        } else {
            self.decode(&self.tokens[self.prev_index..self.current_index])?
        };
        let text = self.decode(&self.tokens[self.prev_index..])?;
        if text.len() > prev_text.len() {
            let text = text.split_at(prev_text.len());
            Ok(Some(text.1.to_string()))
        } else {
            Ok(None)
        }
    }

    pub fn tokenizer(&self) -> &Tokenizer {
        &self.tokenizer
    }
}

// ============================================================================
// CLI Definition
// ============================================================================

#[derive(Parser)]
#[command(name = "local-ai")]
#[command(about = "Cross-platform AI inference using Candle")]
struct Cli {
    #[command(subcommand)]
    command: Commands,

    /// Run on CPU (default: auto-detect GPU)
    #[arg(long, global = true)]
    cpu: bool,
}

#[derive(Subcommand)]
enum Commands {
    /// Generate text (Qwen2 quantized GGUF)
    Text {
        /// Path to GGUF model file
        #[arg(long, short = 'm')]
        model: PathBuf,

        /// Path to tokenizer.json
        #[arg(long, short = 't')]
        tokenizer: PathBuf,

        /// Input prompt
        #[arg(long, short = 'p')]
        prompt: String,

        /// Max tokens to generate
        #[arg(long, default_value_t = 200)]
        max_tokens: usize,

        /// Temperature (0 = greedy)
        #[arg(long, default_value_t = 0.7)]
        temperature: f64,

        /// Random seed
        #[arg(long, default_value_t = 42)]
        seed: u64,
    },

    /// Caption an image (BLIP quantized GGUF)
    ImageToText {
        /// Path to GGUF model file
        #[arg(long, short = 'm')]
        model: PathBuf,

        /// Path to tokenizer.json
        #[arg(long, short = 't')]
        tokenizer: PathBuf,

        /// Path to input image
        #[arg(long, short = 'i')]
        image: PathBuf,
    },

    /// Generate image from text (Stable Diffusion 1.5)
    TextToImage {
        /// The prompt for image generation
        #[arg(long, short = 'p')]
        prompt: String,

        /// Unconditional prompt (negative prompt)
        #[arg(long, default_value = "")]
        uncond_prompt: String,

        /// Path to UNet weights (.safetensors)
        #[arg(long)]
        unet: PathBuf,

        /// Path to VAE weights (.safetensors)
        #[arg(long)]
        vae: PathBuf,

        /// Path to CLIP text encoder weights (.safetensors)
        #[arg(long)]
        clip: PathBuf,

        /// Path to tokenizer.json
        #[arg(long, short = 't')]
        tokenizer: PathBuf,

        /// Output image path
        #[arg(long, short = 'o', default_value = "output.png")]
        output: PathBuf,

        /// Image height (must be multiple of 8)
        #[arg(long, default_value_t = 512)]
        height: usize,

        /// Image width (must be multiple of 8)
        #[arg(long, default_value_t = 512)]
        width: usize,

        /// Number of diffusion steps
        #[arg(long, default_value_t = 30)]
        steps: usize,

        /// Guidance scale
        #[arg(long, default_value_t = 7.5)]
        guidance_scale: f64,

        /// Random seed
        #[arg(long, default_value_t = 42)]
        seed: u64,
    },

    /// Transcribe audio to text (Whisper)
    AudioToText {
        /// Path to audio file (wav, mp3, flac, etc.)
        #[arg(long, short = 'i')]
        input: PathBuf,

        /// Path to model weights (.safetensors or .gguf for quantized)
        #[arg(long, short = 'm')]
        model: PathBuf,

        /// Path to tokenizer.json
        #[arg(long, short = 't')]
        tokenizer: PathBuf,

        /// Path to config.json
        #[arg(long, short = 'c')]
        config: PathBuf,

        /// Use quantized model (expects .gguf format)
        #[arg(long)]
        quantized: bool,

        /// Language for transcription (e.g., "en", "es", "fr")
        #[arg(long)]
        language: Option<String>,

        /// Task: transcribe or translate
        #[arg(long, default_value = "transcribe")]
        task: WhisperTask,

        /// Show timestamps
        #[arg(long)]
        timestamps: bool,

        /// Random seed
        #[arg(long, default_value_t = 42)]
        seed: u64,
    },

    /// Generate text embeddings (candle_embed + Hugging Face BERT-family models)
    Embed {
        /// One or more input texts to embed (pass --text multiple times for a batch)
        #[arg(long, short = 't', required = true)]
        text: Vec<String>,

        /// Hugging Face model id (e.g. sentence-transformers/all-MiniLM-L6-v2)
        #[arg(long, default_value = "sentence-transformers/all-MiniLM-L6-v2")]
        model: String,

        /// Model revision (branch/tag/commit on HF)
        #[arg(long, default_value = "main")]
        revision: String,

        /// Disable L2 normalization of output embeddings
        #[arg(long)]
        no_normalize: bool,

        /// Disable mean pooling (use CLS token instead)
        #[arg(long)]
        no_mean_pool: bool,

        /// Output format: vector | stats
        #[arg(long, default_value = "stats")]
        format: EmbedFormat,
    },

    /// Generate speech from text (MetaVoice)
    TextToVoice {
        /// Text prompt to synthesize
        #[arg(long, short = 'p')]
        prompt: String,

        /// Path to first stage model weights (.safetensors or .gguf for quantized)
        #[arg(long)]
        first_stage: PathBuf,

        /// Path to first stage meta JSON
        #[arg(long)]
        first_stage_meta: PathBuf,

        /// Path to second stage model weights (.safetensors)
        #[arg(long)]
        second_stage: PathBuf,

        /// Path to Encodec model weights (.safetensors)
        #[arg(long)]
        encodec: PathBuf,

        /// Path to speaker embedding file (.safetensors)
        #[arg(long)]
        spk_emb: PathBuf,

        /// Use quantized first stage model
        #[arg(long)]
        quantized: bool,

        /// Output WAV file path
        #[arg(long, short = 'o', default_value = "output.wav")]
        output: PathBuf,

        /// Guidance scale
        #[arg(long, default_value_t = 3.0)]
        guidance_scale: f64,

        /// Temperature for sampling
        #[arg(long, default_value_t = 1.0)]
        temperature: f64,

        /// Maximum tokens for first stage
        #[arg(long, default_value_t = 2000)]
        max_tokens: u64,

        /// Random seed
        #[arg(long, default_value_t = 42)]
        seed: u64,
    },
}

#[derive(Clone, Copy, Debug, ValueEnum)]
enum WhisperTask {
    Transcribe,
    Translate,
}

#[derive(Clone, Copy, Debug, ValueEnum)]
enum EmbedFormat {
    /// Print the full embedding vector(s)
    Vector,
    /// Print dimensions + first 8 values + L2 norm
    Stats,
}

// ============================================================================
// Device Selection
// ============================================================================

fn select_device(cpu: bool) -> Result<Device> {
    if cpu {
        return Ok(Device::Cpu);
    }

    #[cfg(feature = "metal")]
    {
        return Ok(Device::new_metal(0)?);
    }

    #[cfg(feature = "cuda")]
    {
        return Ok(Device::new_cuda(0)?);
    }

    #[cfg(not(any(feature = "metal", feature = "cuda")))]
    {
        Ok(Device::Cpu)
    }
}

// ============================================================================
// Audio Utilities
// ============================================================================

/// Decode audio file to PCM samples
fn pcm_decode<P: AsRef<std::path::Path>>(path: P) -> Result<(Vec<f32>, u32)> {
    use symphonia::core::audio::{AudioBufferRef, Signal};
    use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
    use symphonia::core::conv::FromSample;

    fn conv<T>(
        samples: &mut Vec<f32>,
        data: std::borrow::Cow<symphonia::core::audio::AudioBuffer<T>>,
    ) where
        T: symphonia::core::sample::Sample,
        f32: symphonia::core::conv::FromSample<T>,
    {
        samples.extend(data.chan(0).iter().map(|v| f32::from_sample(*v)))
    }

    let src = std::fs::File::open(path)?;
    let mss = symphonia::core::io::MediaSourceStream::new(Box::new(src), Default::default());
    let hint = symphonia::core::probe::Hint::new();
    let meta_opts: symphonia::core::meta::MetadataOptions = Default::default();
    let fmt_opts: symphonia::core::formats::FormatOptions = Default::default();

    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &fmt_opts, &meta_opts)
        .map_err(|e| anyhow::anyhow!("Failed to probe audio format: {e}"))?;
    let mut format = probed.format;

    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
        .ok_or_else(|| anyhow::anyhow!("No supported audio tracks found"))?;

    let dec_opts: DecoderOptions = Default::default();
    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &dec_opts)
        .map_err(|_| anyhow::anyhow!("Unsupported codec"))?;
    let track_id = track.id;
    let sample_rate = track.codec_params.sample_rate.unwrap_or(0);
    let mut pcm_data = Vec::new();

    while let Ok(packet) = format.next_packet() {
        while !format.metadata().is_latest() {
            format.metadata().pop();
        }
        if packet.track_id() != track_id {
            continue;
        }
        match decoder.decode(&packet).map_err(|e| anyhow::anyhow!("Decode error: {e}"))? {
            AudioBufferRef::F32(buf) => pcm_data.extend(buf.chan(0)),
            AudioBufferRef::U8(data) => conv(&mut pcm_data, data),
            AudioBufferRef::U16(data) => conv(&mut pcm_data, data),
            AudioBufferRef::U24(data) => conv(&mut pcm_data, data),
            AudioBufferRef::U32(data) => conv(&mut pcm_data, data),
            AudioBufferRef::S8(data) => conv(&mut pcm_data, data),
            AudioBufferRef::S16(data) => conv(&mut pcm_data, data),
            AudioBufferRef::S24(data) => conv(&mut pcm_data, data),
            AudioBufferRef::S32(data) => conv(&mut pcm_data, data),
            AudioBufferRef::F64(data) => conv(&mut pcm_data, data),
        }
    }

    Ok((pcm_data, sample_rate))
}

/// Write PCM samples to a WAV file
fn write_pcm_as_wav<W: Write>(w: &mut W, samples: &[f32], sample_rate: u32) -> std::io::Result<()> {
    let len = 12u32; // header
    let len = len + 24u32; // fmt
    let len = len + samples.len() as u32 * 2 + 8; // data
    let n_channels = 1u16;
    let bytes_per_second = sample_rate * 2 * n_channels as u32;
    
    w.write_all(b"RIFF")?;
    w.write_all(&(len - 8).to_le_bytes())?;
    w.write_all(b"WAVE")?;

    // Format block
    w.write_all(b"fmt ")?;
    w.write_all(&16u32.to_le_bytes())?;
    w.write_all(&1u16.to_le_bytes())?; // PCM
    w.write_all(&n_channels.to_le_bytes())?;
    w.write_all(&sample_rate.to_le_bytes())?;
    w.write_all(&bytes_per_second.to_le_bytes())?;
    w.write_all(&2u16.to_le_bytes())?;
    w.write_all(&16u16.to_le_bytes())?;

    // Data block
    w.write_all(b"data")?;
    w.write_all(&(samples.len() as u32 * 2).to_le_bytes())?;
    for sample in samples.iter() {
        let s = (sample.clamp(-1.0, 1.0) * 32767.0) as i16;
        w.write_all(&s.to_le_bytes())?;
    }
    Ok(())
}

/// Normalize audio loudness
fn normalize_loudness(pcm: &[f32]) -> Vec<f32> {
    let max_val = pcm.iter().map(|x| x.abs()).fold(0.0f32, f32::max);
    if max_val > 0.0 {
        pcm.iter().map(|x| x / max_val * 0.95).collect()
    } else {
        pcm.to_vec()
    }
}

// ============================================================================
// Whisper Model Wrapper
// ============================================================================

enum WhisperModel {
    Normal(m::model::Whisper),
    Quantized(m::quantized_model::Whisper),
}

impl WhisperModel {
    fn config(&self) -> &WhisperConfig {
        match self {
            Self::Normal(m) => &m.config,
            Self::Quantized(m) => &m.config,
        }
    }

    fn encoder_forward(&mut self, x: &Tensor, flush: bool) -> candle_core::Result<Tensor> {
        match self {
            Self::Normal(m) => m.encoder.forward(x, flush),
            Self::Quantized(m) => m.encoder.forward(x, flush),
        }
    }

    fn decoder_forward(&mut self, x: &Tensor, xa: &Tensor, flush: bool) -> candle_core::Result<Tensor> {
        match self {
            Self::Normal(m) => m.decoder.forward(x, xa, flush),
            Self::Quantized(m) => m.decoder.forward(x, xa, flush),
        }
    }

    fn decoder_final_linear(&self, x: &Tensor) -> candle_core::Result<Tensor> {
        match self {
            Self::Normal(m) => m.decoder.final_linear(x),
            Self::Quantized(m) => m.decoder.final_linear(x),
        }
    }
}

fn token_id(tokenizer: &Tokenizer, token: &str) -> Result<u32> {
    match tokenizer.token_to_id(token) {
        None => anyhow::bail!("No token-id for {token}"),
        Some(id) => Ok(id),
    }
}

// ============================================================================
// Audio to Text (Whisper)
// ============================================================================

#[allow(clippy::too_many_arguments)]
fn transcribe_audio(
    input_path: &PathBuf,
    model_path: &PathBuf,
    tokenizer_path: &PathBuf,
    config_path: &PathBuf,
    quantized: bool,
    language: Option<String>,
    task: WhisperTask,
    timestamps: bool,
    _seed: u64,
    device: &Device,
) -> Result<()> {
    // Load config
    let config: WhisperConfig = serde_json::from_str(&std::fs::read_to_string(config_path)?)?;
    
    // Load tokenizer
    let tokenizer = Tokenizer::from_file(tokenizer_path).map_err(E::msg)?;
    
    // Load mel filters
    let mel_bytes = match config.num_mel_bins {
        80 => include_bytes!("melfilters.bytes").as_slice(),
        128 => include_bytes!("melfilters128.bytes").as_slice(),
        nmel => anyhow::bail!("Unexpected num_mel_bins {nmel}"),
    };
    let mut mel_filters = vec![0f32; mel_bytes.len() / 4];
    <byteorder::LittleEndian as byteorder::ByteOrder>::read_f32_into(mel_bytes, &mut mel_filters);

    // Load and process audio
    let (pcm_data, sample_rate) = pcm_decode(input_path)?;
    if sample_rate != m::SAMPLE_RATE as u32 {
        anyhow::bail!("Input file must have a {} sampling rate, got {}", m::SAMPLE_RATE, sample_rate);
    }
    println!("Loaded audio: {} samples at {}Hz", pcm_data.len(), sample_rate);

    // Convert to mel spectrogram
    let mel = audio::pcm_to_mel(&config, &pcm_data, &mel_filters);
    let mel_len = mel.len();
    let mel = Tensor::from_vec(
        mel,
        (1, config.num_mel_bins, mel_len / config.num_mel_bins),
        device,
    )?;
    println!("Mel spectrogram: {:?}", mel.dims());

    // Load model
    println!("Loading Whisper model...");
    let mut model = if quantized {
        let vb = candle_transformers::quantized_var_builder::VarBuilder::from_gguf(
            model_path,
            device,
        )?;
        WhisperModel::Quantized(m::quantized_model::Whisper::load(&vb, config.clone())?)
    } else {
        // SAFETY: The caller provides a local file path. We assume the file is not
        // modified while the model is loaded. This is a standard pattern in candle
        // examples and is safe for single-process, offline inference tooling.
        let vb = unsafe { VarBuilder::from_mmaped_safetensors(&[model_path.clone()], m::DTYPE, device)? };
        WhisperModel::Normal(m::model::Whisper::load(&vb, config.clone())?)
    };

    // Get special tokens
    let sot_token = token_id(&tokenizer, m::SOT_TOKEN)?;
    let transcribe_token = token_id(&tokenizer, m::TRANSCRIBE_TOKEN)?;
    let translate_token = token_id(&tokenizer, m::TRANSLATE_TOKEN)?;
    let eot_token = token_id(&tokenizer, m::EOT_TOKEN)?;
    let no_timestamps_token = token_id(&tokenizer, m::NO_TIMESTAMPS_TOKEN)?;

    // Prepare suppress tokens
    let suppress_tokens: Vec<f32> = (0..model.config().vocab_size as u32)
        .map(|i| {
            if model.config().suppress_tokens.contains(&i) {
                f32::NEG_INFINITY
            } else {
                0f32
            }
        })
        .collect();
    let suppress_tokens = Tensor::new(suppress_tokens.as_slice(), device)?;

    // Get language token if specified
    let language_token = match language {
        Some(lang) => Some(token_id(&tokenizer, &format!("<|{lang}|>"))?),
        None => None,
    };

    // Build initial tokens
    let mut tokens = vec![sot_token];
    if let Some(lang_token) = language_token {
        tokens.push(lang_token);
    }
    match task {
        WhisperTask::Transcribe => tokens.push(transcribe_token),
        WhisperTask::Translate => tokens.push(translate_token),
    }
    if !timestamps {
        tokens.push(no_timestamps_token);
    }

    // Process mel spectrogram in chunks
    let (_, _, content_frames) = mel.dims3()?;
    let mut seek = 0;
    let mut all_text = String::new();

    while seek < content_frames {
        let segment_size = usize::min(content_frames - seek, m::N_FRAMES);
        let mel_segment = mel.narrow(2, seek, segment_size)?;
        
        // Encode audio
        let audio_features = model.encoder_forward(&mel_segment, true)?;
        
        // Decode
        let sample_len = model.config().max_target_positions / 2;
        let mut segment_tokens = tokens.clone();
        
        for i in 0..sample_len {
            let tokens_t = Tensor::new(segment_tokens.as_slice(), device)?.unsqueeze(0)?;
            let ys = model.decoder_forward(&tokens_t, &audio_features, i == 0)?;
            
            let (_, seq_len, _) = ys.dims3()?;
            let logits = model.decoder_final_linear(&ys.i((..1, seq_len - 1..))?)?
                .i(0)?
                .i(0)?;
            
            let logits = logits.broadcast_add(&suppress_tokens)?;
            
            // Sample next token (greedy)
            let logits_v: Vec<f32> = logits.to_vec1()?;
            let next_token = logits_v
                .iter()
                .enumerate()
                .max_by(|(_, u), (_, v)| u.total_cmp(v))
                .map(|(i, _)| i as u32)
                .unwrap();
            
            if next_token == eot_token || segment_tokens.len() > model.config().max_target_positions {
                break;
            }
            segment_tokens.push(next_token);
        }

        // Decode text
        let text = tokenizer.decode(&segment_tokens, true).map_err(E::msg)?;
        
        let time_offset = (seek * m::HOP_LENGTH) as f64 / m::SAMPLE_RATE as f64;
        let segment_duration = (segment_size * m::HOP_LENGTH) as f64 / m::SAMPLE_RATE as f64;
        
        if timestamps {
            println!("[{:.1}s - {:.1}s]: {}", time_offset, time_offset + segment_duration, text.trim());
        }
        all_text.push_str(&text);
        all_text.push(' ');
        
        seek += segment_size;
    }

    if !timestamps {
        println!("{}", all_text.trim());
    }

    Ok(())
}

// ============================================================================
// Text to Voice (MetaVoice)
// ============================================================================

const ENCODEC_NTOKENS: u32 = 1024;

enum MetaVoiceTransformer {
    Normal(transformer::Model),
    Quantized(qtransformer::Model),
}

#[allow(clippy::too_many_arguments)]
fn synthesize_speech(
    prompt: &str,
    first_stage_path: &PathBuf,
    first_stage_meta_path: &PathBuf,
    second_stage_path: &PathBuf,
    encodec_path: &PathBuf,
    spk_emb_path: &PathBuf,
    quantized: bool,
    output_path: &PathBuf,
    guidance_scale: f64,
    temperature: f64,
    max_tokens: u64,
    seed: u64,
    device: &Device,
) -> Result<()> {
    let dtype = DType::F32;

    // Load first stage tokenizer from meta
    let first_stage_meta: serde_json::Value =
        serde_json::from_reader(&std::fs::File::open(first_stage_meta_path)?)?;
    let first_stage_tokenizer = match first_stage_meta.as_object() {
        None => anyhow::bail!("First stage meta is not a JSON object"),
        Some(j) => match j.get("tokenizer") {
            None => anyhow::bail!("No tokenizer key in first stage meta"),
            Some(j) => j,
        },
    };
    let fs_tokenizer = mv_tokenizers::BPE::from_json(first_stage_tokenizer, 512)?;

    // Load first stage model
    let first_stage_config = transformer::Config::cfg1b_v0_1();
    let mut first_stage_model = if quantized {
        let vb = candle_transformers::quantized_var_builder::VarBuilder::from_gguf(
            first_stage_path,
            device,
        )?;
        MetaVoiceTransformer::Quantized(qtransformer::Model::new(&first_stage_config, vb)?)
    } else {
        // SAFETY: The caller provides a local file path. We assume the file is not
        // modified while the model is loaded. This is safe for single-process inference.
        let vb = unsafe { VarBuilder::from_mmaped_safetensors(&[first_stage_path.clone()], dtype, device)? };
        MetaVoiceTransformer::Normal(transformer::Model::new(&first_stage_config, vb)?)
    };

    // Load second stage model
    // SAFETY: Local file path; not modified during inference.
    let second_stage_vb = unsafe { 
        VarBuilder::from_mmaped_safetensors(&[second_stage_path.clone()], dtype, device)? 
    };
    let second_stage_config = gpt::Config::cfg1b_v0_1();
    let second_stage_model = gpt::Model::new(second_stage_config.clone(), second_stage_vb)?;

    // Load encodec model (use CPU for Metal compatibility)
    let encodec_device = if device.is_metal() {
        &Device::Cpu
    } else {
        device
    };
    // SAFETY: Local file path; not modified during inference.
    let encodec_vb = unsafe { 
        VarBuilder::from_mmaped_safetensors(&[encodec_path.clone()], dtype, encodec_device)? 
    };
    let encodec_config = encodec::Config::default();
    let encodec_model = encodec::Model::new(&encodec_config, encodec_vb)?;

    // Load speaker embedding
    let spk_emb = candle_core::safetensors::load(spk_emb_path, &Device::Cpu)?;
    let spk_emb = match spk_emb.get("spk_emb") {
        None => anyhow::bail!("Missing spk_emb tensor in speaker embedding file"),
        Some(spk_emb) => spk_emb.to_dtype(dtype)?,
    };
    let spk_emb = spk_emb.to_device(device)?;

    println!("Synthesizing: '{}'", prompt);

    // Tokenize prompt
    let prompt_tokens = fs_tokenizer.encode(prompt)?;
    let mut tokens = prompt_tokens.clone();
    println!("Tokens: {:?}", tokens);

    // Setup sampling
    let mut logits_processor = LogitsProcessor::new(seed, Some(temperature), Some(0.95));

    // First stage generation
    print!("Generating first stage");
    for index in 0..max_tokens {
        let context_size = if index > 0 { 1 } else { tokens.len() };
        let start_pos = tokens.len().saturating_sub(context_size);
        let ctxt = &tokens[start_pos..];
        let input = Tensor::new(ctxt, device)?;
        let input = Tensor::stack(&[&input, &input], 0)?;
        
        let logits = match &mut first_stage_model {
            MetaVoiceTransformer::Normal(m) => m.forward(&input, &spk_emb, tokens.len() - context_size)?,
            MetaVoiceTransformer::Quantized(m) => m.forward(&input, &spk_emb, tokens.len() - context_size)?,
        };
        
        let logits0 = logits.i((0, 0))?;
        let logits1 = logits.i((1, 0))?;
        let logits = ((logits0 * guidance_scale)? + logits1 * (1. - guidance_scale))?;
        let logits = logits.to_dtype(DType::F32)?;
        let next_token = logits_processor.sample(&logits)?;
        tokens.push(next_token);
        print!(".");
        std::io::stdout().flush()?;
        
        if next_token == 2048 {
            break;
        }
    }
    println!(" done");

    // Decode first stage tokens
    let fie2c = adapters::FlattenedInterleavedEncodec2Codebook::new(ENCODEC_NTOKENS);
    let (text_ids, ids1, ids2) = fie2c.decode(&tokens);
    println!("Text IDs length: {}", text_ids.len());

    // Second stage generation
    let mut rng = rand::rngs::StdRng::seed_from_u64(seed + 1337);
    let encoded_text: Vec<_> = prompt_tokens.iter().map(|v| v - 1024).collect();
    
    let mut hierarchies_in1 = [encoded_text.as_slice(), ids1.as_slice(), &[ENCODEC_NTOKENS]].concat();
    let mut hierarchies_in2 = [
        vec![ENCODEC_NTOKENS; encoded_text.len()].as_slice(),
        ids2.as_slice(),
        &[ENCODEC_NTOKENS],
    ].concat();
    
    hierarchies_in1.resize(second_stage_config.block_size, ENCODEC_NTOKENS);
    hierarchies_in2.resize(second_stage_config.block_size, ENCODEC_NTOKENS);
    
    let in_x1 = Tensor::new(hierarchies_in1, device)?;
    let in_x2 = Tensor::new(hierarchies_in2, device)?;
    let in_x = Tensor::stack(&[in_x1, in_x2], 0)?.unsqueeze(0)?;
    
    println!("Running second stage...");
    let logits = second_stage_model.forward(&in_x)?;
    
    // Sample from second stage
    println!("Sampling from logits...");
    let mut codes = vec![];
    for logits in logits.iter() {
        let logits = logits.squeeze(0)?;
        let (seq_len, _) = logits.dims2()?;
        let mut codes_ = Vec::with_capacity(seq_len);
        for step in 0..seq_len {
            let logits = logits.i(step)?.to_dtype(DType::F32)?;
            let logits = (&logits / 1.0)?;
            let prs = candle_nn::ops::softmax_last_dim(&logits)?.to_vec1::<f32>()?;
            let distr = rand::distr::weighted::WeightedIndex::new(prs.as_slice())?;
            let sample = distr.sample(&mut rng) as u32;
            codes_.push(sample);
        }
        codes.push(codes_);
    }

    // Decode with encodec
    let codes = Tensor::new(codes, device)?.unsqueeze(0)?;
    let codes = Tensor::cat(&[in_x, codes], 1)?;
    
    let tilted_encodec = adapters::TiltedEncodec::new(ENCODEC_NTOKENS);
    let codes = codes.i(0)?.to_vec2::<u32>()?;
    let (_text_ids, audio_ids) = tilted_encodec.decode(&codes);
    
    let audio_ids = Tensor::new(audio_ids, encodec_device)?.unsqueeze(0)?;
    println!("Audio IDs shape: {:?}", audio_ids.shape());
    
    let pcm = encodec_model.decode(&audio_ids)?;
    println!("Output PCM shape: {:?}", pcm.shape());
    
    let pcm = pcm.i(0)?.i(0)?.to_dtype(DType::F32)?;
    let pcm = pcm.to_vec1::<f32>()?;
    let pcm = normalize_loudness(&pcm);

    // Write WAV file
    let mut output = std::fs::File::create(output_path)?;
    write_pcm_as_wav(&mut output, &pcm, 24_000)?;
    println!("Audio saved to {:?}", output_path);

    Ok(())
}

// ============================================================================
// Text Generation (Qwen2 Quantized)
// ============================================================================

fn generate_text(
    model_path: &PathBuf,
    tokenizer_path: &PathBuf,
    prompt: &str,
    max_tokens: usize,
    temperature: f64,
    seed: u64,
    device: &Device,
) -> Result<()> {
    use candle_core::quantized::gguf_file;

    // Load model
    let mut file = std::fs::File::open(model_path)?;
    let model_content = gguf_file::Content::read(&mut file).map_err(|e| e.with_path(model_path))?;
    let mut model = Qwen2::from_gguf(model_content, &mut file, device)?;

    // Load tokenizer
    let tokenizer = Tokenizer::from_file(tokenizer_path).map_err(E::msg)?;
    let mut tos = TokenOutputStream::new(tokenizer);

    // Format prompt
    let formatted = format!("<|im_start|>user\n{}<|im_end|>\n<|im_start|>assistant\n", prompt);
    let tokens = tos.tokenizer().encode(formatted, true).map_err(E::msg)?;
    let tokens = tokens.get_ids().to_vec();

    // Setup sampler
    let mut logits_processor = {
        let sampling = if temperature <= 0. {
            Sampling::ArgMax
        } else {
            Sampling::All { temperature }
        };
        LogitsProcessor::from_sampling(seed, sampling)
    };

    // Initial forward pass
    let input = Tensor::new(tokens.as_slice(), device)?.unsqueeze(0)?;
    let logits = model.forward(&input, 0)?;
    let logits = logits.squeeze(0)?;
    let mut next_token = logits_processor.sample(&logits)?;

    let mut all_tokens = vec![next_token];
    if let Some(t) = tos.next_token(next_token)? {
        print!("{t}");
        std::io::stdout().flush()?;
    }

    let eos_token = *tos.tokenizer().get_vocab(true).get("<|im_end|>").unwrap_or(&0);

    // Generate
    for index in 0..max_tokens.saturating_sub(1) {
        let input = Tensor::new(&[next_token], device)?.unsqueeze(0)?;
        let logits = model.forward(&input, tokens.len() + index)?;
        let logits = logits.squeeze(0)?;

        let start_at = all_tokens.len().saturating_sub(64);
        let logits = candle_transformers::utils::apply_repeat_penalty(
            &logits, 1.1, &all_tokens[start_at..],
        )?;

        next_token = logits_processor.sample(&logits)?;
        all_tokens.push(next_token);

        if let Some(t) = tos.next_token(next_token)? {
            print!("{t}");
            std::io::stdout().flush()?;
        }

        if next_token == eos_token {
            break;
        }
    }

    if let Some(rest) = tos.decode_rest()? {
        print!("{rest}");
    }
    println!();

    Ok(())
}

// ============================================================================
// Image Captioning (BLIP Quantized)
// ============================================================================

fn load_image_for_blip(path: &PathBuf) -> Result<Tensor> {
    let img = image::ImageReader::open(path)?
        .decode()
        .map_err(candle_core::Error::wrap)?
        .resize_to_fill(384, 384, image::imageops::FilterType::Triangle);
    let img = img.to_rgb8();
    let data = img.into_raw();
    let data = Tensor::from_vec(data, (384, 384, 3), &Device::Cpu)?.permute((2, 0, 1))?;

    let mean = Tensor::new(&[0.48145466f32, 0.4578275, 0.40821073], &Device::Cpu)?.reshape((3, 1, 1))?;
    let std = Tensor::new(&[0.26862954f32, 0.26130258, 0.27577711], &Device::Cpu)?.reshape((3, 1, 1))?;

    Ok((data.to_dtype(DType::F32)? / 255.)?.broadcast_sub(&mean)?.broadcast_div(&std)?)
}

fn caption_image(
    model_path: &PathBuf,
    tokenizer_path: &PathBuf,
    image_path: &PathBuf,
    device: &Device,
) -> Result<()> {
    // Load tokenizer
    let tokenizer = Tokenizer::from_file(tokenizer_path).map_err(E::msg)?;
    let mut tos = TokenOutputStream::new(tokenizer);

    // Load config
    let config = blip::Config::image_captioning_large();

    // Load image
    let image = load_image_for_blip(image_path)?.to_device(device)?;

    // Load model
    let vb = quantized_blip::VarBuilder::from_gguf(model_path, device)?;
    let mut model = quantized_blip::BlipForConditionalGeneration::new(&config, vb)?;

    // Get image embeddings
    let image_embeds = image.unsqueeze(0)?.apply(model.vision_model())?;

    let mut logits_processor = LogitsProcessor::new(42, None, None);
    let mut token_ids = vec![30522u32]; // BOS token
    const SEP_TOKEN_ID: u32 = 102;

    // Generate caption
    for index in 0..100 {
        let context_size = if index > 0 { 1 } else { token_ids.len() };
        let start_pos = token_ids.len().saturating_sub(context_size);
        let input_ids = Tensor::new(&token_ids[start_pos..], device)?.unsqueeze(0)?;

        let logits = model.text_decoder().forward(&input_ids, &image_embeds)?;
        let logits = logits.squeeze(0)?;
        let logits = logits.get(logits.dim(0)? - 1)?;

        let token = logits_processor.sample(&logits)?;
        if token == SEP_TOKEN_ID {
            break;
        }

        token_ids.push(token);
        if let Some(t) = tos.next_token(token)? {
            print!("{t}");
            std::io::stdout().flush()?;
        }
    }

    if let Some(rest) = tos.decode_rest()? {
        print!("{rest}");
    }
    println!();

    Ok(())
}

// ============================================================================
// Image Generation (Stable Diffusion 1.5)
// ============================================================================

const VAE_SCALE: f64 = 0.18215;

fn save_image<P: AsRef<std::path::Path>>(img: &Tensor, p: P) -> Result<()> {
    let p = p.as_ref();
    let (channel, height, width) = img.dims3()?;
    if channel != 3 {
        anyhow::bail!("save_image expects an input of shape (3, height, width)")
    }
    let img = img.permute((1, 2, 0))?.flatten_all()?;
    let pixels = img.to_vec1::<u8>()?;
    let image: image::ImageBuffer<image::Rgb<u8>, Vec<u8>> =
        match image::ImageBuffer::from_raw(width as u32, height as u32, pixels) {
            Some(image) => image,
            None => anyhow::bail!("error saving image {p:?}"),
        };
    image.save(p).map_err(|e| anyhow::anyhow!("failed to save image: {e}"))?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn generate_image(
    prompt: &str,
    uncond_prompt: &str,
    unet_path: &PathBuf,
    vae_path: &PathBuf,
    clip_path: &PathBuf,
    tokenizer_path: &PathBuf,
    output_path: &PathBuf,
    height: usize,
    width: usize,
    n_steps: usize,
    guidance_scale: f64,
    _seed: u64,
    device: &Device,
) -> Result<()> {
    let dtype = DType::F32;
    let sd_config = stable_diffusion::StableDiffusionConfig::v1_5(None, Some(height), Some(width));
    let use_guide_scale = guidance_scale > 1.0;

    // Build text embeddings
    println!("Encoding text prompt...");
    let tokenizer = Tokenizer::from_file(tokenizer_path).map_err(E::msg)?;
    let pad_id = match &sd_config.clip.pad_with {
        Some(padding) => *tokenizer.get_vocab(true).get(padding.as_str()).unwrap(),
        None => *tokenizer.get_vocab(true).get("<|endoftext|>").unwrap(),
    };

    let mut tokens = tokenizer
        .encode(prompt, true)
        .map_err(E::msg)?
        .get_ids()
        .to_vec();
    while tokens.len() < sd_config.clip.max_position_embeddings {
        tokens.push(pad_id)
    }
    let tokens = Tensor::new(tokens.as_slice(), device)?.unsqueeze(0)?;

    let text_model =
        stable_diffusion::build_clip_transformer(&sd_config.clip, clip_path.clone(), device, dtype)?;
    let text_embeddings = text_model.forward(&tokens)?;

    let text_embeddings = if use_guide_scale {
        let mut uncond_tokens = tokenizer
            .encode(uncond_prompt, true)
            .map_err(E::msg)?
            .get_ids()
            .to_vec();
        while uncond_tokens.len() < sd_config.clip.max_position_embeddings {
            uncond_tokens.push(pad_id)
        }
        let uncond_tokens = Tensor::new(uncond_tokens.as_slice(), device)?.unsqueeze(0)?;
        let uncond_embeddings = text_model.forward(&uncond_tokens)?;
        Tensor::cat(&[uncond_embeddings, text_embeddings], 0)?
    } else {
        text_embeddings
    };

    // Build UNet
    println!("Loading UNet...");
    let unet = sd_config.build_unet(unet_path, device, 4, false, dtype)?;

    // Build VAE
    println!("Loading VAE...");
    let vae = sd_config.build_vae(vae_path, device, dtype)?;

    // Build scheduler
    let mut scheduler = sd_config.build_scheduler(n_steps)?;
    let timesteps = scheduler.timesteps().to_vec();

    // Initialize latents
    let latent_height = height / 8;
    let latent_width = width / 8;
    let mut latents = Tensor::randn(0f32, 1f32, (1, 4, latent_height, latent_width), device)?;
    latents = (latents * scheduler.init_noise_sigma())?;

    // Diffusion loop
    println!("Running diffusion ({} steps)...", n_steps);
    for (i, &t) in timesteps.iter().enumerate() {
        let start = std::time::Instant::now();

        let latent_model_input = if use_guide_scale {
            Tensor::cat(&[&latents, &latents], 0)?
        } else {
            latents.clone()
        };

        let latent_model_input = scheduler.scale_model_input(latent_model_input, t)?;
        let noise_pred = unet.forward(&latent_model_input, t as f64, &text_embeddings)?;

        let noise_pred = if use_guide_scale {
            let noise_pred = noise_pred.chunk(2, 0)?;
            let (noise_pred_uncond, noise_pred_text) = (&noise_pred[0], &noise_pred[1]);
            (noise_pred_uncond + ((noise_pred_text - noise_pred_uncond)? * guidance_scale)?)?
        } else {
            noise_pred
        };

        latents = scheduler.step(&noise_pred, t, &latents)?;

        let dt = start.elapsed().as_secs_f32();
        println!("  Step {}/{} done, {:.2}s", i + 1, n_steps, dt);
    }

    // Decode latents to image
    println!("Decoding image...");
    let scaled_latents = (latents / VAE_SCALE)?;
    let image = vae.decode(&scaled_latents)?;
    let image = ((image / 2.)? + 0.5)?;
    let image = (image.clamp(0f32, 1f32)? * 255.)?.to_dtype(DType::U8)?.i(0)?;

    save_image(&image, output_path)?;
    println!("Image saved to {:?}", output_path);

    Ok(())
}

// ============================================================================
// Text Embeddings (BERT via candle-transformers, compatible with sentence-transformers models)
// ============================================================================

/// Download model files from HF hub then delegate embedding to local_ai_core.
/// Keeping the download step here avoids adding hf-hub as a dependency of the
/// core library, while eliminating the previously duplicated pooling/normalization
/// logic (now lives exclusively in local_ai_core::embed).
fn embed_texts(
    texts: &[String],
    model: &str,
    revision: &str,
    normalize: bool,
    mean_pool: bool,
    format: EmbedFormat,
    cpu: bool,
    _device: &Device,
) -> Result<()> {
    use hf_hub::{api::sync::Api, Repo, RepoType};

    println!("Loading embedding model '{model}' (rev {revision})...");

    let repo = Repo::with_revision(model.to_string(), RepoType::Model, revision.to_string());
    let api = Api::new()?.repo(repo);

    let config_path = api.get("config.json")?;
    let tokenizer_path = api.get("tokenizer.json")?;
    let weights_path = match api.get("model.safetensors") {
        Ok(p) => p,
        Err(_) => api
            .get("pytorch_model.bin")
            .map_err(|e| anyhow::anyhow!("No model.safetensors or pytorch_model.bin found: {e}"))?,
    };

    let device_type = if cpu {
        local_ai_core::device::DeviceType::Cpu
    } else {
        local_ai_core::device::DeviceType::Auto
    };

    let text_refs: Vec<&str> = texts.iter().map(|s| s.as_str()).collect();
    let result = local_ai_core::embed::embed_texts(
        weights_path
            .to_str()
            .ok_or_else(|| anyhow::anyhow!("non-UTF-8 model path"))?,
        tokenizer_path
            .to_str()
            .ok_or_else(|| anyhow::anyhow!("non-UTF-8 tokenizer path"))?,
        config_path
            .to_str()
            .ok_or_else(|| anyhow::anyhow!("non-UTF-8 config path"))?,
        &text_refs,
        normalize,
        mean_pool,
        device_type,
    )
    .map_err(|e| anyhow::anyhow!("{e}"))?;

    println!(
        "Loaded: dims={}, device={}",
        result.dimensions, result.device_used
    );

    for (i, (text, v)) in texts.iter().zip(result.embeddings.iter()).enumerate() {
        let norm = v.iter().map(|x| x * x).sum::<f32>().sqrt();
        match format {
            EmbedFormat::Vector => {
                println!("[{i}] {:?}", v);
            }
            EmbedFormat::Stats => {
                let preview: Vec<f32> = v.iter().take(8).copied().collect();
                println!(
                    "[{i}] text={:?} dims={} norm={:.4} first8={:?}",
                    truncate_for_log(text, 60),
                    v.len(),
                    norm,
                    preview
                );
            }
        }
    }

    // Sanity-check: different texts should produce different embeddings.
    if result.embeddings.len() >= 2 {
        let a = &result.embeddings[0];
        let b = &result.embeddings[1];
        let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
        let na: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
        let nb: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
        let cos = dot / (na * nb).max(1e-12);
        println!("Cosine similarity (text0 vs text1): {:.4}", cos);
    }

    Ok(())
}

fn truncate_for_log(s: &str, n: usize) -> String {
    if s.chars().count() <= n {
        s.to_string()
    } else {
        let mut t: String = s.chars().take(n).collect();
        t.push_str("...");
        t
    }
}

// ============================================================================
// Main
// ============================================================================

fn main() -> Result<()> {
    let cli = Cli::parse();
    let device = select_device(cli.cpu)?;

    match cli.command {
        Commands::Text {
            model,
            tokenizer,
            prompt,
            max_tokens,
            temperature,
            seed,
        } => {
            generate_text(&model, &tokenizer, &prompt, max_tokens, temperature, seed, &device)?;
        }
        Commands::ImageToText {
            model,
            tokenizer,
            image,
        } => {
            caption_image(&model, &tokenizer, &image, &device)?;
        }
        Commands::TextToImage {
            prompt,
            uncond_prompt,
            unet,
            vae,
            clip,
            tokenizer,
            output,
            height,
            width,
            steps,
            guidance_scale,
            seed,
        } => {
            generate_image(
                &prompt,
                &uncond_prompt,
                &unet,
                &vae,
                &clip,
                &tokenizer,
                &output,
                height,
                width,
                steps,
                guidance_scale,
                seed,
                &device,
            )?;
        }
        Commands::AudioToText {
            input,
            model,
            tokenizer,
            config,
            quantized,
            language,
            task,
            timestamps,
            seed,
        } => {
            transcribe_audio(
                &input,
                &model,
                &tokenizer,
                &config,
                quantized,
                language,
                task,
                timestamps,
                seed,
                &device,
            )?;
        }
        Commands::Embed {
            text,
            model,
            revision,
            no_normalize,
            no_mean_pool,
            format,
        } => {
            embed_texts(
                &text,
                &model,
                &revision,
                !no_normalize,
                !no_mean_pool,
                format,
                cli.cpu,
                &device,
            )?;
        }
        Commands::TextToVoice {
            prompt,
            first_stage,
            first_stage_meta,
            second_stage,
            encodec,
            spk_emb,
            quantized,
            output,
            guidance_scale,
            temperature,
            max_tokens,
            seed,
        } => {
            synthesize_speech(
                &prompt,
                &first_stage,
                &first_stage_meta,
                &second_stage,
                &encodec,
                &spk_emb,
                quantized,
                &output,
                guidance_scale,
                temperature,
                max_tokens,
                seed,
                &device,
            )?;
        }
    }

    Ok(())
}
