//! Image captioning using BLIP quantized models

use crate::device::DeviceType;
use crate::error::{LocalAiError, Result};
use crate::text_gen::TokenOutputStream;
use candle_core::{DType, Device, Tensor};
use candle_transformers::generation::LogitsProcessor;
use candle_transformers::models::{blip, quantized_blip};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokenizers::Tokenizer;

/// Configuration for image captioning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageCaptionConfig {
    /// Path to the GGUF model file
    pub model_path: String,
    /// Path to tokenizer.json
    pub tokenizer_path: String,
    /// Random seed
    #[serde(default = "default_seed")]
    pub seed: u64,
    /// Device to use
    #[serde(default)]
    pub device: DeviceType,
}

fn default_seed() -> u64 {
    42
}

/// Image caption result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageCaptionResult {
    /// Generated caption
    pub caption: String,
    /// Number of tokens generated
    pub tokens_generated: usize,
}

/// Load and preprocess image for BLIP model
fn load_image_for_blip<P: AsRef<Path>>(path: P, device: &Device) -> Result<Tensor> {
    let img = image::ImageReader::open(path)?
        .decode()?
        .resize_to_fill(384, 384, image::imageops::FilterType::Triangle);
    let img = img.to_rgb8();
    let data = img.into_raw();
    let data = Tensor::from_vec(data, (384, 384, 3), &Device::Cpu)?.permute((2, 0, 1))?;

    let mean =
        Tensor::new(&[0.48145466f32, 0.4578275, 0.40821073], &Device::Cpu)?.reshape((3, 1, 1))?;
    let std =
        Tensor::new(&[0.26862954f32, 0.26130258, 0.27577711], &Device::Cpu)?.reshape((3, 1, 1))?;

    let normalized = (data.to_dtype(DType::F32)? / 255.)?
        .broadcast_sub(&mean)?
        .broadcast_div(&std)?;

    normalized.to_device(device).map_err(Into::into)
}

/// Image captioner using BLIP
pub struct ImageCaptioner {
    model: quantized_blip::BlipForConditionalGeneration,
    tokenizer: Tokenizer,
    device: Device,
    seed: u64,
}

impl ImageCaptioner {
    /// Create a new image captioner
    pub fn new(config: ImageCaptionConfig) -> Result<Self> {
        let device = config.device.to_device()?;

        // Load tokenizer
        let tokenizer = Tokenizer::from_file(&config.tokenizer_path)
            .map_err(|e| LocalAiError::Tokenizer(e.to_string()))?;

        // Load config and model
        let blip_config = blip::Config::image_captioning_large();
        let vb = quantized_blip::VarBuilder::from_gguf(&config.model_path, &device)?;
        let model = quantized_blip::BlipForConditionalGeneration::new(&blip_config, vb)?;

        Ok(Self {
            model,
            tokenizer,
            device,
            seed: config.seed,
        })
    }

    /// Generate a caption for an image
    pub fn caption<P: AsRef<Path>>(&mut self, image_path: P) -> Result<ImageCaptionResult> {
        let image = load_image_for_blip(image_path, &self.device)?;

        // Get image embeddings
        let image_embeds = image.unsqueeze(0)?.apply(self.model.vision_model())?;

        let mut logits_processor = LogitsProcessor::new(self.seed, None, None);
        let mut token_ids = vec![30522u32]; // BOS token
        const SEP_TOKEN_ID: u32 = 102;

        let mut tos = TokenOutputStream::new(self.tokenizer.clone());
        let mut caption = String::new();

        // Generate caption
        for index in 0..100 {
            let context_size = if index > 0 { 1 } else { token_ids.len() };
            let start_pos = token_ids.len().saturating_sub(context_size);
            let input_ids = Tensor::new(&token_ids[start_pos..], &self.device)?.unsqueeze(0)?;

            let logits = self.model.text_decoder().forward(&input_ids, &image_embeds)?;
            let logits = logits.squeeze(0)?;
            let logits = logits.get(logits.dim(0)? - 1)?;

            let token = logits_processor.sample(&logits)?;
            if token == SEP_TOKEN_ID {
                break;
            }

            token_ids.push(token);
            if let Some(t) = tos.next_token(token)? {
                caption.push_str(&t);
            }
        }

        if let Some(rest) = tos.decode_rest()? {
            caption.push_str(&rest);
        }

        Ok(ImageCaptionResult {
            caption,
            tokens_generated: token_ids.len() - 1, // Exclude BOS token
        })
    }
}

/// Simple function to caption an image (creates a temporary captioner)
pub fn caption_image(
    model_path: &str,
    tokenizer_path: &str,
    image_path: &str,
    device: DeviceType,
) -> Result<ImageCaptionResult> {
    let config = ImageCaptionConfig {
        model_path: model_path.to_string(),
        tokenizer_path: tokenizer_path.to_string(),
        seed: 42,
        device,
    };

    let mut captioner = ImageCaptioner::new(config)?;
    captioner.caption(image_path)
}
