//! Tauri commands for Local AI plugin

use crate::error::{Error, Result};
use crate::state::{InstanceId, LocalAiState};
use local_ai_core::{
    device::DeviceType,
    image_caption::{ImageCaptionConfig, ImageCaptionResult, ImageCaptioner},
    image_gen::{ImageGenConfig, ImageGenResult, ImageGenerator},
    text_gen::{TextGenConfig, TextGenResult, TextGenerator},
    text_to_voice::{TextToVoiceConfig, TextToVoiceResult, VoiceSynthesizer},
    transcribe::{TranscribeConfig, TranscriptionResult, Transcriber, WhisperTask},
};
use serde::{Deserialize, Serialize};
use tauri::{command, State};

// ============================================================================
// Shared Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub enum JsDeviceType {
    #[default]
    Auto,
    Cpu,
    Metal,
    Cuda,
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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub enum JsWhisperTask {
    #[default]
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

// ============================================================================
// Text Generation
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsTextGenConfig {
    pub model_path: String,
    pub tokenizer_path: String,
    #[serde(default = "default_max_tokens")]
    pub max_tokens: usize,
    #[serde(default = "default_temperature")]
    pub temperature: f64,
    #[serde(default = "default_seed")]
    pub seed: u64,
    #[serde(default)]
    pub device: JsDeviceType,
}

fn default_max_tokens() -> usize {
    200
}
fn default_temperature() -> f64 {
    0.7
}
fn default_seed() -> u64 {
    42
}

impl From<JsTextGenConfig> for TextGenConfig {
    fn from(c: JsTextGenConfig) -> Self {
        TextGenConfig {
            model_path: c.model_path,
            tokenizer_path: c.tokenizer_path,
            max_tokens: c.max_tokens,
            temperature: c.temperature,
            seed: c.seed,
            device: c.device.into(),
        }
    }
}

#[command]
pub fn generate_text(
    model_path: String,
    tokenizer_path: String,
    prompt: String,
    max_tokens: Option<usize>,
    temperature: Option<f64>,
    seed: Option<u64>,
    device: Option<JsDeviceType>,
) -> Result<TextGenResult> {
    let result = local_ai_core::text_gen::generate_text(
        &model_path,
        &tokenizer_path,
        &prompt,
        max_tokens.unwrap_or(200),
        temperature.unwrap_or(0.7),
        seed.unwrap_or(42),
        device.unwrap_or_default().into(),
    )?;
    Ok(result)
}

#[command]
pub async fn create_text_generator(
    state: State<'_, LocalAiState>,
    config: JsTextGenConfig,
) -> Result<InstanceId> {
    let generator = TextGenerator::new(config.into())?;
    let id = state.add_text_generator(generator).await;
    Ok(id)
}

#[command]
pub async fn text_generator_generate(
    state: State<'_, LocalAiState>,
    id: String,
    prompt: String,
) -> Result<TextGenResult> {
    let generator = state.get_text_generator(&id).await?;
    let mut gen = generator.write().await;
    let result = gen.generate(&prompt)?;
    Ok(result)
}

// ============================================================================
// Image Captioning
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsImageCaptionConfig {
    pub model_path: String,
    pub tokenizer_path: String,
    #[serde(default = "default_seed")]
    pub seed: u64,
    #[serde(default)]
    pub device: JsDeviceType,
}

impl From<JsImageCaptionConfig> for ImageCaptionConfig {
    fn from(c: JsImageCaptionConfig) -> Self {
        ImageCaptionConfig {
            model_path: c.model_path,
            tokenizer_path: c.tokenizer_path,
            seed: c.seed,
            device: c.device.into(),
        }
    }
}

#[command]
pub fn caption_image(
    model_path: String,
    tokenizer_path: String,
    image_path: String,
    device: Option<JsDeviceType>,
) -> Result<ImageCaptionResult> {
    let result = local_ai_core::image_caption::caption_image(
        &model_path,
        &tokenizer_path,
        &image_path,
        device.unwrap_or_default().into(),
    )?;
    Ok(result)
}

#[command]
pub async fn create_image_captioner(
    state: State<'_, LocalAiState>,
    config: JsImageCaptionConfig,
) -> Result<InstanceId> {
    let captioner = ImageCaptioner::new(config.into())?;
    let id = state.add_image_captioner(captioner).await;
    Ok(id)
}

#[command]
pub async fn image_captioner_caption(
    state: State<'_, LocalAiState>,
    id: String,
    image_path: String,
) -> Result<ImageCaptionResult> {
    let captioner = state.get_image_captioner(&id).await?;
    let mut cap = captioner.write().await;
    let result = cap.caption(&image_path)?;
    Ok(result)
}

// ============================================================================
// Image Generation
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsImageGenConfig {
    pub unet_path: String,
    pub vae_path: String,
    pub clip_path: String,
    pub tokenizer_path: String,
    #[serde(default = "default_size")]
    pub height: usize,
    #[serde(default = "default_size")]
    pub width: usize,
    #[serde(default = "default_steps")]
    pub steps: usize,
    #[serde(default = "default_guidance")]
    pub guidance_scale: f64,
    #[serde(default = "default_seed")]
    pub seed: u64,
    #[serde(default)]
    pub device: JsDeviceType,
}

fn default_size() -> usize {
    512
}
fn default_steps() -> usize {
    30
}
fn default_guidance() -> f64 {
    7.5
}

impl From<JsImageGenConfig> for ImageGenConfig {
    fn from(c: JsImageGenConfig) -> Self {
        ImageGenConfig {
            unet_path: c.unet_path,
            vae_path: c.vae_path,
            clip_path: c.clip_path,
            tokenizer_path: c.tokenizer_path,
            height: c.height,
            width: c.width,
            steps: c.steps,
            guidance_scale: c.guidance_scale,
            seed: c.seed,
            device: c.device.into(),
        }
    }
}

#[command]
pub fn generate_image(
    prompt: String,
    uncond_prompt: Option<String>,
    unet_path: String,
    vae_path: String,
    clip_path: String,
    tokenizer_path: String,
    output_path: String,
    height: Option<usize>,
    width: Option<usize>,
    steps: Option<usize>,
    guidance_scale: Option<f64>,
    seed: Option<u64>,
    device: Option<JsDeviceType>,
) -> Result<ImageGenResult> {
    let result = local_ai_core::image_gen::generate_image(
        &prompt,
        &uncond_prompt.unwrap_or_default(),
        &unet_path,
        &vae_path,
        &clip_path,
        &tokenizer_path,
        &output_path,
        height.unwrap_or(512),
        width.unwrap_or(512),
        steps.unwrap_or(30),
        guidance_scale.unwrap_or(7.5),
        seed.unwrap_or(42),
        device.unwrap_or_default().into(),
    )?;
    Ok(result)
}

#[command]
pub async fn create_image_generator(
    state: State<'_, LocalAiState>,
    config: JsImageGenConfig,
) -> Result<InstanceId> {
    let generator = ImageGenerator::new(config.into())?;
    let id = state.add_image_generator(generator).await;
    Ok(id)
}

#[command]
pub async fn image_generator_generate(
    state: State<'_, LocalAiState>,
    id: String,
    prompt: String,
    uncond_prompt: Option<String>,
    output_path: String,
) -> Result<ImageGenResult> {
    let generator = state.get_image_generator(&id).await?;
    let result = generator.generate(&prompt, &uncond_prompt.unwrap_or_default(), &output_path)?;
    Ok(result)
}

// ============================================================================
// Audio Transcription
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsTranscribeConfig {
    pub model_path: String,
    pub tokenizer_path: String,
    pub config_path: String,
    #[serde(default)]
    pub quantized: bool,
    pub language: Option<String>,
    #[serde(default)]
    pub task: JsWhisperTask,
    #[serde(default)]
    pub timestamps: bool,
    #[serde(default = "default_seed")]
    pub seed: u64,
    #[serde(default)]
    pub device: JsDeviceType,
}

impl From<JsTranscribeConfig> for TranscribeConfig {
    fn from(c: JsTranscribeConfig) -> Self {
        TranscribeConfig {
            model_path: c.model_path,
            tokenizer_path: c.tokenizer_path,
            config_path: c.config_path,
            quantized: c.quantized,
            language: c.language,
            task: c.task.into(),
            timestamps: c.timestamps,
            seed: c.seed,
            device: c.device.into(),
        }
    }
}

#[command]
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
) -> Result<TranscriptionResult> {
    let result = local_ai_core::transcribe::transcribe_audio(
        &audio_path,
        &model_path,
        &tokenizer_path,
        &config_path,
        quantized.unwrap_or(false),
        language,
        task.unwrap_or_default().into(),
        timestamps.unwrap_or(false),
        device.unwrap_or_default().into(),
    )?;
    Ok(result)
}

#[command]
pub async fn create_transcriber(
    state: State<'_, LocalAiState>,
    config: JsTranscribeConfig,
) -> Result<InstanceId> {
    let transcriber = Transcriber::new(config.into())?;
    let id = state.add_transcriber(transcriber).await;
    Ok(id)
}

#[command]
pub async fn transcriber_transcribe(
    state: State<'_, LocalAiState>,
    id: String,
    audio_path: String,
) -> Result<TranscriptionResult> {
    let transcriber = state.get_transcriber(&id).await?;
    let mut trans = transcriber.write().await;
    let result = trans.transcribe(&audio_path)?;
    Ok(result)
}

// ============================================================================
// Text to Voice
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsTextToVoiceConfig {
    pub first_stage_path: String,
    pub first_stage_meta_path: String,
    pub second_stage_path: String,
    pub encodec_path: String,
    pub spk_emb_path: String,
    #[serde(default)]
    pub quantized: bool,
    #[serde(default = "default_voice_guidance")]
    pub guidance_scale: f64,
    #[serde(default = "default_voice_temperature")]
    pub temperature: f64,
    #[serde(default = "default_voice_max_tokens")]
    pub max_tokens: u64,
    #[serde(default = "default_seed")]
    pub seed: u64,
    #[serde(default)]
    pub device: JsDeviceType,
}

fn default_voice_guidance() -> f64 {
    3.0
}
fn default_voice_temperature() -> f64 {
    1.0
}
fn default_voice_max_tokens() -> u64 {
    2000
}

impl From<JsTextToVoiceConfig> for TextToVoiceConfig {
    fn from(c: JsTextToVoiceConfig) -> Self {
        TextToVoiceConfig {
            first_stage_path: c.first_stage_path,
            first_stage_meta_path: c.first_stage_meta_path,
            second_stage_path: c.second_stage_path,
            encodec_path: c.encodec_path,
            spk_emb_path: c.spk_emb_path,
            quantized: c.quantized,
            guidance_scale: c.guidance_scale,
            temperature: c.temperature,
            max_tokens: c.max_tokens,
            seed: c.seed,
            device: c.device.into(),
        }
    }
}

#[command]
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
    max_tokens: Option<u64>,
    seed: Option<u64>,
    device: Option<JsDeviceType>,
) -> Result<TextToVoiceResult> {
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
        max_tokens.unwrap_or(2000),
        seed.unwrap_or(42),
        device.unwrap_or_default().into(),
    )?;
    Ok(result)
}

#[command]
pub async fn create_voice_synthesizer(
    state: State<'_, LocalAiState>,
    config: JsTextToVoiceConfig,
) -> Result<InstanceId> {
    let synthesizer = VoiceSynthesizer::new(config.into())?;
    let id = state.add_voice_synthesizer(synthesizer).await;
    Ok(id)
}

#[command]
pub async fn voice_synthesizer_synthesize(
    state: State<'_, LocalAiState>,
    id: String,
    prompt: String,
    output_path: String,
) -> Result<TextToVoiceResult> {
    let synthesizer = state.get_voice_synthesizer(&id).await?;
    let mut synth = synthesizer.write().await;
    let result = synth.synthesize(&prompt, &output_path)?;
    Ok(result)
}

// ============================================================================
// Utilities
// ============================================================================

#[command]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[command]
pub fn has_metal_support() -> bool {
    cfg!(feature = "metal")
}

#[command]
pub fn has_cuda_support() -> bool {
    cfg!(feature = "cuda")
}

// ============================================================================
// Model Management
// ============================================================================

/// Information about an installed model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size: u64,
}

/// Result of listing models
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListModelsResult {
    pub text_models: Vec<ModelInfo>,
    pub diffusion_models: Vec<ModelInfo>,
    pub caption_models: Vec<ModelInfo>,
    pub whisper_models: Vec<ModelInfo>,
    pub tts_models: Vec<ModelInfo>,
    pub models_dir: String,
}

#[command]
pub fn list_models(state: State<'_, LocalAiState>) -> Result<ListModelsResult> {
    let models_dir = &state.models_dir;
    let mut text_models = Vec::new();
    let mut diffusion_models = Vec::new();
    let mut caption_models = Vec::new();
    let mut whisper_models = Vec::new();
    let mut tts_models = Vec::new();
    
    // Helper to scan a subdirectory for GGUF models
    fn scan_gguf_dir(dir: &std::path::Path) -> Vec<ModelInfo> {
        let mut models = Vec::new();
        if dir.exists() {
            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.filter_map(|e| e.ok()) {
                    let path = entry.path();
                    if path.is_dir() {
                        // Look for model.gguf inside subdirectory
                        let model_file = path.join("model.gguf");
                        if model_file.exists() {
                            let name = path.file_name()
                                .map(|s| s.to_string_lossy().to_string())
                                .unwrap_or_default();
                            let size = std::fs::metadata(&model_file)
                                .map(|m| m.len())
                                .unwrap_or(0);
                            models.push(ModelInfo {
                                id: name.clone(),
                                name,
                                path: model_file.to_string_lossy().to_string(),
                                size,
                            });
                        }
                    } else if path.is_file() {
                        if let Some(ext) = path.extension() {
                            if ext == "gguf" {
                                let name = path.file_stem()
                                    .map(|s| s.to_string_lossy().to_string())
                                    .unwrap_or_default();
                                let size = std::fs::metadata(&path)
                                    .map(|m| m.len())
                                    .unwrap_or(0);
                                models.push(ModelInfo {
                                    id: name.clone(),
                                    name,
                                    path: path.to_string_lossy().to_string(),
                                    size,
                                });
                            }
                        }
                    }
                }
            }
        }
        models
    }
    
    // Scan for GGUF files at root level
    if models_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&models_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.is_file() {
                    if let Some(ext) = path.extension() {
                        if ext == "gguf" {
                            let name = path.file_stem()
                                .map(|s| s.to_string_lossy().to_string())
                                .unwrap_or_default();
                            let size = std::fs::metadata(&path)
                                .map(|m| m.len())
                                .unwrap_or(0);
                            text_models.push(ModelInfo {
                                id: name.clone(),
                                name,
                                path: path.to_string_lossy().to_string(),
                                size,
                            });
                        }
                    }
                }
            }
        }
    }
    
    // Scan text-gen subdirectory
    text_models.extend(scan_gguf_dir(&models_dir.join("text-gen")));
    
    // Scan caption subdirectory
    caption_models.extend(scan_gguf_dir(&models_dir.join("caption")));
    
    // Scan whisper subdirectory
    whisper_models.extend(scan_gguf_dir(&models_dir.join("whisper")));
    
    // Scan tts subdirectory
    tts_models.extend(scan_gguf_dir(&models_dir.join("tts")));
    
    // Scan diffusion subdirectory
    let diffusion_dir = models_dir.join("diffusion");
    if diffusion_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&diffusion_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let path = entry.path();
                if path.is_dir() {
                    let name = path.file_name()
                        .map(|s| s.to_string_lossy().to_string())
                        .unwrap_or_default();
                    // Check if it has the required SD files (unet.safetensors)
                    let has_unet = path.join("unet.safetensors").exists() || 
                        path.join("unet").exists() ||
                        std::fs::read_dir(&path)
                            .map(|d| d.filter_map(|e| e.ok())
                                .any(|e| e.path().to_string_lossy().contains("unet")))
                            .unwrap_or(false);
                    if has_unet {
                        // Calculate total size of all files in directory
                        let size = std::fs::read_dir(&path)
                            .map(|d| d.filter_map(|e| e.ok())
                                .map(|e| std::fs::metadata(e.path()).map(|m| m.len()).unwrap_or(0))
                                .sum())
                            .unwrap_or(0);
                        diffusion_models.push(ModelInfo {
                            id: name.clone(),
                            name,
                            path: path.to_string_lossy().to_string(),
                            size,
                        });
                    }
                }
            }
        }
    }
    
    Ok(ListModelsResult {
        text_models,
        diffusion_models,
        caption_models,
        whisper_models,
        tts_models,
        models_dir: models_dir.to_string_lossy().to_string(),
    })
}

#[command]
pub fn ensure_models_dir(state: State<'_, LocalAiState>) -> Result<String> {
    let models_dir = &state.models_dir;
    std::fs::create_dir_all(models_dir)?;
    std::fs::create_dir_all(models_dir.join("text-gen"))?;
    std::fs::create_dir_all(models_dir.join("diffusion"))?;
    std::fs::create_dir_all(models_dir.join("whisper"))?;
    std::fs::create_dir_all(models_dir.join("tts"))?;
    std::fs::create_dir_all(models_dir.join("caption"))?;
    Ok(models_dir.to_string_lossy().to_string())
}

/// Result of a file download
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadResult {
    pub success: bool,
    pub path: String,
    pub size: u64,
    pub error: Option<String>,
}

/// Download a file from a URL to a local path within the models directory
#[command]
pub async fn download_file(state: State<'_, LocalAiState>, url: String, relative_path: String, overwrite: Option<bool>) -> Result<DownloadResult> {
    // Clone the path so we can use it across await points
    let models_dir = state.models_dir.clone();
    let target_path = models_dir.join(&relative_path);
    
    // Ensure parent directory exists
    if let Some(parent) = target_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    
    // Check if already exists
    if target_path.exists() && !overwrite.unwrap_or(false) {
        let size = std::fs::metadata(&target_path).map(|m| m.len()).unwrap_or(0);
        return Ok(DownloadResult {
            success: true,
            path: target_path.to_string_lossy().to_string(),
            size,
            error: Some("File already exists".to_string()),
        });
    }
    
    // Download
    let response = reqwest::get(&url).await.map_err(|e| Error::Other(format!("Download failed: {}", e)))?;
    
    if !response.status().is_success() {
        return Ok(DownloadResult {
            success: false,
            path: target_path.to_string_lossy().to_string(),
            size: 0,
            error: Some(format!("HTTP {}: Download failed", response.status())),
        });
    }
    
    let bytes = response.bytes().await.map_err(|e| Error::Other(format!("Read failed: {}", e)))?;
    let size = bytes.len() as u64;
    
    std::fs::write(&target_path, &bytes)?;
    
    Ok(DownloadResult {
        success: true,
        path: target_path.to_string_lossy().to_string(),
        size,
        error: None,
    })
}
