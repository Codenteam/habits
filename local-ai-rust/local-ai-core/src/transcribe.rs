//! Audio transcription using Whisper models

use crate::audio::pcm_decode;
use crate::device::DeviceType;
use crate::error::{LocalAiError, Result};
use candle_core::{Device, IndexOp, Tensor};
use candle_nn::VarBuilder;
use candle_transformers::models::whisper::{self as m, audio, Config as WhisperConfig};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokenizers::Tokenizer;

// Embedded mel filters
const MEL_FILTERS_80: &[u8] = include_bytes!("assets/melfilters.bytes");
const MEL_FILTERS_128: &[u8] = include_bytes!("assets/melfilters128.bytes");

/// Whisper task type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum WhisperTask {
    #[default]
    Transcribe,
    Translate,
}

/// Configuration for audio transcription
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscribeConfig {
    /// Path to model weights (.safetensors or .gguf for quantized)
    pub model_path: String,
    /// Path to tokenizer.json
    pub tokenizer_path: String,
    /// Path to config.json
    pub config_path: String,
    /// Use quantized model (expects .gguf format)
    #[serde(default)]
    pub quantized: bool,
    /// Language for transcription (e.g., "en", "es", "fr")
    pub language: Option<String>,
    /// Task: transcribe or translate
    #[serde(default)]
    pub task: WhisperTask,
    /// Show timestamps
    #[serde(default)]
    pub timestamps: bool,
    /// Random seed
    #[serde(default = "default_seed")]
    pub seed: u64,
    /// Device to use
    #[serde(default)]
    pub device: DeviceType,
}

fn default_seed() -> u64 {
    42
}

/// A transcription segment with timing information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionSegment {
    /// Start time in seconds
    pub start: f64,
    /// End time in seconds
    pub end: f64,
    /// Transcribed text
    pub text: String,
}

/// Transcription result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionResult {
    /// Full transcribed text
    pub text: String,
    /// Segments with timing (if timestamps enabled)
    pub segments: Vec<TranscriptionSegment>,
    /// Language detected or specified
    pub language: Option<String>,
}

/// Whisper model wrapper
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

    fn decoder_forward(
        &mut self,
        x: &Tensor,
        xa: &Tensor,
        flush: bool,
    ) -> candle_core::Result<Tensor> {
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
    tokenizer
        .token_to_id(token)
        .ok_or_else(|| LocalAiError::Tokenizer(format!("No token-id for {token}")))
}

/// Audio transcriber using Whisper
pub struct Transcriber {
    model: WhisperModel,
    tokenizer: Tokenizer,
    mel_filters: Vec<f32>,
    config: TranscribeConfig,
    whisper_config: WhisperConfig,
    device: Device,
    // Special tokens
    sot_token: u32,
    transcribe_token: u32,
    translate_token: u32,
    eot_token: u32,
    no_timestamps_token: u32,
    suppress_tokens: Tensor,
}

impl Transcriber {
    /// Create a new transcriber
    pub fn new(config: TranscribeConfig) -> Result<Self> {
        let device = config.device.to_device()?;

        // Load whisper config
        let whisper_config: WhisperConfig =
            serde_json::from_str(&std::fs::read_to_string(&config.config_path)?)?;

        // Load tokenizer
        let tokenizer = Tokenizer::from_file(&config.tokenizer_path)
            .map_err(|e| LocalAiError::Tokenizer(e.to_string()))?;

        // Load mel filters
        let mel_bytes = match whisper_config.num_mel_bins {
            80 => MEL_FILTERS_80,
            128 => MEL_FILTERS_128,
            nmel => {
                return Err(LocalAiError::Config(format!(
                    "Unexpected num_mel_bins {nmel}"
                )))
            }
        };
        let mut mel_filters = vec![0f32; mel_bytes.len() / 4];
        <byteorder::LittleEndian as byteorder::ByteOrder>::read_f32_into(mel_bytes, &mut mel_filters);

        // Load model
        let model = if config.quantized {
            let vb = candle_transformers::quantized_var_builder::VarBuilder::from_gguf(
                &config.model_path,
                &device,
            )?;
            WhisperModel::Quantized(m::quantized_model::Whisper::load(&vb, whisper_config.clone())?)
        } else {
            let vb = unsafe {
                VarBuilder::from_mmaped_safetensors(&[&config.model_path], m::DTYPE, &device)?
            };
            WhisperModel::Normal(m::model::Whisper::load(&vb, whisper_config.clone())?)
        };

        // Get special tokens
        let sot_token = token_id(&tokenizer, m::SOT_TOKEN)?;
        let transcribe_token = token_id(&tokenizer, m::TRANSCRIBE_TOKEN)?;
        let translate_token = token_id(&tokenizer, m::TRANSLATE_TOKEN)?;
        let eot_token = token_id(&tokenizer, m::EOT_TOKEN)?;
        let no_timestamps_token = token_id(&tokenizer, m::NO_TIMESTAMPS_TOKEN)?;

        // Prepare suppress tokens
        let suppress_tokens_vec: Vec<f32> = (0..whisper_config.vocab_size as u32)
            .map(|i| {
                if whisper_config.suppress_tokens.contains(&i) {
                    f32::NEG_INFINITY
                } else {
                    0f32
                }
            })
            .collect();
        let suppress_tokens = Tensor::new(suppress_tokens_vec.as_slice(), &device)?;

        Ok(Self {
            model,
            tokenizer,
            mel_filters,
            config,
            whisper_config,
            device,
            sot_token,
            transcribe_token,
            translate_token,
            eot_token,
            no_timestamps_token,
            suppress_tokens,
        })
    }

    /// Transcribe an audio file
    pub fn transcribe<P: AsRef<Path>>(&mut self, audio_path: P) -> Result<TranscriptionResult> {
        // Load and process audio
        let (pcm_data, sample_rate) = pcm_decode(&audio_path)?;
        if sample_rate != m::SAMPLE_RATE as u32 {
            return Err(LocalAiError::Audio(format!(
                "Input file must have a {} sampling rate, got {}",
                m::SAMPLE_RATE,
                sample_rate
            )));
        }

        // Convert to mel spectrogram
        let mel = audio::pcm_to_mel(&self.whisper_config, &pcm_data, &self.mel_filters);
        let mel_len = mel.len();
        let mel = Tensor::from_vec(
            mel,
            (
                1,
                self.whisper_config.num_mel_bins,
                mel_len / self.whisper_config.num_mel_bins,
            ),
            &self.device,
        )?;

        // Get language token if specified
        let language_token = match &self.config.language {
            Some(lang) => Some(token_id(&self.tokenizer, &format!("<|{lang}|>"))?),
            None => None,
        };

        // Build initial tokens
        let mut tokens = vec![self.sot_token];
        if let Some(lang_token) = language_token {
            tokens.push(lang_token);
        }
        match self.config.task {
            WhisperTask::Transcribe => tokens.push(self.transcribe_token),
            WhisperTask::Translate => tokens.push(self.translate_token),
        }
        if !self.config.timestamps {
            tokens.push(self.no_timestamps_token);
        }

        // Process mel spectrogram in chunks
        let (_, _, content_frames) = mel.dims3()?;
        let mut seek = 0;
        let mut all_text = String::new();
        let mut segments = Vec::new();

        while seek < content_frames {
            let segment_size = usize::min(content_frames - seek, m::N_FRAMES);
            let mel_segment = mel.narrow(2, seek, segment_size)?;

            // Encode audio
            let audio_features = self.model.encoder_forward(&mel_segment, true)?;

            // Decode
            let sample_len = self.model.config().max_target_positions / 2;
            let mut segment_tokens = tokens.clone();

            for i in 0..sample_len {
                let tokens_t =
                    Tensor::new(segment_tokens.as_slice(), &self.device)?.unsqueeze(0)?;
                let ys = self
                    .model
                    .decoder_forward(&tokens_t, &audio_features, i == 0)?;

                let (_, seq_len, _) = ys.dims3()?;
                let logits = self
                    .model
                    .decoder_final_linear(&ys.i((..1, seq_len - 1..))?)?
                    .i(0)?
                    .i(0)?;

                let logits = logits.broadcast_add(&self.suppress_tokens)?;

                // Sample next token (greedy)
                let logits_v: Vec<f32> = logits.to_vec1()?;
                let next_token = logits_v
                    .iter()
                    .enumerate()
                    .max_by(|(_, u), (_, v)| u.total_cmp(v))
                    .map(|(i, _)| i as u32)
                    .unwrap();

                if next_token == self.eot_token
                    || segment_tokens.len() > self.model.config().max_target_positions
                {
                    break;
                }
                segment_tokens.push(next_token);
            }

            // Decode text
            let text = self
                .tokenizer
                .decode(&segment_tokens, true)
                .map_err(|e| LocalAiError::Tokenizer(e.to_string()))?;

            let time_offset = (seek * m::HOP_LENGTH) as f64 / m::SAMPLE_RATE as f64;
            let segment_duration = (segment_size * m::HOP_LENGTH) as f64 / m::SAMPLE_RATE as f64;

            if self.config.timestamps {
                segments.push(TranscriptionSegment {
                    start: time_offset,
                    end: time_offset + segment_duration,
                    text: text.trim().to_string(),
                });
            }

            all_text.push_str(&text);
            all_text.push(' ');

            seek += segment_size;
        }

        Ok(TranscriptionResult {
            text: all_text.trim().to_string(),
            segments,
            language: self.config.language.clone(),
        })
    }
}

/// Simple function to transcribe audio (creates a temporary transcriber)
pub fn transcribe_audio(
    audio_path: &str,
    model_path: &str,
    tokenizer_path: &str,
    config_path: &str,
    quantized: bool,
    language: Option<String>,
    task: WhisperTask,
    timestamps: bool,
    device: DeviceType,
) -> Result<TranscriptionResult> {
    let config = TranscribeConfig {
        model_path: model_path.to_string(),
        tokenizer_path: tokenizer_path.to_string(),
        config_path: config_path.to_string(),
        quantized,
        language,
        task,
        timestamps,
        seed: 42,
        device,
    };

    let mut transcriber = Transcriber::new(config)?;
    transcriber.transcribe(audio_path)
}
