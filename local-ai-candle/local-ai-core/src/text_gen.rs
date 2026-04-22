//! Text generation using quantized GGUF models (Qwen2, Gemma3, etc.)

use crate::device::DeviceType;
use crate::error::{LocalAiError, Result};
use candle_core::quantized::gguf_file;
use candle_core::quantized::tokenizer::TokenizerFromGguf;
use candle_core::{Device, Tensor};
use candle_transformers::generation::{LogitsProcessor, Sampling};
use candle_transformers::models::quantized_qwen2::ModelWeights as Qwen2;
use candle_transformers::models::quantized_gemma3::ModelWeights as Gemma3;
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokenizers::Tokenizer;

/// Supported model types for text generation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum ModelType {
    /// Qwen2 models (default)
    #[default]
    Qwen2,
    /// Gemma 3 models
    Gemma3,
    /// Llama models (same format as Qwen2 with ChatML)
    Llama,
}

/// Wrapper enum to hold different model architectures
enum ModelWeights {
    Qwen2(Qwen2),
    Gemma3(Gemma3),
}

impl ModelWeights {
    fn forward(&mut self, input: &Tensor, index_pos: usize) -> candle_core::Result<Tensor> {
        match self {
            ModelWeights::Qwen2(m) => m.forward(input, index_pos),
            ModelWeights::Gemma3(m) => m.forward(input, index_pos),
        }
    }
}

/// Configuration for text generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextGenConfig {
    /// Path to the GGUF model file
    pub model_path: String,
    /// Path to tokenizer.json
    pub tokenizer_path: String,
    /// Maximum tokens to generate
    #[serde(default = "default_max_tokens")]
    pub max_tokens: usize,
    /// Temperature (0 = greedy)
    #[serde(default = "default_temperature")]
    pub temperature: f64,
    /// Random seed
    #[serde(default = "default_seed")]
    pub seed: u64,
    /// Device to use
    #[serde(default)]
    pub device: DeviceType,
    /// Model type (auto-detected if not specified)
    #[serde(default)]
    pub model_type: ModelType,
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

/// Token output stream for streaming text generation
pub struct TokenOutputStream {
    tokenizer: Tokenizer,
    tokens: Vec<u32>,
    prev_index: usize,
    current_index: usize,
}

impl TokenOutputStream {
    pub fn new(tokenizer: Tokenizer) -> Self {
        Self {
            tokenizer,
            tokens: Vec::new(),
            prev_index: 0,
            current_index: 0,
        }
    }

    fn decode(&self, tokens: &[u32]) -> Result<String> {
        self.tokenizer
            .decode(tokens, true)
            .map_err(|e| LocalAiError::Tokenizer(format!("cannot decode: {e}")))
    }

    pub fn next_token(&mut self, token: u32) -> Result<Option<String>> {
        let prev_text = if self.tokens.is_empty() {
            String::new()
        } else {
            self.decode(&self.tokens[self.prev_index..self.current_index])?
        };
        self.tokens.push(token);
        let text = self.decode(&self.tokens[self.prev_index..])?;
        if text.len() > prev_text.len() && text.chars().last().unwrap().is_alphanumeric() {
            let text = text.split_at(prev_text.len());
            self.prev_index = self.current_index;
            self.current_index = self.tokens.len();
            Ok(Some(text.1.to_string()))
        } else {
            Ok(None)
        }
    }

    pub fn decode_rest(&self) -> Result<Option<String>> {
        let prev_text = if self.tokens.is_empty() {
            String::new()
        } else {
            self.decode(&self.tokens[self.prev_index..self.current_index])?
        };
        let text = self.decode(&self.tokens[self.prev_index..])?;
        if text.len() > prev_text.len() {
            let text = text.split_at(prev_text.len());
            Ok(Some(text.1.to_string()))
        } else {
            Ok(None)
        }
    }

    pub fn tokenizer(&self) -> &Tokenizer {
        &self.tokenizer
    }
}

/// Text generation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextGenResult {
    /// Generated text
    pub text: String,
    /// Number of tokens generated
    pub tokens_generated: usize,
    /// Device used for inference (cpu, metal, cuda)
    pub device_used: String,
}

/// Text generator using Qwen2
pub struct TextGenerator {
    model: ModelWeights,
    model_type: ModelType,
    tos: TokenOutputStream,
    device: Device,
    device_name: String,
    config: TextGenConfig,
    eos_token: u32,
}

/// Detect model type from GGUF metadata
fn detect_model_type(ct: &gguf_file::Content) -> ModelType {
    // Check for model architecture in metadata
    if ct.metadata.contains_key("gemma3.attention.head_count") 
        || ct.metadata.contains_key("gemma2.attention.head_count")
        || ct.metadata.contains_key("gemma.attention.head_count") {
        return ModelType::Gemma3;
    }
    if ct.metadata.contains_key("llama.attention.head_count") {
        return ModelType::Llama;
    }
    // Default to Qwen2
    ModelType::Qwen2
}

impl TextGenerator {
    /// Create a new text generator
    pub fn new(config: TextGenConfig) -> Result<Self> {
        let device = config.device.to_device()?;

        // Determine the actual device name
        let device_name = match &device {
            Device::Cpu => "cpu".to_string(),
            Device::Cuda(_) => "cuda".to_string(),
            Device::Metal(_) => "metal".to_string(),
        };

        // Load model
        let model_path = Path::new(&config.model_path);
        let mut file = std::fs::File::open(model_path)?;
        let model_content =
            gguf_file::Content::read(&mut file).map_err(|e| e.with_path(model_path))?;
        
        // Detect or use specified model type
        let model_type = if config.model_type != ModelType::Qwen2 {
            config.model_type
        } else {
            detect_model_type(&model_content)
        };

        // Load tokenizer - try from file first, then from GGUF metadata
        let tokenizer = if Path::new(&config.tokenizer_path).exists() {
            Tokenizer::from_file(&config.tokenizer_path)
                .map_err(|e| LocalAiError::Tokenizer(e.to_string()))?
        } else {
            // Try to load tokenizer from GGUF file metadata
            Tokenizer::from_gguf(&model_content)
                .map_err(|e| LocalAiError::Tokenizer(format!("Failed to load tokenizer from GGUF: {e}")))?
        };

        // Get EOS token based on model type
        let vocab = tokenizer.get_vocab(true);
        let eos_token = match model_type {
            ModelType::Gemma3 => {
                // Gemma uses <end_of_turn> or token ID 107
                *vocab.get("<end_of_turn>").unwrap_or(&107)
            }
            ModelType::Llama => {
                // Llama uses <|eot_id|> or <|im_end|>
                *vocab.get("<|eot_id|>")
                    .or_else(|| vocab.get("<|im_end|>"))
                    .unwrap_or(&0)
            }
            ModelType::Qwen2 => {
                *vocab.get("<|im_end|>").unwrap_or(&0)
            }
        };

        // Re-open file for model loading (file position was moved by Content::read)
        let mut file = std::fs::File::open(model_path)?;
        let model_content =
            gguf_file::Content::read(&mut file).map_err(|e| e.with_path(model_path))?;

        // Load model weights based on type
        let model = match model_type {
            ModelType::Gemma3 => {
                let m = Gemma3::from_gguf(model_content, &mut file, &device)?;
                ModelWeights::Gemma3(m)
            }
            ModelType::Qwen2 | ModelType::Llama => {
                let m = Qwen2::from_gguf(model_content, &mut file, &device)?;
                ModelWeights::Qwen2(m)
            }
        };

        let tos = TokenOutputStream::new(tokenizer);

        Ok(Self {
            model,
            model_type,
            tos,
            device,
            device_name,
            config,
            eos_token,
        })
    }

    /// Format prompt according to model type
    fn format_prompt(&self, prompt: &str) -> String {
        match self.model_type {
            ModelType::Gemma3 => {
                format!("<start_of_turn>user\n{}<end_of_turn>\n<start_of_turn>model\n", prompt)
            }
            ModelType::Llama => {
                // Llama 3 uses ChatML-like format
                format!("<|im_start|>user\n{}<|im_end|>\n<|im_start|>assistant\n", prompt)
            }
            ModelType::Qwen2 => {
                format!("<|im_start|>user\n{}<|im_end|>\n<|im_start|>assistant\n", prompt)
            }
        }
    }

    /// Generate text from a prompt
    pub fn generate(&mut self, prompt: &str) -> Result<TextGenResult> {
        // Format prompt
        let formatted = self.format_prompt(prompt);
        let tokens = self
            .tos
            .tokenizer()
            .encode(formatted, true)
            .map_err(|e| LocalAiError::Tokenizer(e.to_string()))?;
        let tokens = tokens.get_ids().to_vec();

        // Setup sampler
        let mut logits_processor = {
            let sampling = if self.config.temperature <= 0. {
                Sampling::ArgMax
            } else {
                Sampling::All {
                    temperature: self.config.temperature,
                }
            };
            LogitsProcessor::from_sampling(self.config.seed, sampling)
        };

        // Initial forward pass
        let input = Tensor::new(tokens.as_slice(), &self.device)?.unsqueeze(0)?;
        let logits = self.model.forward(&input, 0)?;
        let logits = logits.squeeze(0)?;
        let mut next_token = logits_processor.sample(&logits)?;

        let mut all_tokens = vec![next_token];
        let mut generated_text = String::new();

        if let Some(t) = self.tos.next_token(next_token)? {
            generated_text.push_str(&t);
        }

        // Generate
        for index in 0..self.config.max_tokens.saturating_sub(1) {
            let input = Tensor::new(&[next_token], &self.device)?.unsqueeze(0)?;
            let logits = self.model.forward(&input, tokens.len() + index)?;
            let logits = logits.squeeze(0)?;

            let start_at = all_tokens.len().saturating_sub(64);
            let logits = candle_transformers::utils::apply_repeat_penalty(
                &logits,
                1.1,
                &all_tokens[start_at..],
            )?;

            next_token = logits_processor.sample(&logits)?;
            all_tokens.push(next_token);

            if let Some(t) = self.tos.next_token(next_token)? {
                generated_text.push_str(&t);
            }

            if next_token == self.eos_token {
                break;
            }
        }

        if let Some(rest) = self.tos.decode_rest()? {
            generated_text.push_str(&rest);
        }

        Ok(TextGenResult {
            text: generated_text,
            tokens_generated: all_tokens.len(),
            device_used: self.device_name.clone(),
        })
    }

    /// Generate text with a callback for streaming tokens
    pub fn generate_with_callback<F>(
        &mut self,
        prompt: &str,
        mut callback: F,
    ) -> Result<TextGenResult>
    where
        F: FnMut(&str),
    {
        // Format prompt
        let formatted = self.format_prompt(prompt);
        let tokens = self
            .tos
            .tokenizer()
            .encode(formatted, true)
            .map_err(|e| LocalAiError::Tokenizer(e.to_string()))?;
        let tokens = tokens.get_ids().to_vec();

        // Setup sampler
        let mut logits_processor = {
            let sampling = if self.config.temperature <= 0. {
                Sampling::ArgMax
            } else {
                Sampling::All {
                    temperature: self.config.temperature,
                }
            };
            LogitsProcessor::from_sampling(self.config.seed, sampling)
        };

        // Initial forward pass
        let input = Tensor::new(tokens.as_slice(), &self.device)?.unsqueeze(0)?;
        let logits = self.model.forward(&input, 0)?;
        let logits = logits.squeeze(0)?;
        let mut next_token = logits_processor.sample(&logits)?;

        let mut all_tokens = vec![next_token];
        let mut generated_text = String::new();

        if let Some(t) = self.tos.next_token(next_token)? {
            generated_text.push_str(&t);
            callback(&t);
        }

        // Generate
        for index in 0..self.config.max_tokens.saturating_sub(1) {
            let input = Tensor::new(&[next_token], &self.device)?.unsqueeze(0)?;
            let logits = self.model.forward(&input, tokens.len() + index)?;
            let logits = logits.squeeze(0)?;

            let start_at = all_tokens.len().saturating_sub(64);
            let logits = candle_transformers::utils::apply_repeat_penalty(
                &logits,
                1.1,
                &all_tokens[start_at..],
            )?;

            next_token = logits_processor.sample(&logits)?;
            all_tokens.push(next_token);

            if let Some(t) = self.tos.next_token(next_token)? {
                generated_text.push_str(&t);
                callback(&t);
            }

            if next_token == self.eos_token {
                break;
            }
        }

        if let Some(rest) = self.tos.decode_rest()? {
            generated_text.push_str(&rest);
            callback(&rest);
        }

        Ok(TextGenResult {
            text: generated_text,
            tokens_generated: all_tokens.len(),
            device_used: self.device_name.clone(),
        })
    }
}

/// Simple function to generate text (creates a temporary generator)
pub fn generate_text(
    model_path: &str,
    tokenizer_path: &str,
    prompt: &str,
    max_tokens: usize,
    temperature: f64,
    seed: u64,
    device: DeviceType,
) -> Result<TextGenResult> {
    let config = TextGenConfig {
        model_path: model_path.to_string(),
        tokenizer_path: tokenizer_path.to_string(),
        max_tokens,
        temperature,
        seed,
        device,
        model_type: ModelType::default(),
    };

    let mut generator = TextGenerator::new(config)?;
    generator.generate(prompt)
}
