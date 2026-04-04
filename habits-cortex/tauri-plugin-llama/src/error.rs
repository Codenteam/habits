use serde::Serialize;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Model error: {0}")]
    Model(String),
    
    #[error("Context error: {0}")]
    Context(String),
    
    #[error("Inference error: {0}")]
    Inference(String),
    
    #[error("File error: {0}")]
    File(String),
    
    #[error("Download error: {0}")]
    Download(String),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Request error: {0}")]
    Request(String),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_str())
    }
}

impl From<reqwest::Error> for Error {
    fn from(err: reqwest::Error) -> Self {
        Error::Request(err.to_string())
    }
}
