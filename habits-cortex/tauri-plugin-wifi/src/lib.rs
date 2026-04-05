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
use mobile::Wifi;

pub use error::{Error, Result};

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the Wi-Fi APIs.
pub trait WifiExt<R: Runtime> {
    fn wifi(&self) -> &Wifi<R>;
}

#[cfg(mobile)]
impl<R: Runtime, T: Manager<R>> crate::WifiExt<R> for T {
    fn wifi(&self) -> &Wifi<R> {
        self.state::<Wifi<R>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("wifi")
        .invoke_handler(tauri::generate_handler![
            commands::get_current_network,
            commands::is_connected,
            commands::list_saved_networks,
            commands::check_permissions,
            commands::request_permissions,
        ])
        .setup(|app, api| {
            #[cfg(mobile)]
            {
                let wifi = mobile::init(app, api)?;
                app.manage(wifi);
            }
            Ok(())
        })
        .build()
}
