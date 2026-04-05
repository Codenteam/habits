use serde::{Serialize, Serializer};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("SMS functionality is only available on mobile devices")]
    NotAvailableOnDesktop,
    #[error("Failed to send SMS: {0}")]
    SendFailed(String),
    #[error("Failed to read SMS: {0}")]
    ReadFailed(String),
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    #[error("Invalid phone number: {0}")]
    InvalidPhoneNumber(String),
    #[error("Plugin error: {0}")]
    PluginError(String),
    #[cfg(mobile)]
    #[error(transparent)]
    PluginInvoke(#[from] tauri::plugin::mobile::PluginInvokeError),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
