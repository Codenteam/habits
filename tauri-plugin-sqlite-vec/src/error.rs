use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error("SQLite error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("Internal error: {0}")]
    Internal(String),
    #[error("Invalid collection name: {0}")]
    InvalidCollection(String),
    #[error("Vector dimension mismatch: {0}")]
    DimMismatch(String),
}

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

pub type Result<T> = std::result::Result<T, Error>;
