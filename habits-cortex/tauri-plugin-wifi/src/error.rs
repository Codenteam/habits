use serde::{Deserialize, Serialize};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error, Serialize, Deserialize)]
pub enum Error {
    #[error("Wi-Fi is not available on desktop platforms")]
    NotAvailableOnDesktop,
    #[error("Wi-Fi is disabled")]
    WifiDisabled,
    #[error("Location permission required to access Wi-Fi info")]
    LocationPermissionRequired,
    #[error("Not connected to any Wi-Fi network")]
    NotConnected,
    #[error("Plugin error: {0}")]
    Plugin(String),
    #[error("Unknown error: {0}")]
    Unknown(String),
}

impl From<tauri::Error> for Error {
    fn from(e: tauri::Error) -> Self {
        Error::Plugin(e.to_string())
    }
}

#[cfg(mobile)]
impl From<tauri::plugin::mobile::PluginInvokeError> for Error {
    fn from(e: tauri::plugin::mobile::PluginInvokeError) -> Self {
        Error::Plugin(e.to_string())
    }
}
