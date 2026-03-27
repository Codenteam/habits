use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

pub use models::*;

mod commands;
mod error;
mod imap_client;
mod models;
mod smtp;

pub use error::{Error, Result};
pub use imap_client::ImapClient;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the email APIs.
pub trait EmailExt<R: Runtime> {
    fn email(&self) -> &ImapClient;
}

impl<R: Runtime, T: Manager<R>> crate::EmailExt<R> for T {
    fn email(&self) -> &ImapClient {
        self.state::<ImapClient>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("email")
        .invoke_handler(tauri::generate_handler![
            commands::send_email,
            commands::connect_imap,
            commands::disconnect_imap,
            commands::list_mailboxes,
            commands::select_mailbox,
            commands::fetch_emails,
            commands::fetch_email_by_uid,
            commands::search_emails,
        ])
        .setup(|app, _api| {
            let client = ImapClient::new();
            app.manage(client);
            Ok(())
        })
        .build()
}
