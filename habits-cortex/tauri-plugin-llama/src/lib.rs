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
mod llama_manager;
mod models;

pub use error::{Error, Result};
pub use llama_manager::LlamaManager;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the llama APIs.
pub trait LlamaExt<R: Runtime> {
    fn llama(&self) -> &Arc<Mutex<LlamaManager>>;
}

impl<R: Runtime, T: Manager<R>> crate::LlamaExt<R> for T {
    fn llama(&self) -> &Arc<Mutex<LlamaManager>> {
        self.state::<Arc<Mutex<LlamaManager>>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("llama")
        .invoke_handler(tauri::generate_handler![
            commands::load_model,
            commands::unload_model,
            commands::chat,
            commands::list_models,
            commands::install_model,
            commands::get_model_info,
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
            let manager = Arc::new(Mutex::new(LlamaManager::new(models_dir)));
            app.manage(manager);
            Ok(())
        })
        .build()
}
