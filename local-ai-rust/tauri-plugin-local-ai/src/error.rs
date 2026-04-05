//! Error types for the Tauri Local AI plugin

use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error("Local AI error: {0}")]
    LocalAi(#[from] local_ai_core::error::LocalAiError),

    #[error("Instance not found: {0}")]
    InstanceNotFound(String),

    #[error("State error: {0}")]
    State(String),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),

    #[error("{0}")]
    Other(String),
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
