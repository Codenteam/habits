use crate::Result;
use rusqlite::Connection;
use std::{
    collections::HashMap,
    path::Path,
    sync::{Arc, Mutex},
};

#[derive(Default)]
pub struct VecConnectionRegistry {
    inner: Mutex<HashMap<String, Arc<Mutex<Connection>>>>,
}

impl VecConnectionRegistry {
    pub async fn get(&self, path: &Path) -> Result<Arc<Mutex<Connection>>> {
        let key = path.to_string_lossy().to_string();
        {
            let g = self.inner.lock().unwrap();
            if let Some(c) = g.get(&key) {
                return Ok(c.clone());
            }
        }
        let key_clone = key.clone();
        let conn = tokio::task::spawn_blocking(move || -> Result<Connection> {
            // Register sqlite-vec as a global auto-extension (idempotent; SQLite deduplicates).
            // Must be called BEFORE Connection::open so the new connection loads it automatically.
            unsafe {
                rusqlite::ffi::sqlite3_auto_extension(Some(std::mem::transmute(
                    sqlite_vec::sqlite3_vec_init as *const (),
                )));
            }
            let c = Connection::open(&key_clone)?;
            c.pragma_update(None, "journal_mode", "WAL")?;
            c.execute_batch(
                "CREATE TABLE IF NOT EXISTS vec_registry (
                    collection TEXT PRIMARY KEY,
                    dim        INTEGER NOT NULL,
                    next_rowid INTEGER NOT NULL DEFAULT 1
                );",
            )?;
            Ok(c)
        })
        .await
        .map_err(|e| crate::Error::Internal(format!("join: {e}")))??;
        let arc = Arc::new(Mutex::new(conn));
        self.inner.lock().unwrap().insert(key, arc.clone());
        Ok(arc)
    }
}
