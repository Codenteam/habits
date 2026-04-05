use serde::{Deserialize, Serialize};

/// Parameters for image generation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateImageParams {
    pub model_path: String,
    pub prompt: String,
    #[serde(default)]
    pub negative_prompt: String,
    #[serde(default = "default_width")]
    pub width: u32,
    #[serde(default = "default_height")]
    pub height: u32,
    #[serde(default = "default_steps")]
    pub steps: u32,
    #[serde(default = "default_guidance_scale")]
    pub guidance_scale: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seed: Option<u64>,
    #[serde(default = "default_response_format")]
    pub response_format: String,
}

fn default_width() -> u32 { 512 }
fn default_height() -> u32 { 512 }
fn default_steps() -> u32 { 20 }
fn default_guidance_scale() -> f32 { 7.5 }
fn default_response_format() -> String { "b64_json".to_string() }

/// A generated image
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneratedImage {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub b64_json: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub revised_prompt: Option<String>,
}

/// Result from image generation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateImageResult {
    pub images: Vec<GeneratedImage>,
    pub seed: u64,
    pub model: String,
}

/// Information about a diffusion model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffusionModelInfo {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
    pub model_type: String, // "sd15", "sdxl", "flux", etc.
}
