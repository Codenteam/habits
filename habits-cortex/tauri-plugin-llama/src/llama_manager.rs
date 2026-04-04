use std::collections::HashMap;
use std::num::NonZeroU32;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use crate::error::{Error, Result};
use crate::models::*;

use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::LlamaModel;
use llama_cpp_2::sampling::LlamaSampler;

/// Manages loaded models and their contexts
pub struct LlamaManager {
    backend: Option<LlamaBackend>,
    models: Mutex<HashMap<String, Arc<LlamaModel>>>,
    models_dir: PathBuf,
}

impl LlamaManager {
    pub fn new(models_dir: PathBuf) -> Self {
        Self {
            backend: None,
            models: Mutex::new(HashMap::new()),
            models_dir,
        }
    }
    
    /// Initialize the llama backend
    fn ensure_backend(&mut self) -> Result<&LlamaBackend> {
        if self.backend.is_none() {
            let backend = LlamaBackend::init()
                .map_err(|e| Error::Model(format!("Failed to initialize llama backend: {:?}", e)))?;
            self.backend = Some(backend);
        }
        Ok(self.backend.as_ref().unwrap())
    }
    
    /// Get the models directory
    pub fn models_dir(&self) -> &PathBuf {
        &self.models_dir
    }
    
    /// Ensure models directory exists
    pub fn ensure_models_dir(&self) -> Result<PathBuf> {
        std::fs::create_dir_all(&self.models_dir)?;
        Ok(self.models_dir.clone())
    }
    
    /// Load a model from path
    pub fn load_model(&mut self, model_path: &str) -> Result<()> {
        let path = PathBuf::from(model_path);
        let path_str = path.to_string_lossy().to_string();
        
        // Check if already loaded
        {
            let models = self.models.lock().unwrap();
            if models.contains_key(&path_str) {
                return Ok(());
            }
        }
        
        // Ensure backend is initialized
        self.ensure_backend()?;
        
        // Check file exists
        if !path.exists() {
            return Err(Error::File(format!("Model file not found: {}", model_path)));
        }
        
        // Load model
        let params = LlamaModelParams::default();
        let model = LlamaModel::load_from_file(self.backend.as_ref().unwrap(), &path, &params)
            .map_err(|e| Error::Model(format!("Failed to load model: {:?}", e)))?;
        
        // Store in cache
        {
            let mut models = self.models.lock().unwrap();
            models.insert(path_str, Arc::new(model));
        }
        
        Ok(())
    }
    
    /// Get a loaded model
    pub fn get_model(&self, model_path: &str) -> Result<Arc<LlamaModel>> {
        let path = PathBuf::from(model_path);
        let path_str = path.to_string_lossy().to_string();
        
        let models = self.models.lock().unwrap();
        models.get(&path_str)
            .cloned()
            .ok_or_else(|| Error::Model(format!("Model not loaded: {}", model_path)))
    }
    
    /// Unload a model
    pub fn unload_model(&self, model_path: &str) -> Result<()> {
        let path = PathBuf::from(model_path);
        let path_str = path.to_string_lossy().to_string();
        
        let mut models = self.models.lock().unwrap();
        models.remove(&path_str);
        
        Ok(())
    }
    
    /// List models in the models directory
    pub fn list_models(&self) -> Result<Vec<ModelInfo>> {
        let mut models = Vec::new();
        
        if !self.models_dir.exists() {
            return Ok(models);
        }
        
        for entry in std::fs::read_dir(&self.models_dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.extension().map_or(false, |e| e == "gguf") {
                let metadata = std::fs::metadata(&path)?;
                let name = path.file_stem()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_default();
                
                models.push(ModelInfo {
                    id: path.file_name().unwrap().to_string_lossy().to_string(),
                    name: name.replace('-', " ").replace('_', " "),
                    description: None,
                    path: Some(path.to_string_lossy().to_string()),
                    size: Some(metadata.len()),
                    provider: "local".to_string(),
                    supports: ModelCapabilities {
                        chat: true,
                        completion: true,
                        ..Default::default()
                    },
                });
            }
        }
        
        Ok(models)
    }
    
    /// Get info about a specific model
    pub fn get_model_info(&self, model_path: &str) -> Result<Option<ModelInfo>> {
        let path = PathBuf::from(model_path);
        
        if !path.exists() {
            return Ok(None);
        }
        
        let metadata = std::fs::metadata(&path)?;
        let name = path.file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();
        
        Ok(Some(ModelInfo {
            id: path.file_name().unwrap().to_string_lossy().to_string(),
            name: name.replace('-', " ").replace('_', " "),
            description: None,
            path: Some(path.to_string_lossy().to_string()),
            size: Some(metadata.len()),
            provider: "local".to_string(),
            supports: ModelCapabilities {
                chat: true,
                completion: true,
                ..Default::default()
            },
        }))
    }
    
    /// Run chat completion
    pub fn chat(&mut self, params: &ChatParams) -> Result<ChatResult> {
        // Load model if not already loaded
        self.load_model(&params.model_path)?;
        
        let model = self.get_model(&params.model_path)?;
        
        // Create context with larger context size (4096 tokens)
        let ctx_params = LlamaContextParams::default()
            .with_n_ctx(NonZeroU32::new(4096));
        let mut ctx = model.new_context(self.backend.as_ref().unwrap(), ctx_params)
            .map_err(|e| Error::Context(format!("Failed to create context: {:?}", e)))?;
        
        // Build prompt using ChatML format (used by Qwen, Llama-instruct, etc.)
        let mut prompt = String::new();
        
        // Add system prompt if provided
        if let Some(ref system) = params.system_prompt {
            prompt.push_str("<|im_start|>system\n");
            prompt.push_str(system);
            prompt.push_str("<|im_end|>\n");
        }
        
        // Add messages
        for msg in &params.messages {
            match msg.role {
                ChatRole::System => {
                    // Skip if already added via system_prompt
                    if params.system_prompt.is_none() {
                        prompt.push_str("<|im_start|>system\n");
                        prompt.push_str(&msg.content);
                        prompt.push_str("<|im_end|>\n");
                    }
                }
                ChatRole::User => {
                    prompt.push_str("<|im_start|>user\n");
                    prompt.push_str(&msg.content);
                    prompt.push_str("<|im_end|>\n");
                }
                ChatRole::Assistant => {
                    prompt.push_str("<|im_start|>assistant\n");
                    prompt.push_str(&msg.content);
                    prompt.push_str("<|im_end|>\n");
                }
            }
        }
        
        // Start assistant response
        prompt.push_str("<|im_start|>assistant\n");
        
        // Tokenize
        let tokens = model.str_to_token(&prompt, llama_cpp_2::model::AddBos::Always)
            .map_err(|e| Error::Inference(format!("Tokenization failed: {:?}", e)))?;
        
        // Create batch and decode
        let mut batch = llama_cpp_2::llama_batch::LlamaBatch::new(512, 1);
        
        // Add tokens to batch
        for (i, token) in tokens.iter().enumerate() {
            batch.add(*token, i as i32, &[0], i == tokens.len() - 1)
                .map_err(|e| Error::Inference(format!("Failed to add token: {:?}", e)))?;
        }
        
        // Decode
        ctx.decode(&mut batch)
            .map_err(|e| Error::Inference(format!("Decode failed: {:?}", e)))?;
        
        // Generate response using proper sampling
        let mut response = String::new();
        let mut n_cur = batch.n_tokens();
        let mut completion_tokens = 0u32;
        
        // Track which batch index has logits (last token in batch has logits=true)
        let mut logits_idx = batch.n_tokens() as i32 - 1;
        
        // Build sampler chain with temperature, top_p, and repetition penalties
        let seed = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as u32)
            .unwrap_or(42);
        
        let mut sampler = LlamaSampler::chain(
            [
                // Apply repetition penalty to last 64 tokens
                LlamaSampler::penalties(
                    64,   // penalty_last_n: look at last 64 tokens
                    1.1,  // penalty_repeat: repetition penalty
                    0.0,  // penalty_freq: frequency penalty
                    0.0,  // penalty_present: presence penalty
                ),
                // Temperature scaling
                LlamaSampler::temp(params.temperature),
                // Top-p (nucleus) sampling
                LlamaSampler::top_p(params.top_p, 1),
                // Random sampling from distribution
                LlamaSampler::dist(seed),
            ],
            false,
        );
        
        // Accept prompt tokens into sampler for repetition tracking
        sampler.accept_many(tokens.iter().copied());
        
        // Clear batch for generation
        batch.clear();
        
        // Generate tokens one at a time
        for _ in 0..params.max_tokens {
            // Sample directly from context using the sampler chain
            let new_token = sampler.sample(&ctx, logits_idx);
            
            // Accept the token into sampler for repetition tracking
            sampler.accept(new_token);
            
            // Check for EOS
            if model.is_eog_token(new_token) {
                break;
            }
            
            // Convert token to string using encoding_rs decoder
            let mut decoder = encoding_rs::UTF_8.new_decoder();
            if let Ok(piece) = model.token_to_piece(new_token, &mut decoder, false, None) {
                // Check for ChatML end token
                if piece.contains("<|im_end|>") || piece.contains("<|endoftext|>") {
                    // Strip the stop token if partially added
                    let trimmed = response.trim_end_matches("<|im_end|>")
                        .trim_end_matches("<|endoftext|>")
                        .trim_end_matches("<|im_end")
                        .trim_end_matches("<|endoftext")
                        .to_string();
                    response = trimmed;
                    break;
                }
                response.push_str(&piece);
                
                // Also check accumulated response for stop tokens
                if response.ends_with("<|im_end|>") || response.ends_with("<|endoftext|>") {
                    response = response.trim_end_matches("<|im_end|>")
                        .trim_end_matches("<|endoftext|>")
                        .to_string();
                    break;
                }
            }
            
            completion_tokens += 1;
            
            // Add token to batch
            batch.add(new_token, n_cur, &[0], true)
                .map_err(|e| Error::Inference(format!("Failed to add token: {:?}", e)))?;
            
            n_cur += 1;
            
            // Decode
            ctx.decode(&mut batch)
                .map_err(|e| Error::Inference(format!("Decode failed: {:?}", e)))?;
            
            // After decode, logits are at batch index 0 (only one token in batch)
            logits_idx = 0;
            
            batch.clear();
        }
        
        // Trim final response
        let response = response.trim().to_string();
        
        // Build result
        let model_name = PathBuf::from(&params.model_path)
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();
        
        Ok(ChatResult {
            message: ChatMessage {
                role: ChatRole::Assistant,
                content: response.clone(),
                images: None,
            },
            content: response,
            usage: TokenUsage {
                prompt_tokens: tokens.len() as u32,
                completion_tokens,
                total_tokens: tokens.len() as u32 + completion_tokens,
            },
            finish_reason: "stop".to_string(),
            model: model_name,
        })
    }
}

impl Clone for LlamaManager {
    fn clone(&self) -> Self {
        Self {
            backend: None, // Backend is not cloneable, will be re-initialized
            models: Mutex::new(HashMap::new()), // Don't share model cache
            models_dir: self.models_dir.clone(),
        }
    }
}

unsafe impl Send for LlamaManager {}
unsafe impl Sync for LlamaManager {}
