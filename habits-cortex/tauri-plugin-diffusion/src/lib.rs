use std::sync::Arc;
use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
    path::BaseDirectory,
};
use tokio::sync::Mutex;

pub use models::*;

mod commands;
mod error;
mod diffusion_manager;
mod models;

pub use error::{Error, Result};
pub use diffusion_manager::DiffusionManager;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the diffusion APIs.
pub trait DiffusionExt<R: Runtime> {
    fn diffusion(&self) -> &Arc<Mutex<DiffusionManager>>;
}

impl<R: Runtime, T: Manager<R>> crate::DiffusionExt<R> for T {
    fn diffusion(&self) -> &Arc<Mutex<DiffusionManager>> {
        self.state::<Arc<Mutex<DiffusionManager>>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("diffusion")
        .invoke_handler(tauri::generate_handler![
            commands::generate_image,
            commands::list_models,
            commands::ensure_models_dir,
            commands::unload_model,
        ])
        .setup(|app, _api| {
            // Use Tauri's app data directory for models
            let models_dir = app.path()
                .resolve("models/diffusion", BaseDirectory::AppData)
                .unwrap_or_else(|_| {
                    // Fallback for desktop
                    dirs::data_dir()
                        .unwrap_or_else(|| std::path::PathBuf::from("."))
                        .join("com.habits.cortex")
                        .join("models")
                        .join("diffusion")
                });
            let manager = Arc::new(Mutex::new(DiffusionManager::new(models_dir)));
            app.manage(manager);
            Ok(())
        })
        .build()
}
