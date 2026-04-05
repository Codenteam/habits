//! Error types for Local AI Core

use thiserror::Error;

#[derive(Error, Debug)]
pub enum LocalAiError {
    #[error("Candle error: {0}")]
    Candle(#[from] candle_core::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Tokenizer error: {0}")]
    Tokenizer(String),

    #[error("Audio error: {0}")]
    Audio(String),

    #[error("Model error: {0}")]
    Model(String),

    #[error("Image error: {0}")]
    Image(String),

    #[error("Config error: {0}")]
    Config(String),

    #[error("Invalid parameter: {0}")]
    InvalidParameter(String),

    #[error("{0}")]
    Other(String),
}

impl From<anyhow::Error> for LocalAiError {
    fn from(err: anyhow::Error) -> Self {
        LocalAiError::Other(err.to_string())
    }
}

impl From<image::ImageError> for LocalAiError {
    fn from(err: image::ImageError) -> Self {
        LocalAiError::Image(err.to_string())
    }
}

pub type Result<T> = std::result::Result<T, LocalAiError>;
