use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

pub use models::*;

mod keyring_impl;
mod commands;
mod error;
mod models;

pub use error::{Error, Result};
pub use keyring_impl::Keyring;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the keyring APIs.
pub trait KeyringExt<R: Runtime> {
    fn keyring(&self) -> &Keyring;
}

impl<R: Runtime, T: Manager<R>> crate::KeyringExt<R> for T {
    fn keyring(&self) -> &Keyring {
        self.state::<Keyring>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("keyring")
        .invoke_handler(tauri::generate_handler![
            commands::get_password,
            commands::set_password,
            commands::delete_password,
            commands::get_secret,
            commands::set_secret,
            commands::delete_secret,
            commands::get_or_set_password,
            commands::get_or_set_secret,
        ])
        .setup(|app, _api| {
            let keyring = keyring_impl::init(app)?;
            app.manage(keyring);
            Ok(())
        })
        .build()
}
