use crate::models::*;
use crate::smtp;
use crate::EmailExt;
use tauri::{command, AppHandle, Runtime};

/// Send an email via SMTP
#[command]
pub(crate) async fn send_email<R: Runtime>(
    _app: AppHandle<R>,
    config: SmtpConfig,
    message: EmailMessage,
) -> Result<(), String> {
    smtp::send_email(&config, &message)
        .await
        .map_err(|e| e.to_string())
}

/// Connect to an IMAP server
#[command]
pub(crate) async fn connect_imap<R: Runtime>(
    app: AppHandle<R>,
    config: ImapConfig,
) -> Result<(), String> {
    let client = app.email().clone();
    
    // Run blocking IMAP connection in a separate thread
    tokio::task::spawn_blocking(move || {
        client.connect(&config)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

/// Disconnect from IMAP server
#[command]
pub(crate) async fn disconnect_imap<R: Runtime>(
    app: AppHandle<R>,
) -> Result<(), String> {
    let client = app.email().clone();
    
    tokio::task::spawn_blocking(move || {
        client.disconnect()
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

/// List all mailboxes
#[command]
pub(crate) async fn list_mailboxes<R: Runtime>(
    app: AppHandle<R>,
) -> Result<Vec<Mailbox>, String> {
    let client = app.email().clone();
    
    tokio::task::spawn_blocking(move || {
        client.list_mailboxes()
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

/// Select a mailbox
#[command]
pub(crate) async fn select_mailbox<R: Runtime>(
    app: AppHandle<R>,
    mailbox: String,
) -> Result<u32, String> {
    let client = app.email().clone();
    
    tokio::task::spawn_blocking(move || {
        client.select_mailbox(&mailbox)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

/// Fetch emails from current mailbox
#[command]
pub(crate) async fn fetch_emails<R: Runtime>(
    app: AppHandle<R>,
    range: String,
    options: Option<FetchOptions>,
) -> Result<Vec<FetchedEmail>, String> {
    let client = app.email().clone();
    let opts = options.unwrap_or_default();
    
    tokio::task::spawn_blocking(move || {
        client.fetch_emails(&range, &opts)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

/// Fetch a single email by UID
#[command]
pub(crate) async fn fetch_email_by_uid<R: Runtime>(
    app: AppHandle<R>,
    uid: u32,
    options: Option<FetchOptions>,
) -> Result<Option<FetchedEmail>, String> {
    let client = app.email().clone();
    let opts = options.unwrap_or_default();
    
    tokio::task::spawn_blocking(move || {
        client.fetch_email_by_uid(uid, &opts)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

/// Search emails based on criteria
#[command]
pub(crate) async fn search_emails<R: Runtime>(
    app: AppHandle<R>,
    criteria: SearchCriteria,
) -> Result<Vec<u32>, String> {
    let client = app.email().clone();
    
    tokio::task::spawn_blocking(move || {
        client.search_emails(&criteria)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}
