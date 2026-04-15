use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

pub use models::*;

mod commands;
mod error;
mod models;

#[cfg(target_os = "android")]
mod mobile;

#[cfg(target_os = "android")]
use mobile::Sms;

pub use error::{Error, Result};

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the SMS APIs.
#[cfg(target_os = "android")]
pub trait SmsExt<R: Runtime> {
    fn sms(&self) -> &Sms<R>;
}

#[cfg(target_os = "android")]
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
            #[cfg(target_os = "android")]
            {
                let sms = mobile::init(app, api)?;
                app.manage(sms);
            }
            Ok(())
        })
        .build()
}
