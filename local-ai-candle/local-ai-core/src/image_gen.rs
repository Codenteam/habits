//! Image generation using Stable Diffusion 1.5

use crate::device::DeviceType;
use crate::error::{LocalAiError, Result};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use candle_core::{DType, Device, IndexOp, Module, Tensor};
use candle_transformers::models::stable_diffusion;
use image::ImageEncoder;
use serde::{Deserialize, Serialize};
use std::io::Cursor;
use std::path::Path;
use tokenizers::Tokenizer;

const VAE_SCALE: f64 = 0.18215;

/// Configuration for image generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageGenConfig {
    /// Path to UNet weights (.safetensors)
    pub unet_path: String,
    /// Path to VAE weights (.safetensors)
    pub vae_path: String,
    /// Path to CLIP text encoder weights (.safetensors)
    pub clip_path: String,
    /// Path to tokenizer.json
    pub tokenizer_path: String,
    /// Image height (must be multiple of 8)
    #[serde(default = "default_size")]
    pub height: usize,
    /// Image width (must be multiple of 8)
    #[serde(default = "default_size")]
    pub width: usize,
    /// Number of diffusion steps
    #[serde(default = "default_steps")]
    pub steps: usize,
    /// Guidance scale
    #[serde(default = "default_guidance")]
    pub guidance_scale: f64,
    /// Random seed
    #[serde(default = "default_seed")]
    pub seed: u64,
    /// Device to use
    #[serde(default)]
    pub device: DeviceType,
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
fn default_seed() -> u64 {
    42
}

/// Image generation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageGenResult {
    /// Path where image was saved (if saved)
    pub output_path: Option<String>,
    /// Image dimensions
    pub width: usize,
    pub height: usize,
    /// Number of steps performed
    pub steps: usize,
}

/// Image generation result with base64 data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageGenBase64Result {
    /// Base64-encoded PNG data URL 
    pub base64_data: String,
    /// Image dimensions
    pub width: usize,
    pub height: usize,
    /// Number of steps performed
    pub steps: usize,
}

/// Save tensor as image
fn save_image<P: AsRef<Path>>(img: &Tensor, p: P) -> Result<()> {
    let p = p.as_ref();
    let (channel, height, width) = img.dims3()?;
    if channel != 3 {
        return Err(LocalAiError::Image(
            "save_image expects an input of shape (3, height, width)".to_string(),
        ));
    }
    let img = img.permute((1, 2, 0))?.flatten_all()?;
    let pixels = img.to_vec1::<u8>()?;
    let image: image::ImageBuffer<image::Rgb<u8>, Vec<u8>> =
        match image::ImageBuffer::from_raw(width as u32, height as u32, pixels) {
            Some(image) => image,
            None => {
                return Err(LocalAiError::Image(format!(
                    "error creating image buffer for {:?}",
                    p
                )))
            }
        };
    image
        .save(p)
        .map_err(|e| LocalAiError::Image(format!("failed to save image: {e}")))?;
    Ok(())
}

/// Convert tensor to base64-encoded PNG data URL
fn tensor_to_base64_png(img: &Tensor) -> Result<String> {
    let (channel, height, width) = img.dims3()?;
    if channel != 3 {
        return Err(LocalAiError::Image(
            "tensor_to_base64_png expects an input of shape (3, height, width)".to_string(),
        ));
    }
    let img = img.permute((1, 2, 0))?.flatten_all()?;
    let pixels = img.to_vec1::<u8>()?;
    let image: image::ImageBuffer<image::Rgb<u8>, Vec<u8>> =
        match image::ImageBuffer::from_raw(width as u32, height as u32, pixels) {
            Some(image) => image,
            None => {
                return Err(LocalAiError::Image(
                    "error creating image buffer for base64".to_string(),
                ))
            }
        };

    // Encode as PNG to memory buffer
    let mut buffer = Cursor::new(Vec::new());
    let encoder = image::codecs::png::PngEncoder::new(&mut buffer);
    encoder
        .write_image(&image, width as u32, height as u32, image::ExtendedColorType::Rgb8)
        .map_err(|e| LocalAiError::Image(format!("failed to encode PNG: {e}")))?;

    let base64_data = BASE64.encode(buffer.get_ref());
    Ok(format!("data:image/png;base64,{}", base64_data))
}

/// Progress callback for image generation
pub type ProgressCallback = Box<dyn FnMut(usize, usize) + Send>;

/// Image generator using Stable Diffusion
pub struct ImageGenerator {
    config: ImageGenConfig,
    device: Device,
    sd_config: stable_diffusion::StableDiffusionConfig,
}

impl ImageGenerator {
    /// Create a new image generator
    pub fn new(config: ImageGenConfig) -> Result<Self> {
        let device = config.device.to_device()?;
        let sd_config =
            stable_diffusion::StableDiffusionConfig::v1_5(None, Some(config.height), Some(config.width));

        Ok(Self {
            config,
            device,
            sd_config,
        })
    }

    /// Generate an image from a text prompt
    pub fn generate<P: AsRef<Path>>(
        &self,
        prompt: &str,
        uncond_prompt: &str,
        output_path: P,
    ) -> Result<ImageGenResult> {
        self.generate_with_progress(prompt, uncond_prompt, output_path, None)
    }

    /// Generate an image with progress callback
    pub fn generate_with_progress<P: AsRef<Path>>(
        &self,
        prompt: &str,
        uncond_prompt: &str,
        output_path: P,
        mut progress_callback: Option<ProgressCallback>,
    ) -> Result<ImageGenResult> {
        let dtype = DType::F32;
        let use_guide_scale = self.config.guidance_scale > 1.0;

        // Build text embeddings
        let tokenizer = Tokenizer::from_file(&self.config.tokenizer_path)
            .map_err(|e| LocalAiError::Tokenizer(e.to_string()))?;

        let pad_id = match &self.sd_config.clip.pad_with {
            Some(padding) => *tokenizer.get_vocab(true).get(padding.as_str()).unwrap(),
            None => *tokenizer.get_vocab(true).get("<|endoftext|>").unwrap(),
        };

        let mut tokens = tokenizer
            .encode(prompt, true)
            .map_err(|e| LocalAiError::Tokenizer(e.to_string()))?
            .get_ids()
            .to_vec();
        while tokens.len() < self.sd_config.clip.max_position_embeddings {
            tokens.push(pad_id)
        }
        let tokens = Tensor::new(tokens.as_slice(), &self.device)?.unsqueeze(0)?;

        let text_model = stable_diffusion::build_clip_transformer(
            &self.sd_config.clip,
            &self.config.clip_path,
            &self.device,
            dtype,
        )?;
        let text_embeddings = text_model.forward(&tokens)?;

        let text_embeddings = if use_guide_scale {
            let mut uncond_tokens = tokenizer
                .encode(uncond_prompt, true)
                .map_err(|e| LocalAiError::Tokenizer(e.to_string()))?
                .get_ids()
                .to_vec();
            while uncond_tokens.len() < self.sd_config.clip.max_position_embeddings {
                uncond_tokens.push(pad_id)
            }
            let uncond_tokens = Tensor::new(uncond_tokens.as_slice(), &self.device)?.unsqueeze(0)?;
            let uncond_embeddings = text_model.forward(&uncond_tokens)?;
            Tensor::cat(&[uncond_embeddings, text_embeddings], 0)?
        } else {
            text_embeddings
        };

        // Build UNet
        let unet =
            self.sd_config
                .build_unet(&self.config.unet_path, &self.device, 4, false, dtype)?;

        // Build VAE
        let vae = self
            .sd_config
            .build_vae(&self.config.vae_path, &self.device, dtype)?;

        // Build scheduler
        let mut scheduler = self.sd_config.build_scheduler(self.config.steps)?;
        let timesteps = scheduler.timesteps().to_vec();

        // Initialize latents
        let latent_height = self.config.height / 8;
        let latent_width = self.config.width / 8;
        let mut latents =
            Tensor::randn(0f32, 1f32, (1, 4, latent_height, latent_width), &self.device)?;
        latents = (latents * scheduler.init_noise_sigma())?;

        // Diffusion loop
        for (i, &t) in timesteps.iter().enumerate() {
            let latent_model_input = if use_guide_scale {
                Tensor::cat(&[&latents, &latents], 0)?
            } else {
                latents.clone()
            };

            let latent_model_input = scheduler.scale_model_input(latent_model_input, t)?;
            let noise_pred = unet.forward(&latent_model_input, t as f64, &text_embeddings)?;

            let noise_pred = if use_guide_scale {
                let noise_pred = noise_pred.chunk(2, 0)?;
                let (noise_pred_uncond, noise_pred_text) = (&noise_pred[0], &noise_pred[1]);
                (noise_pred_uncond
                    + ((noise_pred_text - noise_pred_uncond)? * self.config.guidance_scale)?)?
            } else {
                noise_pred
            };

            latents = scheduler.step(&noise_pred, t, &latents)?;

            if let Some(ref mut callback) = progress_callback {
                callback(i + 1, self.config.steps);
            }
        }

        // Decode latents to image
        let scaled_latents = (latents / VAE_SCALE)?;
        let image = vae.decode(&scaled_latents)?;
        let image = ((image / 2.)? + 0.5)?;
        let image = (image.clamp(0f32, 1f32)? * 255.)?
            .to_dtype(DType::U8)?
            .i(0)?;

        let output_path = output_path.as_ref();
        save_image(&image, output_path)?;

        Ok(ImageGenResult {
            output_path: Some(output_path.to_string_lossy().to_string()),
            width: self.config.width,
            height: self.config.height,
            steps: self.config.steps,
        })
    }

    /// Generate an image and return as base64 data URL
    pub fn generate_base64(
        &self,
        prompt: &str,
        uncond_prompt: &str,
    ) -> Result<ImageGenBase64Result> {
        self.generate_base64_with_progress(prompt, uncond_prompt, None)
    }

    /// Generate an image as base64 with progress callback
    pub fn generate_base64_with_progress(
        &self,
        prompt: &str,
        uncond_prompt: &str,
        mut progress_callback: Option<ProgressCallback>,
    ) -> Result<ImageGenBase64Result> {
        let dtype = DType::F32;
        let use_guide_scale = self.config.guidance_scale > 1.0;

        // Build text embeddings
        let tokenizer = Tokenizer::from_file(&self.config.tokenizer_path)
            .map_err(|e| LocalAiError::Tokenizer(e.to_string()))?;

        let pad_id = match &self.sd_config.clip.pad_with {
            Some(padding) => *tokenizer.get_vocab(true).get(padding.as_str()).unwrap(),
            None => *tokenizer.get_vocab(true).get("<|endoftext|>").unwrap(),
        };

        let mut tokens = tokenizer
            .encode(prompt, true)
            .map_err(|e| LocalAiError::Tokenizer(e.to_string()))?
            .get_ids()
            .to_vec();
        while tokens.len() < self.sd_config.clip.max_position_embeddings {
            tokens.push(pad_id)
        }
        let tokens = Tensor::new(tokens.as_slice(), &self.device)?.unsqueeze(0)?;

        let text_model = stable_diffusion::build_clip_transformer(
            &self.sd_config.clip,
            &self.config.clip_path,
            &self.device,
            dtype,
        )?;
        let text_embeddings = text_model.forward(&tokens)?;

        let text_embeddings = if use_guide_scale {
            let mut uncond_tokens = tokenizer
                .encode(uncond_prompt, true)
                .map_err(|e| LocalAiError::Tokenizer(e.to_string()))?
                .get_ids()
                .to_vec();
            while uncond_tokens.len() < self.sd_config.clip.max_position_embeddings {
                uncond_tokens.push(pad_id)
            }
            let uncond_tokens = Tensor::new(uncond_tokens.as_slice(), &self.device)?.unsqueeze(0)?;
            let uncond_embeddings = text_model.forward(&uncond_tokens)?;
            Tensor::cat(&[uncond_embeddings, text_embeddings], 0)?
        } else {
            text_embeddings
        };

        // Build UNet
        let unet =
            self.sd_config
                .build_unet(&self.config.unet_path, &self.device, 4, false, dtype)?;

        // Build VAE
        let vae = self
            .sd_config
            .build_vae(&self.config.vae_path, &self.device, dtype)?;

        // Build scheduler
        let mut scheduler = self.sd_config.build_scheduler(self.config.steps)?;
        let timesteps = scheduler.timesteps().to_vec();

        // Initialize latents
        let latent_height = self.config.height / 8;
        let latent_width = self.config.width / 8;
        let mut latents =
            Tensor::randn(0f32, 1f32, (1, 4, latent_height, latent_width), &self.device)?;
        latents = (latents * scheduler.init_noise_sigma())?;

        // Diffusion loop
        for (i, &t) in timesteps.iter().enumerate() {
            let latent_model_input = if use_guide_scale {
                Tensor::cat(&[&latents, &latents], 0)?
            } else {
                latents.clone()
            };

            let latent_model_input = scheduler.scale_model_input(latent_model_input, t)?;
            let noise_pred = unet.forward(&latent_model_input, t as f64, &text_embeddings)?;

            let noise_pred = if use_guide_scale {
                let noise_pred = noise_pred.chunk(2, 0)?;
                let (noise_pred_uncond, noise_pred_text) = (&noise_pred[0], &noise_pred[1]);
                (noise_pred_uncond
                    + ((noise_pred_text - noise_pred_uncond)? * self.config.guidance_scale)?)?
            } else {
                noise_pred
            };

            latents = scheduler.step(&noise_pred, t, &latents)?;

            if let Some(ref mut callback) = progress_callback {
                callback(i + 1, self.config.steps);
            }
        }

        // Decode latents to image
        let scaled_latents = (latents / VAE_SCALE)?;
        let image = vae.decode(&scaled_latents)?;
        let image = ((image / 2.)? + 0.5)?;
        let image = (image.clamp(0f32, 1f32)? * 255.)?
            .to_dtype(DType::U8)?
            .i(0)?;

        let base64_data = tensor_to_base64_png(&image)?;

        Ok(ImageGenBase64Result {
            base64_data,
            width: self.config.width,
            height: self.config.height,
            steps: self.config.steps,
        })
    }
}

/// Simple function to generate an image (creates a temporary generator)
pub fn generate_image(
    prompt: &str,
    uncond_prompt: &str,
    unet_path: &str,
    vae_path: &str,
    clip_path: &str,
    tokenizer_path: &str,
    output_path: &str,
    height: usize,
    width: usize,
    steps: usize,
    guidance_scale: f64,
    seed: u64,
    device: DeviceType,
) -> Result<ImageGenResult> {
    let config = ImageGenConfig {
        unet_path: unet_path.to_string(),
        vae_path: vae_path.to_string(),
        clip_path: clip_path.to_string(),
        tokenizer_path: tokenizer_path.to_string(),
        height,
        width,
        steps,
        guidance_scale,
        seed,
        device,
    };

    let generator = ImageGenerator::new(config)?;
    generator.generate(prompt, uncond_prompt, output_path)
}

/// Simple function to generate an image as base64 (creates a temporary generator)
pub fn generate_image_base64(
    prompt: &str,
    uncond_prompt: &str,
    unet_path: &str,
    vae_path: &str,
    clip_path: &str,
    tokenizer_path: &str,
    height: usize,
    width: usize,
    steps: usize,
    guidance_scale: f64,
    seed: u64,
    device: DeviceType,
) -> Result<ImageGenBase64Result> {
    let config = ImageGenConfig {
        unet_path: unet_path.to_string(),
        vae_path: vae_path.to_string(),
        clip_path: clip_path.to_string(),
        tokenizer_path: tokenizer_path.to_string(),
        height,
        width,
        steps,
        guidance_scale,
        seed,
        device,
    };

    let generator = ImageGenerator::new(config)?;
    generator.generate_base64(prompt, uncond_prompt)
}
