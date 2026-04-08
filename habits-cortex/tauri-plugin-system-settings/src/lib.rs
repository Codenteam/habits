//! Tauri plugin for controlling system settings on mobile devices.
//!
//! This plugin provides access to:
//! - Volume control (media, ring, alarm, notification, voice, system)
//! - Ringer mode (normal, vibrate, silent)
//! - Bluetooth on/off
//! - Do Not Disturb mode
//!
//! Note: iOS support currently disabled due to swift-rs targeting bug.

use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

mod commands;
mod error;
#[cfg(target_os = "android")]
mod mobile;
pub mod models;

pub use error::Error;
pub use models::*;

pub type Result<T> = std::result::Result<T, Error>;

/// Extensions to the Tauri [`AppHandle`] for system settings functionality.
#[cfg(target_os = "android")]
pub trait SystemSettingsExt<R: Runtime> {
    fn system_settings(&self) -> &mobile::SystemSettings<R>;
}

#[cfg(target_os = "android")]
impl<R: Runtime, T: Manager<R>> SystemSettingsExt<R> for T {
    fn system_settings(&self) -> &mobile::SystemSettings<R> {
        self.state::<mobile::SystemSettings<R>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("system-settings")
        .invoke_handler(tauri::generate_handler![
            commands::get_volume,
            commands::set_volume,
            commands::set_mute,
            commands::get_ringer_mode,
            commands::set_ringer_mode,
            commands::get_bluetooth_state,
            commands::set_bluetooth,
            commands::get_dnd_state,
            commands::set_dnd,
        ])
        .setup(|app, api| {
            #[cfg(target_os = "android")]
            {
                let system_settings = mobile::init(app, api)?;
                app.manage(system_settings);
            }
            let _ = api; // Suppress unused warning on iOS
            let _ = app;
            Ok(())
        })
        .build()
}
