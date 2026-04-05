use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

use crate::error::{Error, Result};
use crate::models::*;

use candle_core::{Device, Tensor};
use candle_transformers::models::stable_diffusion;
use image::{ImageBuffer, Rgb};
use rand::Rng;

/// Manages Stable Diffusion models and generation
pub struct DiffusionManager {
    /// Loaded SD pipelines (model path -> pipeline)
    pipelines: Mutex<HashMap<String, StableDiffusionPipeline>>,
    /// Models directory
    models_dir: PathBuf,
    /// Device for inference
    device: Device,
}

/// A loaded Stable Diffusion pipeline
struct StableDiffusionPipeline {
    // Note: Full implementation would include:
    // - CLIP text encoder
    // - UNet
    // - VAE decoder
    // - Scheduler
    // For now, this is a placeholder for the scaffold
    _model_path: String,
}

impl DiffusionManager {
    pub fn new(models_dir: PathBuf) -> Self {
        // Select best available device
        let device = Self::get_best_device();
        
        Self {
            pipelines: Mutex::new(HashMap::new()),
            models_dir,
            device,
        }
    }
    
    /// Get the best available compute device
    fn get_best_device() -> Device {
        // Try Metal on macOS
        #[cfg(target_os = "macos")]
        {
            if let Ok(device) = Device::new_metal(0) {
                println!("[Diffusion] Using Metal GPU acceleration");
                return device;
            }
        }
        
        // Try CUDA on Linux/Windows
        #[cfg(feature = "cuda")]
        {
            if let Ok(device) = Device::new_cuda(0) {
                println!("[Diffusion] Using CUDA GPU acceleration");
                return device;
            }
        }
        
        // Fall back to CPU
        println!("[Diffusion] Using CPU (no GPU acceleration available)");
        Device::Cpu
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
    
    /// List available diffusion models
    pub fn list_models(&self) -> Result<Vec<DiffusionModelInfo>> {
        let mut models = Vec::new();
        
        if !self.models_dir.exists() {
            return Ok(models);
        }
        
        for entry in std::fs::read_dir(&self.models_dir)? {
            let entry = entry?;
            let path = entry.path();
            
            // Check for model files (.safetensors, .gguf, or directories)
            let is_model = path.extension().map_or(false, |e| {
                e == "safetensors" || e == "gguf"
            }) || (path.is_dir() && path.join("model_index.json").exists());
            
            if is_model {
                let name = path.file_name()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_default();
                
                let size = if path.is_file() {
                    Some(std::fs::metadata(&path)?.len())
                } else {
                    None
                };
                
                // Detect model type from name
                let model_type = if name.to_lowercase().contains("sdxl") {
                    "sdxl"
                } else if name.to_lowercase().contains("flux") {
                    "flux"
                } else {
                    "sd15"
                }.to_string();
                
                models.push(DiffusionModelInfo {
                    id: name.clone(),
                    name: name.replace('-', " ").replace('_', " "),
                    path: Some(path.to_string_lossy().to_string()),
                    size,
                    model_type,
                });
            }
        }
        
        Ok(models)
    }
    
    /// Generate an image from a text prompt
    pub fn generate(&mut self, params: &GenerateImageParams) -> Result<GenerateImageResult> {
        let model_path = PathBuf::from(&params.model_path);
        
        // Validate model exists
        if !model_path.exists() {
            return Err(Error::Model(format!("Model not found: {}", params.model_path)));
        }
        
        // Generate or use provided seed
        let seed = params.seed.unwrap_or_else(|| {
            let mut rng = rand::thread_rng();
            rng.gen()
        });
        
        println!("[Diffusion] Generating image: {}x{}, steps={}, cfg={}, seed={}",
            params.width, params.height, params.steps, params.guidance_scale, seed);
        println!("[Diffusion] Prompt: {}", &params.prompt[..params.prompt.len().min(80)]);
        
        // TODO: Implement full Candle-based SD pipeline
        // For now, return a placeholder indicating the scaffold is ready
        // Full implementation would:
        // 1. Load/cache the model components (CLIP, UNet, VAE)
        // 2. Encode the text prompt with CLIP
        // 3. Run the diffusion loop with UNet
        // 4. Decode latents with VAE
        // 5. Convert to image
        
        // Placeholder: Generate a gradient test image
        let width = params.width;
        let height = params.height;
        let mut img: ImageBuffer<Rgb<u8>, Vec<u8>> = ImageBuffer::new(width, height);
        
        for (x, y, pixel) in img.enumerate_pixels_mut() {
            let r = ((x as f32 / width as f32) * 255.0) as u8;
            let g = ((y as f32 / height as f32) * 255.0) as u8;
            let b = ((seed % 256) as u8);
            *pixel = Rgb([r, g, b]);
        }
        
        // Encode to PNG
        let mut png_data = Vec::new();
        {
            use image::codecs::png::PngEncoder;
            use image::ImageEncoder;
            let encoder = PngEncoder::new(&mut png_data);
            encoder.write_image(
                img.as_raw(),
                width,
                height,
                image::ExtendedColorType::Rgb8,
            ).map_err(|e| Error::Image(format!("PNG encoding failed: {}", e)))?;
        }
        
        let result = if params.response_format == "url" {
            // Save to file and return path
            let output_dir = dirs::cache_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join("habits")
                .join("diffusion_output");
            std::fs::create_dir_all(&output_dir)?;
            
            let filename = format!("sd-{}-{}.png", chrono_timestamp(), seed);
            let filepath = output_dir.join(&filename);
            std::fs::write(&filepath, &png_data)?;
            
            GenerateImageResult {
                images: vec![GeneratedImage {
                    b64_json: None,
                    url: Some(format!("file://{}", filepath.display())),
                    revised_prompt: Some(params.prompt.clone()),
                }],
                seed,
                model: model_path.file_name()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_default(),
            }
        } else {
            // Return as base64
            let b64 = base64::Engine::encode(
                &base64::engine::general_purpose::STANDARD,
                &png_data,
            );
            
            GenerateImageResult {
                images: vec![GeneratedImage {
                    b64_json: Some(b64),
                    url: None,
                    revised_prompt: Some(params.prompt.clone()),
                }],
                seed,
                model: model_path.file_name()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_default(),
            }
        };
        
        Ok(result)
    }
    
    /// Unload all models to free memory
    pub fn unload_all(&self) -> Result<()> {
        let mut pipelines = self.pipelines.lock().unwrap();
        pipelines.clear();
        println!("[Diffusion] All models unloaded");
        Ok(())
    }
}

/// Get a simple timestamp for filenames
fn chrono_timestamp() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

impl Clone for DiffusionManager {
    fn clone(&self) -> Self {
        Self {
            pipelines: Mutex::new(HashMap::new()),
            models_dir: self.models_dir.clone(),
            device: Device::Cpu, // Default to CPU for clones
        }
    }
}

unsafe impl Send for DiffusionManager {}
unsafe impl Sync for DiffusionManager {}
