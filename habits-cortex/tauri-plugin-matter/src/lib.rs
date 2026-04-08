//! Tauri plugin for Matter smart home device control on mobile.
//!
//! This plugin provides access to Matter-compatible smart home devices through:
//! - Android's Matter SDK (Google Home)
//! - iOS: Currently disabled due to swift-rs targeting bug
//!
//! Supported capabilities:
//! - OnOff cluster: Turn devices on/off
//! - LevelControl cluster: Set brightness/intensity
//! - ColorControl cluster: Set color (hue, saturation, temperature)

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

/// Extensions to the Tauri [`AppHandle`] for Matter functionality.
#[cfg(target_os = "android")]
pub trait MatterExt<R: Runtime> {
    fn matter(&self) -> &mobile::Matter<R>;
}

#[cfg(target_os = "android")]
impl<R: Runtime, T: Manager<R>> MatterExt<R> for T {
    fn matter(&self) -> &mobile::Matter<R> {
        self.state::<mobile::Matter<R>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("matter")
        .invoke_handler(tauri::generate_handler![
            commands::discover_devices,
            commands::get_devices,
            commands::get_device_state,
            commands::set_on_off,
            commands::set_level,
            commands::set_color,
            commands::commission_device,
            commands::remove_device,
        ])
        .setup(|app, api| {
            #[cfg(target_os = "android")]
            {
                let matter = mobile::init(app, api)?;
                app.manage(matter);
            }
            let _ = api; // Suppress unused warning on iOS
            let _ = app;
            Ok(())
        })
        .build()
}
