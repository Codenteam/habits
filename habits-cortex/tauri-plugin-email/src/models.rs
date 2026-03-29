use serde::{Deserialize, Serialize};

/// SMTP configuration for sending emails
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmtpConfig {
    /// SMTP server hostname
    pub host: String,
    /// SMTP server port (typically 587 for TLS, 465 for SSL, 25 for plain)
    pub port: u16,
    /// Username for authentication
    pub username: String,
    /// Password for authentication  
    pub password: String,
    /// Use TLS encryption
    #[serde(default = "default_true")]
    pub use_tls: bool,
}

/// IMAP configuration for fetching emails
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImapConfig {
    /// IMAP server hostname  
    pub host: String,
    /// IMAP server port (typically 993 for SSL, 143 for plain)
    pub port: u16,
    /// Username for authentication
    pub username: String,
    /// Password for authentication
    pub password: String,
    /// Use TLS encryption
    #[serde(default = "default_true")]
    pub use_tls: bool,
}

/// Email message to send
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailMessage {
    /// Sender email address
    pub from: String,
    /// Recipient email addresses
    pub to: Vec<String>,
    /// CC recipients (optional)
    #[serde(default)]
    pub cc: Vec<String>,
    /// BCC recipients (optional)
    #[serde(default)]
    pub bcc: Vec<String>,
    /// Email subject
    pub subject: String,
    /// Plain text body
    pub body: String,
    /// HTML body (optional)
    pub html_body: Option<String>,
    /// Reply-To address (optional)
    pub reply_to: Option<String>,
}

/// Represents a fetched email
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FetchedEmail {
    /// Unique identifier in the mailbox
    pub uid: u32,
    /// Sequence number
    pub seq: u32,
    /// From address
    pub from: Option<String>,
    /// To addresses
    pub to: Vec<String>,
    /// Subject line
    pub subject: Option<String>,
    /// Date string
    pub date: Option<String>,
    /// Plain text body
    pub body_text: Option<String>,
    /// HTML body
    pub body_html: Option<String>,
    /// Raw RFC822 message
    pub raw: Option<String>,
    /// Email flags (e.g., \\Seen, \\Answered)
    pub flags: Vec<String>,
}

/// Mailbox information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Mailbox {
    /// Mailbox name
    pub name: String,
    /// Delimiter character
    pub delimiter: Option<String>,
    /// Mailbox attributes
    pub attributes: Vec<String>,
}

/// Search criteria for IMAP
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchCriteria {
    /// Search in subject
    pub subject: Option<String>,
    /// Search in from address
    pub from: Option<String>,
    /// Search in body
    pub body: Option<String>,
    /// Search for unread emails
    pub unseen: Option<bool>,
    /// Search by date (since)
    pub since: Option<String>,
    /// Search by date (before)
    pub before: Option<String>,
}

/// Fetch options for retrieving emails
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FetchOptions {
    /// Fetch body
    #[serde(default = "default_true")]
    pub fetch_body: bool,
    /// Fetch headers only
    #[serde(default)]
    pub headers_only: bool,
    /// Mark as read
    #[serde(default)]
    pub mark_as_read: bool,
}

impl Default for FetchOptions {
    fn default() -> Self {
        Self {
            fetch_body: true,
            headers_only: false,
            mark_as_read: false,
        }
    }
}

fn default_true() -> bool {
    true
}
