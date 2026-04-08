use serde::{Deserialize, Serialize};
use tauri::plugin::mobile::PluginInvokeError;

/// Error type for the plugin
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Plugin invoke error: {0}")]
    PluginInvoke(String),
    
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    
    #[error("Feature not supported on this platform")]
    NotSupported,
    
    #[error("Bluetooth error: {0}")]
    Bluetooth(String),
    
    #[error("Audio error: {0}")]
    Audio(String),
    
    #[error("Settings error: {0}")]
    Settings(String),
    
    #[error(transparent)]
    Tauri(#[from] tauri::Error),
}

impl From<PluginInvokeError> for Error {
    fn from(err: PluginInvokeError) -> Self {
        Error::PluginInvoke(err.to_string())
    }
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

impl<'de> Deserialize<'de> for Error {
    fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        Ok(Error::PluginInvoke(s))
    }
}
