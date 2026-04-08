//! Text generation using Candle's quantized transformers
//!
//! Supports small LLMs:
//! - SmolLM2-135M (Llama architecture) - ~100MB quantized
//! - SmolLM2-360M (Llama architecture) - ~250MB quantized  
//! - Qwen3-0.6B (Qwen3 architecture) - ~400MB quantized

use std::io::BufReader;
use std::path::Path;
use std::fs::File;

use candle_core::{Device, Tensor};
use candle_transformers::generation::LogitsProcessor;
use candle_transformers::models::quantized_llama as llama;

use crate::error::{Error, Result};
use crate::models::{ChatMessage, ChatParams, ChatResult, UsageStats};

/// Supported model architectures
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ModelArch {
    /// Llama-based models (SmolLM2, Llama, etc.)
    Llama,
    /// Qwen3 architecture
    Qwen3,
}

impl ModelArch {
    /// Detect architecture from model filename
    pub fn from_path(path: &str) -> Self {
        let lower = path.to_lowercase();
        if lower.contains("qwen") {
            ModelArch::Qwen3
        } else {
            // Default to Llama for SmolLM2 and other Llama-based models
            ModelArch::Llama
        }
    }
}

/// Text generator wrapping quantized models
pub struct TextGenerator {
    model: llama::ModelWeights,
    device: Device,
    eos_token: u32,
}

impl TextGenerator {
    /// Load a quantized GGUF model
    pub fn load(model_path: &Path, device: &Device) -> Result<Self> {
        println!("[TextGen] Loading model: {}", model_path.display());
        
        let file = File::open(model_path)
            .map_err(|e| Error::Model(format!("Failed to open model: {}", e)))?;
        let mut reader = BufReader::new(file);
        
        // Load GGUF content
        let content = candle_core::quantized::gguf_file::Content::read(&mut reader)
            .map_err(|e| Error::Model(format!("Failed to read GGUF: {}", e)))?;
        
        println!("[TextGen] GGUF loaded, building model...");
        
        // Load model weights
        let model = llama::ModelWeights::from_gguf(content, &mut reader, device)
            .map_err(|e| Error::Model(format!("Failed to load model weights: {}", e)))?;
        
        // EOS token (common default, may vary by model)
        let eos_token = 2; // Standard EOS for most models
        
        println!("[TextGen] Model loaded successfully");
        
        Ok(Self {
            model,
            device: device.clone(),
            eos_token,
        })
    }
    
    /// Generate text from a prompt
    pub fn generate(
        &mut self,
        prompt: &str,
        max_tokens: usize,
        temperature: f64,
        top_p: f64,
        seed: u64,
    ) -> Result<(String, usize, usize)> {
        // Tokenize prompt using simple byte-level encoding
        // Note: For production, use proper tokenizer from tokenizers crate
        let prompt_tokens = self.simple_tokenize(prompt)?;
        let prompt_len = prompt_tokens.len();
        
        println!("[TextGen] Prompt tokens: {}", prompt_len);
        
        // Create logits processor for sampling
        let mut logits_processor = LogitsProcessor::new(seed, Some(temperature), Some(top_p));
        
        // Generate tokens
        let mut all_tokens = prompt_tokens.clone();
        let mut generated_tokens = Vec::new();
        
        for i in 0..max_tokens {
            // Get context (limit to max seq len)
            let context_size = all_tokens.len().min(llama::MAX_SEQ_LEN);
            let start = all_tokens.len().saturating_sub(context_size);
            let context = &all_tokens[start..];
            
            // Create input tensor
            let input = Tensor::new(context, &self.device)
                .map_err(|e| Error::Inference(format!("Tensor creation failed: {}", e)))?
                .unsqueeze(0)
                .map_err(|e| Error::Inference(format!("Unsqueeze failed: {}", e)))?;
            
            // Forward pass
            let logits = self.model.forward(&input, start)
                .map_err(|e| Error::Inference(format!("Forward pass failed: {}", e)))?;
            
            // Get logits for last token
            let logits = logits.squeeze(0)
                .map_err(|e| Error::Inference(format!("Squeeze failed: {}", e)))?;
            let logits = logits.get(logits.dim(0)? - 1)
                .map_err(|e| Error::Inference(format!("Get last logits failed: {}", e)))?;
            
            // Sample next token
            let next_token = logits_processor.sample(&logits)
                .map_err(|e| Error::Inference(format!("Sampling failed: {}", e)))?;
            
            // Check for EOS
            if next_token == self.eos_token {
                println!("[TextGen] EOS reached at token {}", i);
                break;
            }
            
            all_tokens.push(next_token);
            generated_tokens.push(next_token);
            
            // Progress logging
            if i > 0 && i % 50 == 0 {
                println!("[TextGen] Generated {} tokens...", i);
            }
        }
        
        // Decode generated tokens
        let generated_text = self.simple_detokenize(&generated_tokens)?;
        
        Ok((generated_text, prompt_len, generated_tokens.len()))
    }
    
    /// Simple byte-level tokenization (placeholder - use proper tokenizer in production)
    fn simple_tokenize(&self, text: &str) -> Result<Vec<u32>> {
        // This is a very simple tokenizer that won't work well for real inference
        // In production, use tokenizers crate with the model's actual tokenizer
        Ok(text.bytes().map(|b| b as u32).collect())
    }
    
    /// Simple byte-level detokenization
    fn simple_detokenize(&self, tokens: &[u32]) -> Result<String> {
        let bytes: Vec<u8> = tokens.iter()
            .filter_map(|&t| if t < 256 { Some(t as u8) } else { None })
            .collect();
        String::from_utf8(bytes)
            .map_err(|e| Error::Inference(format!("Detokenization failed: {}", e)))
    }
}

/// Run chat completion with a GGUF model
pub fn chat_completion(
    model_path: &Path,
    params: &ChatParams,
    device: &Device,
) -> Result<ChatResult> {
    // Build prompt from messages using ChatML format
    let prompt = build_chatml_prompt(&params.messages, params.system_prompt.as_deref());
    
    println!("[TextGen] Chat prompt length: {} chars", prompt.len());
    
    // Load model
    let mut generator = TextGenerator::load(model_path, device)?;
    
    // Generate
    let (response, prompt_tokens, completion_tokens) = generator.generate(
        &prompt,
        params.max_tokens as usize,
        params.temperature as f64,
        params.top_p as f64,
        42, // seed
    )?;
    
    // Clean up response (remove any trailing special tokens)
    let content = clean_response(&response);
    
    Ok(ChatResult {
        message: ChatMessage {
            role: "assistant".to_string(),
            content: content.clone(),
        },
        content,
        model: model_path.file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "unknown".to_string()),
        usage: UsageStats {
            prompt_tokens: prompt_tokens as u32,
            completion_tokens: completion_tokens as u32,
            total_tokens: (prompt_tokens + completion_tokens) as u32,
        },
    })
}

/// Build ChatML format prompt
fn build_chatml_prompt(messages: &[ChatMessage], system_prompt: Option<&str>) -> String {
    let mut prompt = String::new();
    
    // Add system prompt if provided
    if let Some(system) = system_prompt {
        prompt.push_str("<|im_start|>system\n");
        prompt.push_str(system);
        prompt.push_str("<|im_end|>\n");
    }
    
    // Add conversation messages
    for msg in messages {
        prompt.push_str("<|im_start|>");
        prompt.push_str(&msg.role);
        prompt.push('\n');
        prompt.push_str(&msg.content);
        prompt.push_str("<|im_end|>\n");
    }
    
    // Add assistant prefix for generation
    prompt.push_str("<|im_start|>assistant\n");
    
    prompt
}

/// Clean up generated response
fn clean_response(response: &str) -> String {
    let mut cleaned = response.to_string();
    
    // Remove trailing special tokens
    if let Some(pos) = cleaned.find("<|im_end|>") {
        cleaned.truncate(pos);
    }
    if let Some(pos) = cleaned.find("<|endoftext|>") {
        cleaned.truncate(pos);
    }
    
    cleaned.trim().to_string()
}

/// Get recommended small models for download
pub fn get_recommended_models() -> Vec<(&'static str, &'static str, &'static str, u64)> {
    vec![
        // (name, HuggingFace repo, filename, approximate size in bytes)
        (
            "SmolLM2-135M",
            "bartowski/SmolLM2-135M-Instruct-GGUF",
            "SmolLM2-135M-Instruct-Q4_K_M.gguf",
            100_000_000, // ~100MB
        ),
        (
            "SmolLM2-360M",
            "bartowski/SmolLM2-360M-Instruct-GGUF",
            "SmolLM2-360M-Instruct-Q4_K_M.gguf",
            250_000_000, // ~250MB
        ),
        (
            "Qwen3-0.6B",
            "Qwen/Qwen3-0.6B-GGUF",
            "qwen3-0_6b-q4_k_m.gguf",
            400_000_000, // ~400MB
        ),
    ]
}
