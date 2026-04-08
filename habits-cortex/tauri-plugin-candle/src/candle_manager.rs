use std::path::PathBuf;

use crate::error::{Error, Result};
use crate::models::*;
use crate::text_generation;

use candle_core::Device;

/// Manages models and inference for text, vision, and image generation
pub struct CandleManager {
    /// Models directory
    models_dir: PathBuf,
    /// Diffusion models directory
    diffusion_dir: PathBuf,
    /// Device for Candle inference
    device: Device,
}

impl CandleManager {
    pub fn new(models_dir: PathBuf) -> Self {
        let diffusion_dir = models_dir.join("diffusion");
        
        // Select best available device for Candle
        let device = Self::get_best_device();
        
        Self {
            models_dir,
            diffusion_dir,
            device,
        }
    }
    
    /// Get the best available compute device
    fn get_best_device() -> Device {
        // For Tauri, use CPU for better thread safety
        // Metal has thread affinity requirements that conflict with Tauri's threading model
        println!("[Candle] Using CPU (Metal disabled for thread safety)");
        Device::Cpu
    }
    
    /// Get the models directory
    pub fn models_dir(&self) -> &PathBuf {
        &self.models_dir
    }
    
    /// Ensure models directory exists
    pub fn ensure_models_dir(&self) -> Result<PathBuf> {
        std::fs::create_dir_all(&self.models_dir)?;
        std::fs::create_dir_all(&self.diffusion_dir)?;
        Ok(self.models_dir.clone())
    }
    
    /// Run chat completion using quantized LLMs
    /// 
    /// Supported models (smallest first):
    /// - SmolLM2-135M (~100MB) - Llama architecture
    /// - SmolLM2-360M (~250MB) - Llama architecture
    /// - Qwen3-0.6B (~400MB) - Qwen3 architecture
    pub fn chat(&self, params: &ChatParams) -> Result<ChatResult> {
        let path = PathBuf::from(&params.model_path);
        let actual_path = if path.is_absolute() {
            path
        } else {
            self.models_dir.join(&path)
        };
        
        if !actual_path.exists() {
            // Suggest downloading a small model
            let recommended = text_generation::get_recommended_models();
            let suggestions: Vec<String> = recommended.iter()
                .map(|(name, repo, file, size)| {
                    format!("  - {} (~{}MB): {}/{}", name, size / 1_000_000, repo, file)
                })
                .collect();
            
            return Err(Error::Model(format!(
                "Model not found: {}\n\nRecommended small models:\n{}",
                actual_path.display(),
                suggestions.join("\n")
            )));
        }
        
        text_generation::chat_completion(&actual_path, params, &self.device)
    }
    
    /// Run vision chat - currently uses text model with image description
    pub fn vision_chat(&self, _params: &VisionParams) -> Result<VisionResult> {
        // For now, vision is not directly supported by all GGUF models
        // Return a helpful error message
        Err(Error::Vision(
            "Vision is not fully supported by this GGUF model. \
            Use a vision-capable model like LLaVA or Qwen-VL.".to_string()
        ))
    }
    
    /// Generate image using Stable Diffusion via Candle
    pub fn generate_image(&self, params: &GenerateImageParams) -> Result<GenerateImageResult> {
        use rand::Rng;
        
        let seed = params.seed.unwrap_or_else(|| {
            let mut rng = rand::thread_rng();
            rng.gen()
        });
        
        // Check if model exists
        let model_path = PathBuf::from(&params.model_path);
        let actual_path = if model_path.is_absolute() {
            model_path
        } else {
            self.diffusion_dir.join(&params.model_path)
        };
        
        if !actual_path.exists() {
            return Err(Error::ImageGeneration(format!(
                "Diffusion model not found: {}. Expected at: {}",
                params.model_path,
                actual_path.display()
            )));
        }
        
        println!("[Candle] Image generation: {}x{}, steps={}, guidance={}, seed={}",
            params.width, params.height, params.steps, params.guidance_scale, seed);
        println!("[Candle] Prompt: {}", &params.prompt);
        
        // TODO: Full Stable Diffusion implementation using Candle
        // For now, return a placeholder indicating the feature needs full SD pipeline
        Err(Error::ImageGeneration(
            format!(
                "Stable Diffusion generation via Candle requires full pipeline implementation. \
                Model found at: {}. Width: {}, Height: {}, Steps: {}, Seed: {}",
                actual_path.display(), params.width, params.height, params.steps, seed
            )
        ))
    }
    
    /// List all available models
    pub fn list_models(&self) -> Result<ListModelsResult> {
        let mut text_models = Vec::new();
        let mut diffusion_models = Vec::new();
        
        // Scan main models directory for GGUF files (text/vision)
        if self.models_dir.exists() {
            for entry in std::fs::read_dir(&self.models_dir)? {
                let entry = entry?;
                let path = entry.path();
                
                if path.is_file() {
                    if let Some(ext) = path.extension() {
                        if ext == "gguf" {
                            let name = path.file_name()
                                .map(|s| s.to_string_lossy().to_string())
                                .unwrap_or_default();
                            let size = std::fs::metadata(&path).ok().map(|m| m.len());
                            
                            text_models.push(ModelInfo {
                                id: name.clone(),
                                name: name.replace('-', " ").replace('_', " "),
                                path: Some(path.to_string_lossy().to_string()),
                                size,
                                model_type: "text".to_string(),
                            });
                        }
                    }
                }
            }
        }
        
        // Scan diffusion directory
        if self.diffusion_dir.exists() {
            for entry in std::fs::read_dir(&self.diffusion_dir)? {
                let entry = entry?;
                let path = entry.path();
                
                let is_diffusion = path.extension().map_or(false, |e| {
                    e == "gguf" || e == "safetensors"
                }) || (path.is_dir() && path.join("model_index.json").exists());
                
                if is_diffusion {
                    let name = path.file_name()
                        .map(|s| s.to_string_lossy().to_string())
                        .unwrap_or_default();
                    let size = if path.is_file() {
                        std::fs::metadata(&path).ok().map(|m| m.len())
                    } else {
                        None
                    };
                    
                    diffusion_models.push(ModelInfo {
                        id: name.clone(),
                        name: name.replace('-', " ").replace('_', " "),
                        path: Some(path.to_string_lossy().to_string()),
                        size,
                        model_type: "diffusion".to_string(),
                    });
                }
            }
        }
        
        Ok(ListModelsResult {
            text_models,
            diffusion_models,
            models_dir: self.models_dir.to_string_lossy().to_string(),
        })
    }
}
