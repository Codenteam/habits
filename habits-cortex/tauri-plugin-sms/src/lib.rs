use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

pub use models::*;

mod commands;
mod error;
mod models;

#[cfg(mobile)]
mod mobile;

#[cfg(mobile)]
use mobile::Sms;

pub use error::{Error, Result};

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the SMS APIs.
pub trait SmsExt<R: Runtime> {
    fn sms(&self) -> &Sms<R>;
}

#[cfg(mobile)]
impl<R: Runtime, T: Manager<R>> crate::SmsExt<R> for T {
    fn sms(&self) -> &Sms<R> {
        self.state::<Sms<R>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("sms")
        .invoke_handler(tauri::generate_handler![
            commands::send_sms,
            commands::read_sms,
        ])
        .setup(|app, api| {
            #[cfg(mobile)]
            {
                let sms = mobile::init(app, api)?;
                app.manage(sms);
            }
            Ok(())
        })
        .build()
}
