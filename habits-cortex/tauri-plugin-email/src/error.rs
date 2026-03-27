use serde::{ser::Serializer, Serialize};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("SMTP error: {0}")]
    Smtp(String),
    
    #[error("IMAP error: {0}")]
    Imap(String),
    
    #[error("TLS error: {0}")]
    Tls(String),
    
    #[error("Connection error: {0}")]
    Connection(String),
    
    #[error("Authentication failed: {0}")]
    Auth(String),
    
    #[error("Invalid email address: {0}")]
    InvalidEmail(String),
    
    #[error("Not connected")]
    NotConnected,
    
    #[error("No mailbox selected")]
    NoMailboxSelected,
    
    #[error(transparent)]
    Io(#[from] std::io::Error),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

impl From<lettre::transport::smtp::Error> for Error {
    fn from(err: lettre::transport::smtp::Error) -> Self {
        Error::Smtp(err.to_string())
    }
}

impl From<lettre::address::AddressError> for Error {
    fn from(err: lettre::address::AddressError) -> Self {
        Error::InvalidEmail(err.to_string())
    }
}

impl From<imap::Error> for Error {
    fn from(err: imap::Error) -> Self {
        Error::Imap(err.to_string())
    }
}

impl From<native_tls::Error> for Error {
    fn from(err: native_tls::Error) -> Self {
        Error::Tls(err.to_string())
    }
}
