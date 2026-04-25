//! Text embeddings using BERT-family models (sentence-transformers, etc.)
//!
//! Works with any HF BERT-compatible model provided as three local files:
//! config.json, tokenizer.json, and model.safetensors. The install-model flow
//! downloads these files ahead of time, so this module never touches the network.

use crate::device::DeviceType;
use crate::error::{LocalAiError, Result};
use candle_core::{DType, Device, IndexOp, Tensor};
use candle_nn::VarBuilder;
use candle_transformers::models::bert::{BertModel, Config as BertConfig, HiddenAct, DTYPE as BERT_DTYPE};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokenizers::{PaddingParams, PaddingStrategy, Tokenizer};

/// Configuration for text embeddings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbedConfig {
    pub model_path: String,
    pub tokenizer_path: String,
    pub config_path: String,
    #[serde(default = "default_true")]
    pub normalize: bool,
    #[serde(default = "default_true")]
    pub mean_pool: bool,
    #[serde(default)]
    pub device: DeviceType,
}

fn default_true() -> bool {
    true
}

/// Result of an embedding call
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbedResult {
    pub embeddings: Vec<Vec<f32>>,
    pub dimensions: usize,
    pub device_used: String,
}

pub struct TextEmbedder {
    model: BertModel,
    tokenizer: Tokenizer,
    device: Device,
    device_name: String,
    dimensions: usize,
    normalize: bool,
    mean_pool: bool,
}

impl TextEmbedder {
    pub fn new(cfg: EmbedConfig) -> Result<Self> {
        let device = cfg.device.to_device()?;
        let device_name = match &device {
            Device::Cpu => "cpu".to_string(),
            Device::Cuda(_) => "cuda".to_string(),
            Device::Metal(_) => "metal".to_string(),
        };

        let config_str = std::fs::read_to_string(&cfg.config_path)?;
        let mut bert_cfg: BertConfig = serde_json::from_str(&config_str)?;
        bert_cfg.hidden_act = HiddenAct::GeluApproximate;

        let mut tokenizer = Tokenizer::from_file(&cfg.tokenizer_path)
            .map_err(|e| LocalAiError::Tokenizer(e.to_string()))?;
        let pad_id = tokenizer.get_padding().map(|p| p.pad_id).unwrap_or(0);
        let pad_token = tokenizer
            .get_padding()
            .map(|p| p.pad_token.clone())
            .unwrap_or_else(|| "[PAD]".to_string());
        tokenizer.with_padding(Some(PaddingParams {
            strategy: PaddingStrategy::BatchLongest,
            pad_id,
            pad_token,
            ..Default::default()
        }));

        let model_path = Path::new(&cfg.model_path);
        let vb = if model_path.extension().and_then(|s| s.to_str()) == Some("safetensors") {
            unsafe {
                VarBuilder::from_mmaped_safetensors(&[model_path.to_path_buf()], BERT_DTYPE, &device)?
            }
        } else {
            VarBuilder::from_pth(model_path, BERT_DTYPE, &device)?
        };

        let model = BertModel::load(vb, &bert_cfg)?;
        let dimensions = bert_cfg.hidden_size;

        Ok(Self {
            model,
            tokenizer,
            device,
            device_name,
            dimensions,
            normalize: cfg.normalize,
            mean_pool: cfg.mean_pool,
        })
    }

    pub fn dimensions(&self) -> usize {
        self.dimensions
    }

    pub fn device_name(&self) -> &str {
        &self.device_name
    }

    /// Embed a batch of texts into a (n, hidden) matrix.
    pub fn embed(&self, texts: &[&str]) -> Result<EmbedResult> {
        if texts.is_empty() {
            return Ok(EmbedResult {
                embeddings: Vec::new(),
                dimensions: self.dimensions,
                device_used: self.device_name.clone(),
            });
        }

        let encodings = self
            .tokenizer
            .encode_batch(texts.to_vec(), true)
            .map_err(|e| LocalAiError::Tokenizer(e.to_string()))?;

        let n = encodings.len();
        let seq_len = encodings.iter().map(|e| e.get_ids().len()).max().unwrap_or(0);
        let mut ids_flat: Vec<u32> = Vec::with_capacity(n * seq_len);
        let mut mask_flat: Vec<u32> = Vec::with_capacity(n * seq_len);
        for enc in &encodings {
            ids_flat.extend_from_slice(enc.get_ids());
            mask_flat.extend_from_slice(enc.get_attention_mask());
        }

        let token_ids = Tensor::from_vec(ids_flat, (n, seq_len), &self.device)?;
        let attention_mask = Tensor::from_vec(mask_flat, (n, seq_len), &self.device)?;
        let token_type_ids = token_ids.zeros_like()?;

        let hidden_states = self
            .model
            .forward(&token_ids, &token_type_ids, Some(&attention_mask))?;

        let pooled = if self.mean_pool {
            let mask_f = attention_mask.to_dtype(DType::F32)?.unsqueeze(2)?;
            let masked = hidden_states.broadcast_mul(&mask_f)?;
            let summed = masked.sum(1)?;
            let counts = mask_f.sum(1)?.clamp(1e-9f64, f64::INFINITY)?;
            summed.broadcast_div(&counts)?
        } else {
            hidden_states.i((.., 0))?
        };

        let pooled = if self.normalize {
            let norm = pooled
                .sqr()?
                .sum_keepdim(1)?
                .sqrt()?
                .clamp(1e-12f64, f64::INFINITY)?;
            pooled.broadcast_div(&norm)?
        } else {
            pooled
        };

        let embeddings: Vec<Vec<f32>> = pooled.to_vec2::<f32>()?;

        Ok(EmbedResult {
            embeddings,
            dimensions: self.dimensions,
            device_used: self.device_name.clone(),
        })
    }
}

/// Convenience: build a temporary embedder and embed a batch of texts.
pub fn embed_texts(
    model_path: &str,
    tokenizer_path: &str,
    config_path: &str,
    texts: &[&str],
    normalize: bool,
    mean_pool: bool,
    device: DeviceType,
) -> Result<EmbedResult> {
    let embedder = TextEmbedder::new(EmbedConfig {
        model_path: model_path.to_string(),
        tokenizer_path: tokenizer_path.to_string(),
        config_path: config_path.to_string(),
        normalize,
        mean_pool,
        device,
    })?;
    embedder.embed(texts)
}
