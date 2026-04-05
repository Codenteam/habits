use serde::{Deserialize, Serialize};

/// A chat message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// Parameters for chat completion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatParams {
    pub model_path: String,
    pub messages: Vec<ChatMessage>,
    pub system_prompt: Option<String>,
    pub temperature: f32,
    pub max_tokens: u32,
    pub top_p: f32,
}

/// Result of chat completion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResult {
    pub message: ChatMessage,
    pub content: String,
    pub model: String,
    pub usage: UsageStats,
}

/// Token usage statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageStats {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

impl Default for UsageStats {
    fn default() -> Self {
        Self {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
        }
    }
}

/// Parameters for vision chat
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisionParams {
    pub model_path: String,
    pub image: String,
    pub prompt: String,
    pub detail: Option<String>,
    pub temperature: f32,
    pub max_tokens: u32,
}

/// Result from vision chat
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VisionResult {
    pub message: ChatMessage,
    pub content: String,
    pub model: String,
    pub usage: UsageStats,
}

/// Parameters for image generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateImageParams {
    pub model_path: String,
    pub prompt: String,
    pub negative_prompt: Option<String>,
    pub width: u32,
    pub height: u32,
    pub steps: u32,
    pub guidance_scale: f32,
    pub seed: Option<i64>,
    pub response_format: Option<String>,
}

/// A generated image
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedImage {
    pub b64_json: String,
    pub revised_prompt: String,
}

/// Result from image generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateImageResult {
    pub images: Vec<GeneratedImage>,
    pub seed: i64,
    pub model: String,
}

/// Information about a model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub path: Option<String>,
    pub size: Option<u64>,
    pub model_type: String, // "text", "vision", "diffusion"
}

/// Result from listing models
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListModelsResult {
    pub text_models: Vec<ModelInfo>,
    pub diffusion_models: Vec<ModelInfo>,
    pub models_dir: String,
}
