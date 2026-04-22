//! Node.js bindings for Local AI Core using NAPI-RS

#![deny(clippy::all)]

use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::sync::Arc;
use tokio::sync::Mutex;

use local_ai_core::{
    device::DeviceType,
    image_caption::{ImageCaptionConfig, ImageCaptionResult, ImageCaptioner},
    image_gen::{ImageGenConfig, ImageGenResult, ImageGenerator},
    text_gen::{TextGenConfig, TextGenResult, TextGenerator, ModelType},
    text_to_voice::{TextToVoiceConfig, TextToVoiceResult, VoiceSynthesizer},
    transcribe::{TranscribeConfig, TranscriptionResult, Transcriber, WhisperTask},
};

// ============================================================================
// Error handling
// ============================================================================

fn convert_error(e: local_ai_core::error::LocalAiError) -> napi::Error {
    napi::Error::from_reason(e.to_string())
}

// ============================================================================
// Device Type
// ============================================================================

#[napi(string_enum)]
pub enum JsDeviceType {
    Cpu,
    Metal,
    Cuda,
    Auto,
}

impl From<JsDeviceType> for DeviceType {
    fn from(d: JsDeviceType) -> Self {
        match d {
            JsDeviceType::Cpu => DeviceType::Cpu,
            JsDeviceType::Metal => DeviceType::Metal,
            JsDeviceType::Cuda => DeviceType::Cuda,
            JsDeviceType::Auto => DeviceType::Auto,
        }
    }
}

// ============================================================================
// Text Generation
// ============================================================================

#[napi(object)]
#[derive(Clone)]
pub struct JsTextGenConfig {
    /// Path to the GGUF model file
    pub model_path: String,
    /// Path to tokenizer.json
    pub tokenizer_path: String,
    /// Maximum tokens to generate
    pub max_tokens: Option<u32>,
    /// Temperature (0 = greedy)
    pub temperature: Option<f64>,
    /// Random seed
    pub seed: Option<u32>,
    /// Device to use
    pub device: Option<JsDeviceType>,
}

#[napi(object)]
pub struct JsTextGenResult {
    /// Generated text
    pub text: String,
    /// Number of tokens generated
    pub tokens_generated: u32,
}

impl From<TextGenResult> for JsTextGenResult {
    fn from(r: TextGenResult) -> Self {
        JsTextGenResult {
            text: r.text,
            tokens_generated: r.tokens_generated as u32,
        }
    }
}

/// Text generator class for Node.js
#[napi]
pub struct JsTextGenerator {
    inner: Arc<Mutex<TextGenerator>>,
}

#[napi]
impl JsTextGenerator {
    /// Create a new text generator
    #[napi(factory)]
    pub fn new(config: JsTextGenConfig) -> Result<JsTextGenerator> {
        let core_config = TextGenConfig {
            model_path: config.model_path,
            tokenizer_path: config.tokenizer_path,
            max_tokens: config.max_tokens.unwrap_or(200) as usize,
            temperature: config.temperature.unwrap_or(0.7),
            seed: config.seed.unwrap_or(42) as u64,
            device: config.device.map(Into::into).unwrap_or_default(),
            model_type: ModelType::default(),
        };

        let generator = TextGenerator::new(core_config).map_err(convert_error)?;

        Ok(JsTextGenerator {
            inner: Arc::new(Mutex::new(generator)),
        })
    }

    /// Generate text from a prompt
    #[napi]
    pub async fn generate(&self, prompt: String) -> Result<JsTextGenResult> {
        let mut generator = self.inner.lock().await;
        let result = generator.generate(&prompt).map_err(convert_error)?;
        Ok(result.into())
    }
}

/// Generate text (simple function)
#[napi]
pub fn generate_text(
    model_path: String,
    tokenizer_path: String,
    prompt: String,
    max_tokens: Option<u32>,
    temperature: Option<f64>,
    seed: Option<u32>,
    device: Option<JsDeviceType>,
) -> Result<JsTextGenResult> {
    let result = local_ai_core::text_gen::generate_text(
        &model_path,
        &tokenizer_path,
        &prompt,
        max_tokens.unwrap_or(200) as usize,
        temperature.unwrap_or(0.7),
        seed.unwrap_or(42) as u64,
        device.map(Into::into).unwrap_or_default(),
    )
    .map_err(convert_error)?;

    Ok(result.into())
}

// ============================================================================
// Image Captioning
// ============================================================================

#[napi(object)]
#[derive(Clone)]
pub struct JsImageCaptionConfig {
    /// Path to the GGUF model file
    pub model_path: String,
    /// Path to tokenizer.json
    pub tokenizer_path: String,
    /// Random seed
    pub seed: Option<u32>,
    /// Device to use
    pub device: Option<JsDeviceType>,
}

#[napi(object)]
pub struct JsImageCaptionResult {
    /// Generated caption
    pub caption: String,
    /// Number of tokens generated
    pub tokens_generated: u32,
}

impl From<ImageCaptionResult> for JsImageCaptionResult {
    fn from(r: ImageCaptionResult) -> Self {
        JsImageCaptionResult {
            caption: r.caption,
            tokens_generated: r.tokens_generated as u32,
        }
    }
}

/// Image captioner class for Node.js
#[napi]
pub struct JsImageCaptioner {
    inner: Arc<Mutex<ImageCaptioner>>,
}

#[napi]
impl JsImageCaptioner {
    /// Create a new image captioner
    #[napi(factory)]
    pub fn new(config: JsImageCaptionConfig) -> Result<JsImageCaptioner> {
        let core_config = ImageCaptionConfig {
            model_path: config.model_path,
            tokenizer_path: config.tokenizer_path,
            seed: config.seed.unwrap_or(42) as u64,
            device: config.device.map(Into::into).unwrap_or_default(),
        };

        let captioner = ImageCaptioner::new(core_config).map_err(convert_error)?;

        Ok(JsImageCaptioner {
            inner: Arc::new(Mutex::new(captioner)),
        })
    }

    /// Caption an image
    #[napi]
    pub async fn caption(&self, image_path: String) -> Result<JsImageCaptionResult> {
        let mut captioner = self.inner.lock().await;
        let result = captioner.caption(&image_path).map_err(convert_error)?;
        Ok(result.into())
    }
}

/// Caption an image (simple function)
#[napi]
pub fn caption_image(
    model_path: String,
    tokenizer_path: String,
    image_path: String,
    device: Option<JsDeviceType>,
) -> Result<JsImageCaptionResult> {
    let result = local_ai_core::image_caption::caption_image(
        &model_path,
        &tokenizer_path,
        &image_path,
        device.map(Into::into).unwrap_or_default(),
    )
    .map_err(convert_error)?;

    Ok(result.into())
}

// ============================================================================
// Image Generation
// ============================================================================

#[napi(object)]
#[derive(Clone)]
pub struct JsImageGenConfig {
    /// Path to UNet weights (.safetensors)
    pub unet_path: String,
    /// Path to VAE weights (.safetensors)
    pub vae_path: String,
    /// Path to CLIP text encoder weights (.safetensors)
    pub clip_path: String,
    /// Path to tokenizer.json
    pub tokenizer_path: String,
    /// Image height (must be multiple of 8)
    pub height: Option<u32>,
    /// Image width (must be multiple of 8)
    pub width: Option<u32>,
    /// Number of diffusion steps
    pub steps: Option<u32>,
    /// Guidance scale
    pub guidance_scale: Option<f64>,
    /// Random seed
    pub seed: Option<u32>,
    /// Device to use
    pub device: Option<JsDeviceType>,
}

#[napi(object)]
pub struct JsImageGenResult {
    /// Path where image was saved
    pub output_path: Option<String>,
    /// Base64-encoded PNG (if generated to base64)
    pub base64: Option<String>,
    /// Image width
    pub width: u32,
    /// Image height
    pub height: u32,
    /// Number of steps performed
    pub steps: u32,
}

impl From<ImageGenResult> for JsImageGenResult {
    fn from(r: ImageGenResult) -> Self {
        JsImageGenResult {
            output_path: r.output_path,
            base64: None,
            width: r.width as u32,
            height: r.height as u32,
            steps: r.steps as u32,
        }
    }
}

/// Image generator class for Node.js
#[napi]
pub struct JsImageGenerator {
    inner: Arc<ImageGenerator>,
}

#[napi]
impl JsImageGenerator {
    /// Create a new image generator
    #[napi(factory)]
    pub fn new(config: JsImageGenConfig) -> Result<JsImageGenerator> {
        let core_config = ImageGenConfig {
            unet_path: config.unet_path,
            vae_path: config.vae_path,
            clip_path: config.clip_path,
            tokenizer_path: config.tokenizer_path,
            height: config.height.unwrap_or(512) as usize,
            width: config.width.unwrap_or(512) as usize,
            steps: config.steps.unwrap_or(30) as usize,
            guidance_scale: config.guidance_scale.unwrap_or(7.5),
            seed: config.seed.unwrap_or(42) as u64,
            device: config.device.map(Into::into).unwrap_or_default(),
        };

        let generator = ImageGenerator::new(core_config).map_err(convert_error)?;

        Ok(JsImageGenerator {
            inner: Arc::new(generator),
        })
    }

    /// Generate an image from a prompt
    #[napi]
    pub async fn generate(
        &self,
        prompt: String,
        uncond_prompt: Option<String>,
        output_path: String,
    ) -> Result<JsImageGenResult> {
        let result = self
            .inner
            .generate(&prompt, &uncond_prompt.unwrap_or_default(), &output_path)
            .map_err(convert_error)?;
        Ok(result.into())
    }
}

/// Generate an image (simple function)
#[napi]
pub fn generate_image(
    prompt: String,
    uncond_prompt: Option<String>,
    unet_path: String,
    vae_path: String,
    clip_path: String,
    tokenizer_path: String,
    output_path: String,
    height: Option<u32>,
    width: Option<u32>,
    steps: Option<u32>,
    guidance_scale: Option<f64>,
    seed: Option<u32>,
    device: Option<JsDeviceType>,
) -> Result<JsImageGenResult> {
    let result = local_ai_core::image_gen::generate_image(
        &prompt,
        &uncond_prompt.unwrap_or_default(),
        &unet_path,
        &vae_path,
        &clip_path,
        &tokenizer_path,
        &output_path,
        height.unwrap_or(512) as usize,
        width.unwrap_or(512) as usize,
        steps.unwrap_or(30) as usize,
        guidance_scale.unwrap_or(7.5),
        seed.unwrap_or(42) as u64,
        device.map(Into::into).unwrap_or_default(),
    )
    .map_err(convert_error)?;

    Ok(result.into())
}

/// Generate an image and return as base64 PNG (uses temp file internally)
#[napi]
pub fn generate_image_base64(
    prompt: String,
    uncond_prompt: Option<String>,
    unet_path: String,
    vae_path: String,
    clip_path: String,
    tokenizer_path: String,
    height: Option<u32>,
    width: Option<u32>,
    steps: Option<u32>,
    guidance_scale: Option<f64>,
    seed: Option<u32>,
    device: Option<JsDeviceType>,
) -> Result<JsImageGenResult> {
    use base64::{engine::general_purpose::STANDARD, Engine};
    use std::fs;
    
    // Create temp file path
    let temp_path = std::env::temp_dir().join(format!("local_ai_gen_{}.png", std::process::id()));
    let temp_path_str = temp_path.to_string_lossy().to_string();
    
    // Generate to temp file
    let result = local_ai_core::image_gen::generate_image(
        &prompt,
        &uncond_prompt.unwrap_or_default(),
        &unet_path,
        &vae_path,
        &clip_path,
        &tokenizer_path,
        &temp_path_str,
        height.unwrap_or(512) as usize,
        width.unwrap_or(512) as usize,
        steps.unwrap_or(30) as usize,
        guidance_scale.unwrap_or(7.5),
        seed.unwrap_or(42) as u64,
        device.map(Into::into).unwrap_or_default(),
    )
    .map_err(convert_error)?;
    
    // Read file and convert to base64
    let bytes = fs::read(&temp_path).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let base64_str = STANDARD.encode(&bytes);
    
    // Delete temp file
    let _ = fs::remove_file(&temp_path);
    
    Ok(JsImageGenResult {
        output_path: None,
        base64: Some(base64_str),
        width: result.width as u32,
        height: result.height as u32,
        steps: result.steps as u32,
    })
}

// ============================================================================
// Audio Transcription (Whisper)
// ============================================================================

#[napi(string_enum)]
pub enum JsWhisperTask {
    Transcribe,
    Translate,
}

impl From<JsWhisperTask> for WhisperTask {
    fn from(t: JsWhisperTask) -> Self {
        match t {
            JsWhisperTask::Transcribe => WhisperTask::Transcribe,
            JsWhisperTask::Translate => WhisperTask::Translate,
        }
    }
}

#[napi(object)]
#[derive(Clone)]
pub struct JsTranscribeConfig {
    /// Path to model weights (.safetensors or .gguf)
    pub model_path: String,
    /// Path to tokenizer.json
    pub tokenizer_path: String,
    /// Path to config.json
    pub config_path: String,
    /// Use quantized model
    pub quantized: Option<bool>,
    /// Language for transcription
    pub language: Option<String>,
    /// Task: transcribe or translate
    pub task: Option<JsWhisperTask>,
    /// Show timestamps
    pub timestamps: Option<bool>,
    /// Random seed
    pub seed: Option<u32>,
    /// Device to use
    pub device: Option<JsDeviceType>,
}

#[napi(object)]
pub struct JsTranscriptionSegment {
    /// Start time in seconds
    pub start: f64,
    /// End time in seconds
    pub end: f64,
    /// Transcribed text
    pub text: String,
}

#[napi(object)]
pub struct JsTranscriptionResult {
    /// Full transcribed text
    pub text: String,
    /// Segments with timing
    pub segments: Vec<JsTranscriptionSegment>,
    /// Language detected or specified
    pub language: Option<String>,
}

impl From<TranscriptionResult> for JsTranscriptionResult {
    fn from(r: TranscriptionResult) -> Self {
        JsTranscriptionResult {
            text: r.text,
            segments: r
                .segments
                .into_iter()
                .map(|s| JsTranscriptionSegment {
                    start: s.start,
                    end: s.end,
                    text: s.text,
                })
                .collect(),
            language: r.language,
        }
    }
}

/// Audio transcriber class for Node.js
#[napi]
pub struct JsTranscriber {
    inner: Arc<Mutex<Transcriber>>,
}

#[napi]
impl JsTranscriber {
    /// Create a new transcriber
    #[napi(factory)]
    pub fn new(config: JsTranscribeConfig) -> Result<JsTranscriber> {
        let core_config = TranscribeConfig {
            model_path: config.model_path,
            tokenizer_path: config.tokenizer_path,
            config_path: config.config_path,
            quantized: config.quantized.unwrap_or(false),
            language: config.language,
            task: config.task.map(Into::into).unwrap_or_default(),
            timestamps: config.timestamps.unwrap_or(false),
            seed: config.seed.unwrap_or(42) as u64,
            device: config.device.map(Into::into).unwrap_or_default(),
        };

        let transcriber = Transcriber::new(core_config).map_err(convert_error)?;

        Ok(JsTranscriber {
            inner: Arc::new(Mutex::new(transcriber)),
        })
    }

    /// Transcribe an audio file
    #[napi]
    pub async fn transcribe(&self, audio_path: String) -> Result<JsTranscriptionResult> {
        let mut transcriber = self.inner.lock().await;
        let result = transcriber.transcribe(&audio_path).map_err(convert_error)?;
        Ok(result.into())
    }
}

/// Transcribe audio (simple function)
#[napi]
pub fn transcribe_audio(
    audio_path: String,
    model_path: String,
    tokenizer_path: String,
    config_path: String,
    quantized: Option<bool>,
    language: Option<String>,
    task: Option<JsWhisperTask>,
    timestamps: Option<bool>,
    device: Option<JsDeviceType>,
) -> Result<JsTranscriptionResult> {
    let result = local_ai_core::transcribe::transcribe_audio(
        &audio_path,
        &model_path,
        &tokenizer_path,
        &config_path,
        quantized.unwrap_or(false),
        language,
        task.map(Into::into).unwrap_or_default(),
        timestamps.unwrap_or(false),
        device.map(Into::into).unwrap_or_default(),
    )
    .map_err(convert_error)?;

    Ok(result.into())
}

// ============================================================================
// Text to Voice (MetaVoice)
// ============================================================================

#[napi(object)]
#[derive(Clone)]
pub struct JsTextToVoiceConfig {
    /// Path to first stage model weights
    pub first_stage_path: String,
    /// Path to first stage meta JSON
    pub first_stage_meta_path: String,
    /// Path to second stage model weights
    pub second_stage_path: String,
    /// Path to Encodec model weights
    pub encodec_path: String,
    /// Path to speaker embedding file
    pub spk_emb_path: String,
    /// Use quantized first stage model
    pub quantized: Option<bool>,
    /// Guidance scale
    pub guidance_scale: Option<f64>,
    /// Temperature for sampling
    pub temperature: Option<f64>,
    /// Maximum tokens for first stage
    pub max_tokens: Option<u32>,
    /// Random seed
    pub seed: Option<u32>,
    /// Device to use
    pub device: Option<JsDeviceType>,
}

#[napi(object)]
pub struct JsTextToVoiceResult {
    /// Path where audio was saved
    pub output_path: Option<String>,
    /// Base64-encoded WAV (if generated to base64)
    pub base64: Option<String>,
    /// Sample rate of output audio
    pub sample_rate: u32,
    /// Duration in seconds
    pub duration_seconds: f64,
}

impl From<TextToVoiceResult> for JsTextToVoiceResult {
    fn from(r: TextToVoiceResult) -> Self {
        JsTextToVoiceResult {
            output_path: r.output_path,
            base64: None,
            sample_rate: r.sample_rate,
            duration_seconds: r.duration_seconds,
        }
    }
}

/// Voice synthesizer class for Node.js
#[napi]
pub struct JsVoiceSynthesizer {
    inner: Arc<Mutex<VoiceSynthesizer>>,
}

#[napi]
impl JsVoiceSynthesizer {
    /// Create a new voice synthesizer
    #[napi(factory)]
    pub fn new(config: JsTextToVoiceConfig) -> Result<JsVoiceSynthesizer> {
        let core_config = TextToVoiceConfig {
            first_stage_path: config.first_stage_path,
            first_stage_meta_path: config.first_stage_meta_path,
            second_stage_path: config.second_stage_path,
            encodec_path: config.encodec_path,
            spk_emb_path: config.spk_emb_path,
            quantized: config.quantized.unwrap_or(false),
            guidance_scale: config.guidance_scale.unwrap_or(3.0),
            temperature: config.temperature.unwrap_or(1.0),
            max_tokens: config.max_tokens.unwrap_or(2000) as u64,
            seed: config.seed.unwrap_or(42) as u64,
            device: config.device.map(Into::into).unwrap_or_default(),
        };

        let synthesizer = VoiceSynthesizer::new(core_config).map_err(convert_error)?;

        Ok(JsVoiceSynthesizer {
            inner: Arc::new(Mutex::new(synthesizer)),
        })
    }

    /// Synthesize speech from text
    #[napi]
    pub async fn synthesize(
        &self,
        prompt: String,
        output_path: String,
    ) -> Result<JsTextToVoiceResult> {
        let mut synthesizer = self.inner.lock().await;
        let result = synthesizer
            .synthesize(&prompt, &output_path)
            .map_err(convert_error)?;
        Ok(result.into())
    }
}

/// Synthesize speech (simple function)
#[napi]
pub fn synthesize_speech(
    prompt: String,
    first_stage_path: String,
    first_stage_meta_path: String,
    second_stage_path: String,
    encodec_path: String,
    spk_emb_path: String,
    quantized: Option<bool>,
    output_path: String,
    guidance_scale: Option<f64>,
    temperature: Option<f64>,
    max_tokens: Option<u32>,
    seed: Option<u32>,
    device: Option<JsDeviceType>,
) -> Result<JsTextToVoiceResult> {
    let result = local_ai_core::text_to_voice::synthesize_speech(
        &prompt,
        &first_stage_path,
        &first_stage_meta_path,
        &second_stage_path,
        &encodec_path,
        &spk_emb_path,
        quantized.unwrap_or(false),
        &output_path,
        guidance_scale.unwrap_or(3.0),
        temperature.unwrap_or(1.0),
        max_tokens.unwrap_or(2000) as u64,
        seed.unwrap_or(42) as u64,
        device.map(Into::into).unwrap_or_default(),
    )
    .map_err(convert_error)?;

    Ok(result.into())
}

/// Synthesize speech and return as base64 WAV (uses temp file internally)
#[napi]
pub fn synthesize_speech_base64(
    prompt: String,
    first_stage_path: String,
    first_stage_meta_path: String,
    second_stage_path: String,
    encodec_path: String,
    spk_emb_path: String,
    quantized: Option<bool>,
    guidance_scale: Option<f64>,
    temperature: Option<f64>,
    max_tokens: Option<u32>,
    seed: Option<u32>,
    device: Option<JsDeviceType>,
) -> Result<JsTextToVoiceResult> {
    use base64::{engine::general_purpose::STANDARD, Engine};
    use std::fs;
    
    // Create temp file path
    let temp_path = std::env::temp_dir().join(format!("local_ai_tts_{}.wav", std::process::id()));
    let temp_path_str = temp_path.to_string_lossy().to_string();
    
    // Generate to temp file
    let result = local_ai_core::text_to_voice::synthesize_speech(
        &prompt,
        &first_stage_path,
        &first_stage_meta_path,
        &second_stage_path,
        &encodec_path,
        &spk_emb_path,
        quantized.unwrap_or(false),
        &temp_path_str,
        guidance_scale.unwrap_or(3.0),
        temperature.unwrap_or(1.0),
        max_tokens.unwrap_or(2000) as u64,
        seed.unwrap_or(42) as u64,
        device.map(Into::into).unwrap_or_default(),
    )
    .map_err(convert_error)?;
    
    // Read file and convert to base64
    let bytes = fs::read(&temp_path).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let base64_str = STANDARD.encode(&bytes);
    
    // Delete temp file
    let _ = fs::remove_file(&temp_path);
    
    Ok(JsTextToVoiceResult {
        output_path: None,
        base64: Some(base64_str),
        sample_rate: result.sample_rate,
        duration_seconds: result.duration_seconds,
    })
}

/// Caption an image from base64 data (uses temp file internally)
#[napi]
pub fn caption_image_base64(
    image_base64: String,
    model_path: String,
    tokenizer_path: String,
    device: Option<JsDeviceType>,
) -> Result<JsImageCaptionResult> {
    use base64::{engine::general_purpose::STANDARD, Engine};
    use std::fs;
    
    // Decode base64 to bytes
    let bytes = STANDARD.decode(&image_base64)
        .map_err(|e| napi::Error::from_reason(format!("Invalid base64: {}", e)))?;
    
    // Write to temp file
    let temp_path = std::env::temp_dir().join(format!("local_ai_caption_{}.png", std::process::id()));
    fs::write(&temp_path, &bytes).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let temp_path_str = temp_path.to_string_lossy().to_string();
    
    // Caption the image
    let result = local_ai_core::image_caption::caption_image(
        &model_path,
        &tokenizer_path,
        &temp_path_str,
        device.map(Into::into).unwrap_or_default(),
    )
    .map_err(convert_error)?;
    
    // Delete temp file
    let _ = fs::remove_file(&temp_path);
    
    Ok(result.into())
}

/// Transcribe audio from base64 data (uses temp file internally)
#[napi]
pub fn transcribe_audio_base64(
    audio_base64: String,
    model_path: String,
    tokenizer_path: String,
    config_path: String,
    quantized: Option<bool>,
    language: Option<String>,
    task: Option<JsWhisperTask>,
    timestamps: Option<bool>,
    device: Option<JsDeviceType>,
) -> Result<JsTranscriptionResult> {
    use base64::{engine::general_purpose::STANDARD, Engine};
    use std::fs;
    
    // Decode base64 to bytes
    let bytes = STANDARD.decode(&audio_base64)
        .map_err(|e| napi::Error::from_reason(format!("Invalid base64: {}", e)))?;
    
    // Write to temp file
    let temp_path = std::env::temp_dir().join(format!("local_ai_transcribe_{}.wav", std::process::id()));
    fs::write(&temp_path, &bytes).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let temp_path_str = temp_path.to_string_lossy().to_string();
    
    // Transcribe the audio
    let result = local_ai_core::transcribe::transcribe_audio(
        &temp_path_str,
        &model_path,
        &tokenizer_path,
        &config_path,
        quantized.unwrap_or(false),
        language,
        task.map(Into::into).unwrap_or_default(),
        timestamps.unwrap_or(false),
        device.map(Into::into).unwrap_or_default(),
    )
    .map_err(convert_error)?;
    
    // Delete temp file
    let _ = fs::remove_file(&temp_path);
    
    Ok(result.into())
}

// ============================================================================
// Module Info
// ============================================================================

/// Get the version of the local-ai-node module
#[napi]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Check if Metal (macOS GPU) support is available
#[napi]
pub fn has_metal_support() -> bool {
    cfg!(feature = "metal")
}

/// Check if CUDA (NVIDIA GPU) support is available
#[napi]
pub fn has_cuda_support() -> bool {
    cfg!(feature = "cuda")
}
