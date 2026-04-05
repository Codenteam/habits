use serde::{Deserialize, Serialize};

/// Request to send an SMS message
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendSmsRequest {
    /// Phone number to send the SMS to (with country code)
    pub phone_number: String,
    /// Message content
    pub message: String,
}

/// Response after sending an SMS
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendSmsResponse {
    /// Whether the SMS was sent successfully
    pub success: bool,
    /// Optional message ID (if available)
    pub message_id: Option<String>,
}

/// Request to read SMS messages
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadSmsRequest {
    /// Filter by phone number (optional)
    pub phone_number: Option<String>,
    /// Maximum number of messages to retrieve
    pub limit: Option<u32>,
    /// Filter: "inbox", "sent", or "all"
    pub folder: Option<String>,
    /// Read only unread messages
    pub unread_only: Option<bool>,
}

/// An SMS message
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SmsMessage {
    /// Unique message ID
    pub id: String,
    /// Phone number (sender or recipient)
    pub phone_number: String,
    /// Message body
    pub body: String,
    /// Timestamp (Unix milliseconds)
    pub timestamp: i64,
    /// Whether the message has been read
    pub is_read: bool,
    /// Message type: "inbox" or "sent"
    pub message_type: String,
}

/// Response containing SMS messages
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadSmsResponse {
    /// List of messages
    pub messages: Vec<SmsMessage>,
    /// Total count of messages matching the filter
    pub total_count: u32,
}

/// Permission state
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionStatus {
    /// SMS send permission state
    pub send_sms: PermissionState,
    /// SMS read permission state  
    pub read_sms: PermissionState,
}

/// Permission state enum
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PermissionState {
    /// Permission has been granted
    Granted,
    /// Permission has been denied
    Denied,
    /// User should be prompted for permission
    Prompt,
    /// User should be prompted with rationale
    PromptWithRationale,
}
