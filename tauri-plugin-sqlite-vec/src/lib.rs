use tauri::{plugin::{Builder, TauriPlugin}, Manager, Runtime};

mod commands;
mod error;
mod state;

pub use error::{Error, Result};

#[must_use]
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("sqlite-vec")
        .setup(|app, _api| {
            app.manage(state::VecConnectionRegistry::default());
            tracing::info!("tauri-plugin-sqlite-vec initialized");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::ensure_tables,
            commands::vector_insert,
            commands::vector_search,
            commands::vector_delete,
        ])
        .build()
}
