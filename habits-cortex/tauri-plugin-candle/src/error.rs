use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Error types for the Candle plugin
#[derive(Debug, Error)]
pub enum Error {
    #[error("Model error: {0}")]
    Model(String),

    #[error("Inference error: {0}")]
    Inference(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Vision error: {0}")]
    Vision(String),

    #[error("Image generation error: {0}")]
    ImageGeneration(String),

    #[error("Download error: {0}")]
    Download(String),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, Error>;
