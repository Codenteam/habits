use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

use crate::error::{Error, Result};
use crate::models::*;

use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::LlamaModel;
use llama_cpp_2::sampling::LlamaSampler;
use candle_core::Device;

/// Manages models and inference for text, vision, and image generation
pub struct CandleManager {
    /// llama.cpp backend for GGUF models
    backend: LlamaBackend,
    /// Loaded LLM models (path -> model)
    llm_models: Mutex<HashMap<String, std::sync::Arc<LlamaModel>>>,
    /// Models directory
    models_dir: PathBuf,
    /// Diffusion models directory
    diffusion_dir: PathBuf,
    /// Device for Candle inference
    device: Device,
}

impl CandleManager {
    pub fn new(models_dir: PathBuf) -> Self {
        let backend = LlamaBackend::init().expect("Failed to initialize llama.cpp backend");
        let diffusion_dir = models_dir.join("diffusion");
        
        // Select best available device for Candle
        let device = Self::get_best_device();
        
        Self {
            backend,
            llm_models: Mutex::new(HashMap::new()),
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
    
    /// Load or get a cached LLM model
    fn get_llm_model(&self, model_path: &str) -> Result<std::sync::Arc<LlamaModel>> {
        let mut models = self.llm_models.lock().unwrap();
        
        if let Some(model) = models.get(model_path) {
            return Ok(model.clone());
        }
        
        let path = PathBuf::from(model_path);
        let actual_path = if path.is_absolute() {
            path
        } else {
            self.models_dir.join(&path)
        };
        
        if !actual_path.exists() {
            return Err(Error::Model(format!(
                "Model not found: {}",
                actual_path.display()
            )));
        }
        
        println!("[Candle] Loading model: {}", actual_path.display());
        
        // Disable mmap to avoid threading issues with WebKit
        let model_params = LlamaModelParams::default()
            .with_use_mmap(false);
        let model = LlamaModel::load_from_file(&self.backend, actual_path, &model_params)
            .map_err(|e| Error::Model(format!("Failed to load model: {}", e)))?;
        
        let model_arc = std::sync::Arc::new(model);
        models.insert(model_path.to_string(), model_arc.clone());
        
        Ok(model_arc)
    }
    
    /// Run chat completion using llama.cpp
    pub fn chat(&self, params: &ChatParams) -> Result<ChatResult> {
        let model = self.get_llm_model(&params.model_path)?;
        
        // Build prompt from messages
        let mut prompt = String::new();
        if let Some(ref system) = params.system_prompt {
            prompt.push_str(&format!("<|im_start|>system\n{}<|im_end|>\n", system));
        }
        for msg in &params.messages {
            prompt.push_str(&format!("<|im_start|>{}\n{}<|im_end|>\n", msg.role, msg.content));
        }
        prompt.push_str("<|im_start|>assistant\n");
        
        // Create context
        let ctx_params = LlamaContextParams::default()
            .with_n_ctx(std::num::NonZeroU32::new(4096));
        
        let mut ctx = model.new_context(&self.backend, ctx_params)
            .map_err(|e| Error::Inference(format!("Failed to create context: {}", e)))?;
        
        // Tokenize
        let tokens = model.str_to_token(&prompt, llama_cpp_2::model::AddBos::Always)
            .map_err(|e| Error::Inference(format!("Tokenization failed: {}", e)))?;
        
        let prompt_tokens = tokens.len() as u32;
        
        // Create batch
        let mut batch = LlamaBatch::new(4096, 1);
        for (i, token) in tokens.iter().enumerate() {
            let is_last = i == tokens.len() - 1;
            batch.add(*token, i as i32, &[0], is_last)
                .map_err(|_| Error::Inference("Failed to add token to batch".to_string()))?;
        }
        
        // Decode prompt
        ctx.decode(&mut batch)
            .map_err(|e| Error::Inference(format!("Prompt decode failed: {}", e)))?;
        
        // Create greedy sampler
        let mut sampler = LlamaSampler::greedy();
        
        // Generate response
        let mut response_tokens = Vec::new();
        let mut n_cur = batch.n_tokens();
        let max_tokens = params.max_tokens as i32;
        
        // Create decoder for token to string conversion
        let mut decoder = encoding_rs::UTF_8.new_decoder();
        
        while n_cur < max_tokens {
            // Sample next token using greedy sampler
            let new_token = sampler.sample(&ctx, batch.n_tokens() - 1);
            
            // Check for EOS
            if model.is_eog_token(new_token) {
                break;
            }
            
            response_tokens.push(new_token);
            sampler.accept(new_token);
            
            // Prepare next batch
            batch.clear();
            batch.add(new_token, n_cur, &[0], true)
                .map_err(|_| Error::Inference("Failed to add token".to_string()))?;
            
            ctx.decode(&mut batch)
                .map_err(|e| Error::Inference(format!("Decode failed: {}", e)))?;
            
            n_cur += 1;
        }
        
        // Convert tokens to string
        let mut response_text = String::new();
        for token in &response_tokens {
            let piece = model.token_to_piece(*token, &mut decoder, true, None)
                .map_err(|e| Error::Inference(format!("Token to string failed: {}", e)))?;
            response_text.push_str(&piece);
        }
        
        // Clean up trailing tags
        if let Some(pos) = response_text.find("<|im_end|>") {
            response_text.truncate(pos);
        }
        
        Ok(ChatResult {
            message: ChatMessage {
                role: "assistant".to_string(),
                content: response_text.clone(),
            },
            content: response_text,
            model: params.model_path.clone(),
            usage: UsageStats {
                prompt_tokens,
                completion_tokens: response_tokens.len() as u32,
                total_tokens: prompt_tokens + response_tokens.len() as u32,
            },
        })
    }
    
    /// Run vision chat - currently uses text model with image description
    pub fn vision_chat(&self, params: &VisionParams) -> Result<VisionResult> {
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
