use serde::{Deserialize, Serialize};
use tauri::plugin::mobile::PluginInvokeError;

/// Error type for the plugin
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Plugin invoke error: {0}")]
    PluginInvoke(String),
    
    #[error("Device not found: {0}")]
    DeviceNotFound(String),
    
    #[error("Device offline: {0}")]
    DeviceOffline(String),
    
    #[error("Commission failed: {0}")]
    CommissionFailed(String),
    
    #[error("Capability not supported: {0}")]
    CapabilityNotSupported(String),
    
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    
    #[error("Network error: {0}")]
    Network(String),
    
    #[error("Matter SDK error: {0}")]
    MatterSdk(String),
    
    #[error("Unsupported platform: {0}")]
    UnsupportedPlatform(String),

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
