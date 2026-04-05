//! Text to voice synthesis using MetaVoice

use crate::audio::{normalize_loudness, write_pcm_as_wav};
use crate::device::DeviceType;
use crate::error::{LocalAiError, Result};
use candle_core::{DType, Device, IndexOp, Tensor};
use candle_nn::VarBuilder;
use candle_transformers::generation::LogitsProcessor;
use candle_transformers::models::encodec;
use candle_transformers::models::metavoice::{adapters, gpt, tokenizers as mv_tokenizers, transformer};
use candle_transformers::models::quantized_metavoice::transformer as qtransformer;
use rand::distr::Distribution;
use rand::SeedableRng;
use serde::{Deserialize, Serialize};
use std::path::Path;

const ENCODEC_NTOKENS: u32 = 1024;

/// Configuration for text-to-voice synthesis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextToVoiceConfig {
    /// Path to first stage model weights (.safetensors or .gguf for quantized)
    pub first_stage_path: String,
    /// Path to first stage meta JSON
    pub first_stage_meta_path: String,
    /// Path to second stage model weights (.safetensors)
    pub second_stage_path: String,
    /// Path to Encodec model weights (.safetensors)
    pub encodec_path: String,
    /// Path to speaker embedding file (.safetensors)
    pub spk_emb_path: String,
    /// Use quantized first stage model
    #[serde(default)]
    pub quantized: bool,
    /// Guidance scale
    #[serde(default = "default_guidance")]
    pub guidance_scale: f64,
    /// Temperature for sampling
    #[serde(default = "default_temperature")]
    pub temperature: f64,
    /// Maximum tokens for first stage
    #[serde(default = "default_max_tokens")]
    pub max_tokens: u64,
    /// Random seed
    #[serde(default = "default_seed")]
    pub seed: u64,
    /// Device to use
    #[serde(default)]
    pub device: DeviceType,
}

fn default_guidance() -> f64 {
    3.0
}
fn default_temperature() -> f64 {
    1.0
}
fn default_max_tokens() -> u64 {
    2000
}
fn default_seed() -> u64 {
    42
}

/// Text-to-voice result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextToVoiceResult {
    /// Path where audio was saved (if saved)
    pub output_path: Option<String>,
    /// Sample rate of output audio
    pub sample_rate: u32,
    /// Duration in seconds
    pub duration_seconds: f64,
}

/// MetaVoice transformer wrapper
enum MetaVoiceTransformer {
    Normal(transformer::Model),
    Quantized(qtransformer::Model),
}

/// Progress callback for voice synthesis
pub type ProgressCallback = Box<dyn FnMut(&str, usize, u64) + Send>;

/// Text-to-voice synthesizer using MetaVoice
pub struct VoiceSynthesizer {
    config: TextToVoiceConfig,
    device: Device,
    first_stage_model: MetaVoiceTransformer,
    second_stage_model: gpt::Model,
    encodec_model: encodec::Model,
    encodec_device: Device,
    fs_tokenizer: mv_tokenizers::BPE,
    spk_emb: Tensor,
    second_stage_config: gpt::Config,
}

impl VoiceSynthesizer {
    /// Create a new voice synthesizer
    pub fn new(config: TextToVoiceConfig) -> Result<Self> {
        let device = config.device.to_device()?;
        let dtype = DType::F32;

        // Load first stage tokenizer from meta
        let first_stage_meta: serde_json::Value =
            serde_json::from_reader(&std::fs::File::open(&config.first_stage_meta_path)?)?;
        let first_stage_tokenizer = match first_stage_meta.as_object() {
            None => return Err(LocalAiError::Config("First stage meta is not a JSON object".to_string())),
            Some(j) => match j.get("tokenizer") {
                None => return Err(LocalAiError::Config("No tokenizer key in first stage meta".to_string())),
                Some(j) => j,
            },
        };
        let fs_tokenizer = mv_tokenizers::BPE::from_json(first_stage_tokenizer, 512)
            .map_err(|e| LocalAiError::Tokenizer(e.to_string()))?;

        // Load first stage model
        let first_stage_config = transformer::Config::cfg1b_v0_1();
        let first_stage_model = if config.quantized {
            let vb = candle_transformers::quantized_var_builder::VarBuilder::from_gguf(
                &config.first_stage_path,
                &device,
            )?;
            MetaVoiceTransformer::Quantized(qtransformer::Model::new(&first_stage_config, vb)?)
        } else {
            let vb = unsafe {
                VarBuilder::from_mmaped_safetensors(&[&config.first_stage_path], dtype, &device)?
            };
            MetaVoiceTransformer::Normal(transformer::Model::new(&first_stage_config, vb)?)
        };

        // Load second stage model
        let second_stage_vb = unsafe {
            VarBuilder::from_mmaped_safetensors(&[&config.second_stage_path], dtype, &device)?
        };
        let second_stage_config = gpt::Config::cfg1b_v0_1();
        let second_stage_model = gpt::Model::new(second_stage_config.clone(), second_stage_vb)?;

        // Load encodec model (use CPU for Metal compatibility)
        let encodec_device = if device.is_metal() {
            Device::Cpu
        } else {
            device.clone()
        };
        let encodec_vb = unsafe {
            VarBuilder::from_mmaped_safetensors(&[&config.encodec_path], dtype, &encodec_device)?
        };
        let encodec_config = encodec::Config::default();
        let encodec_model = encodec::Model::new(&encodec_config, encodec_vb)?;

        // Load speaker embedding
        let spk_emb = candle_core::safetensors::load(&config.spk_emb_path, &Device::Cpu)?;
        let spk_emb = match spk_emb.get("spk_emb") {
            None => {
                return Err(LocalAiError::Model(
                    "Missing spk_emb tensor in speaker embedding file".to_string(),
                ))
            }
            Some(spk_emb) => spk_emb.to_dtype(dtype)?,
        };
        let spk_emb = spk_emb.to_device(&device)?;

        Ok(Self {
            config,
            device,
            first_stage_model,
            second_stage_model,
            encodec_model,
            encodec_device,
            fs_tokenizer,
            spk_emb,
            second_stage_config,
        })
    }

    /// Synthesize speech from text
    pub fn synthesize<P: AsRef<Path>>(&mut self, prompt: &str, output_path: P) -> Result<TextToVoiceResult> {
        self.synthesize_with_progress(prompt, output_path, None)
    }

    /// Synthesize speech with progress callback
    pub fn synthesize_with_progress<P: AsRef<Path>>(
        &mut self,
        prompt: &str,
        output_path: P,
        mut progress_callback: Option<ProgressCallback>,
    ) -> Result<TextToVoiceResult> {
        // Tokenize prompt
        let prompt_tokens = self
            .fs_tokenizer
            .encode(prompt)
            .map_err(|e| LocalAiError::Tokenizer(e.to_string()))?;
        let mut tokens = prompt_tokens.clone();

        // Setup sampling
        let mut logits_processor =
            LogitsProcessor::new(self.config.seed, Some(self.config.temperature), Some(0.95));

        // First stage generation
        if let Some(ref mut callback) = progress_callback {
            callback("first_stage", 0, self.config.max_tokens);
        }

        for index in 0..self.config.max_tokens {
            let context_size = if index > 0 { 1 } else { tokens.len() };
            let start_pos = tokens.len().saturating_sub(context_size);
            let ctxt = &tokens[start_pos..];
            let input = Tensor::new(ctxt, &self.device)?;
            let input = Tensor::stack(&[&input, &input], 0)?;

            let logits = match &mut self.first_stage_model {
                MetaVoiceTransformer::Normal(m) => {
                    m.forward(&input, &self.spk_emb, tokens.len() - context_size)?
                }
                MetaVoiceTransformer::Quantized(m) => {
                    m.forward(&input, &self.spk_emb, tokens.len() - context_size)?
                }
            };

            let logits0 = logits.i((0, 0))?;
            let logits1 = logits.i((1, 0))?;
            let logits =
                ((logits0 * self.config.guidance_scale)? + logits1 * (1. - self.config.guidance_scale))?;
            let logits = logits.to_dtype(DType::F32)?;
            let next_token = logits_processor.sample(&logits)?;
            tokens.push(next_token);

            if let Some(ref mut callback) = progress_callback {
                callback("first_stage", (index + 1) as usize, self.config.max_tokens);
            }

            if next_token == 2048 {
                break;
            }
        }

        // Decode first stage tokens
        let fie2c = adapters::FlattenedInterleavedEncodec2Codebook::new(ENCODEC_NTOKENS);
        let (_text_ids, ids1, ids2) = fie2c.decode(&tokens);

        if let Some(ref mut callback) = progress_callback {
            callback("second_stage", 0, 1);
        }

        // Second stage generation
        let mut rng = rand::rngs::StdRng::seed_from_u64(self.config.seed + 1337);
        let encoded_text: Vec<_> = prompt_tokens.iter().map(|v| v - 1024).collect();

        let mut hierarchies_in1 =
            [encoded_text.as_slice(), ids1.as_slice(), &[ENCODEC_NTOKENS]].concat();
        let mut hierarchies_in2 = [
            vec![ENCODEC_NTOKENS; encoded_text.len()].as_slice(),
            ids2.as_slice(),
            &[ENCODEC_NTOKENS],
        ]
        .concat();

        hierarchies_in1.resize(self.second_stage_config.block_size, ENCODEC_NTOKENS);
        hierarchies_in2.resize(self.second_stage_config.block_size, ENCODEC_NTOKENS);

        let in_x1 = Tensor::new(hierarchies_in1, &self.device)?;
        let in_x2 = Tensor::new(hierarchies_in2, &self.device)?;
        let in_x = Tensor::stack(&[in_x1, in_x2], 0)?.unsqueeze(0)?;

        let logits = self.second_stage_model.forward(&in_x)?;

        // Sample from second stage
        let mut codes = vec![];
        for logits in logits.iter() {
            let logits = logits.squeeze(0)?;
            let (seq_len, _) = logits.dims2()?;
            let mut codes_ = Vec::with_capacity(seq_len);
            for step in 0..seq_len {
                let logits = logits.i(step)?.to_dtype(DType::F32)?;
                let logits = (&logits / 1.0)?;
                let prs = candle_nn::ops::softmax_last_dim(&logits)?.to_vec1::<f32>()?;
                let distr = rand::distr::weighted::WeightedIndex::new(prs.as_slice())
                    .map_err(|e| LocalAiError::Other(e.to_string()))?;
                let sample = distr.sample(&mut rng) as u32;
                codes_.push(sample);
            }
            codes.push(codes_);
        }

        if let Some(ref mut callback) = progress_callback {
            callback("decoding", 0, 1);
        }

        // Decode with encodec
        let codes = Tensor::new(codes, &self.device)?.unsqueeze(0)?;
        let codes = Tensor::cat(&[in_x, codes], 1)?;

        let tilted_encodec = adapters::TiltedEncodec::new(ENCODEC_NTOKENS);
        let codes = codes.i(0)?.to_vec2::<u32>()?;
        let (_text_ids, audio_ids) = tilted_encodec.decode(&codes);

        let audio_ids = Tensor::new(audio_ids, &self.encodec_device)?.unsqueeze(0)?;
        let pcm = self.encodec_model.decode(&audio_ids)?;
        let pcm = pcm.i(0)?.i(0)?.to_dtype(DType::F32)?;
        let pcm = pcm.to_vec1::<f32>()?;
        let pcm = normalize_loudness(&pcm);

        // Write WAV file
        let output_path = output_path.as_ref();
        let mut output = std::fs::File::create(output_path)?;
        write_pcm_as_wav(&mut output, &pcm, 24_000)?;

        let duration_seconds = pcm.len() as f64 / 24_000.0;

        Ok(TextToVoiceResult {
            output_path: Some(output_path.to_string_lossy().to_string()),
            sample_rate: 24_000,
            duration_seconds,
        })
    }
}

/// Simple function to synthesize speech (creates a temporary synthesizer)
#[allow(clippy::too_many_arguments)]
pub fn synthesize_speech(
    prompt: &str,
    first_stage_path: &str,
    first_stage_meta_path: &str,
    second_stage_path: &str,
    encodec_path: &str,
    spk_emb_path: &str,
    quantized: bool,
    output_path: &str,
    guidance_scale: f64,
    temperature: f64,
    max_tokens: u64,
    seed: u64,
    device: DeviceType,
) -> Result<TextToVoiceResult> {
    let config = TextToVoiceConfig {
        first_stage_path: first_stage_path.to_string(),
        first_stage_meta_path: first_stage_meta_path.to_string(),
        second_stage_path: second_stage_path.to_string(),
        encodec_path: encodec_path.to_string(),
        spk_emb_path: spk_emb_path.to_string(),
        quantized,
        guidance_scale,
        temperature,
        max_tokens,
        seed,
        device,
    };

    let mut synthesizer = VoiceSynthesizer::new(config)?;
    synthesizer.synthesize(prompt, output_path)
}
