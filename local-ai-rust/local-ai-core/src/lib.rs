//! Local AI Core Library
//!
//! Cross-platform AI inference with text generation, image captioning, image generation,
//! audio-to-text (Whisper), and text-to-voice (MetaVoice) using Candle.

pub mod audio;
pub mod device;
pub mod error;
pub mod image_caption;
pub mod image_gen;
pub mod text_gen;
pub mod text_to_voice;
pub mod transcribe;

pub use device::DeviceType;
pub use error::{LocalAiError, Result};

// Re-export common types
pub use candle_core::{DType, Device, Tensor};
