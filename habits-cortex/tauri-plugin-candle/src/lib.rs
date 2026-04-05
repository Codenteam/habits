use std::sync::{Arc, Mutex};
use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
    path::BaseDirectory,
};

pub use models::*;

mod commands;
mod error;
mod candle_manager;
mod models;

pub use error::{Error, Result};
pub use candle_manager::CandleManager;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the candle APIs.
pub trait CandleExt<R: Runtime> {
    fn candle(&self) -> &Arc<Mutex<CandleManager>>;
}

impl<R: Runtime, T: Manager<R>> crate::CandleExt<R> for T {
    fn candle(&self) -> &Arc<Mutex<CandleManager>> {
        self.state::<Arc<Mutex<CandleManager>>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("candle")
        .invoke_handler(tauri::generate_handler![
            commands::chat,
            commands::vision_chat,
            commands::generate_image,
            commands::list_models,
            commands::ensure_models_dir,
        ])
        .setup(|app, _api| {
            // Use Tauri's app data directory for Android compatibility
            let models_dir = app.path()
                .resolve("models", BaseDirectory::AppData)
                .unwrap_or_else(|_| {
                    // Fallback for desktop
                    dirs::data_dir()
                        .unwrap_or_else(|| std::path::PathBuf::from("."))
                        .join("com.habits.cortex")
                        .join("models")
                });
            let manager = Arc::new(Mutex::new(CandleManager::new(models_dir)));
            app.manage(manager);
            Ok(())
        })
        .build()
}
