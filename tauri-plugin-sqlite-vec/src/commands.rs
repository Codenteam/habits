use crate::state::VecConnectionRegistry;
use crate::Result;
use rusqlite::OptionalExtension;
use serde_json::Value;
use tauri::{AppHandle, Manager, Runtime, State};

fn validate_collection(name: &str) -> Result<()> {
    let mut chars = name.chars();
    match chars.next() {
        Some(c) if c.is_alphabetic() || c == '_' => {}
        _ => return Err(crate::Error::InvalidCollection(name.to_string())),
    }
    if !chars.all(|c| c.is_alphanumeric() || c == '_') {
        return Err(crate::Error::InvalidCollection(name.to_string()));
    }
    Ok(())
}

fn resolve_db_path<R: Runtime>(app: &AppHandle<R>, database: &str) -> std::path::PathBuf {
    let base = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("/tmp"));
    base.join(database)
}

#[tauri::command]
pub async fn ensure_tables<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, VecConnectionRegistry>,
    database: String,
    collection: String,
    dim: u32,
) -> Result<()> {
    validate_collection(&collection)?;
    let db_path = resolve_db_path(&app, &database);
    let arc = state.get(&db_path).await?;
    let col = collection.clone();
    tokio::task::spawn_blocking(move || -> Result<()> {
        let conn = arc.lock().unwrap();
        let existing: Option<i64> = conn
            .query_row(
                "SELECT dim FROM vec_registry WHERE collection = ?",
                rusqlite::params![col],
                |row| row.get(0),
            )
            .optional()?;
        if let Some(existing_dim) = existing {
            if existing_dim != dim as i64 {
                return Err(crate::Error::DimMismatch(format!(
                    "expected {existing_dim}, got {dim}"
                )));
            }
            return Ok(());
        }
        conn.execute_batch(&format!(
            "CREATE VIRTUAL TABLE vec_{col} USING vec0(embedding float[{dim}]);
             CREATE TABLE IF NOT EXISTS vec_meta_{col} (
               rowid      INTEGER PRIMARY KEY,
               custom_id  TEXT NOT NULL,
               data       TEXT,
               created_at TEXT NOT NULL,
               updated_at TEXT
             );
             CREATE INDEX IF NOT EXISTS idx_vec_meta_{col}_custom ON vec_meta_{col}(custom_id);"
        ))?;
        conn.execute(
            "INSERT INTO vec_registry (collection, dim, next_rowid) VALUES (?1, ?2, 1)",
            rusqlite::params![col, dim],
        )?;
        Ok(())
    })
    .await
    .map_err(|e| crate::Error::Internal(format!("join: {e}")))?
    .map_err(Into::into)
    .and_then(Ok)
}

#[tauri::command]
pub async fn vector_insert<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, VecConnectionRegistry>,
    database: String,
    collection: String,
    custom_id: String,
    vector: Vec<f32>,
    data: String,
    now: String,
) -> Result<u64> {
    validate_collection(&collection)?;
    let db_path = resolve_db_path(&app, &database);
    let arc = state.get(&db_path).await?;
    let col = collection.clone();
    let vec_json =
        serde_json::to_string(&vector).map_err(|e| crate::Error::Internal(e.to_string()))?;
    tokio::task::spawn_blocking(move || -> Result<u64> {
        let conn = arc.lock().unwrap();
        let rowid: i64 = conn.query_row(
            "SELECT next_rowid FROM vec_registry WHERE collection = ?",
            rusqlite::params![col],
            |r| r.get(0),
        )?;
        conn.execute(
            "UPDATE vec_registry SET next_rowid = next_rowid + 1 WHERE collection = ?",
            rusqlite::params![col],
        )?;
        conn.execute(
            &format!("INSERT INTO vec_{col}(rowid, embedding) VALUES (?1, ?2)"),
            rusqlite::params![rowid, vec_json],
        )?;
        conn.execute(
            &format!(
                "INSERT INTO vec_meta_{col} (rowid, custom_id, data, created_at) VALUES (?1, ?2, ?3, ?4)"
            ),
            rusqlite::params![rowid, custom_id, data, now],
        )?;
        Ok(rowid as u64)
    })
    .await
    .map_err(|e| crate::Error::Internal(format!("join: {e}")))?
}

#[tauri::command]
pub async fn vector_search<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, VecConnectionRegistry>,
    database: String,
    collection: String,
    vector: Vec<f32>,
    distance: String,
    limit: u32,
) -> Result<Vec<Value>> {
    validate_collection(&collection)?;
    let db_path = resolve_db_path(&app, &database);
    let arc = state.get(&db_path).await?;
    let col = collection.clone();
    let vec_json =
        serde_json::to_string(&vector).map_err(|e| crate::Error::Internal(e.to_string()))?;
    tokio::task::spawn_blocking(move || -> Result<Vec<Value>> {
        let conn = arc.lock().unwrap();
        let sql = if distance == "cosine" {
            format!(
                "SELECT v.rowid AS rowid, vec_distance_cosine(v.embedding, ?) AS distance, m.custom_id, m.data, m.created_at
                 FROM vec_{col} v JOIN vec_meta_{col} m ON m.rowid = v.rowid
                 ORDER BY distance ASC LIMIT ?"
            )
        } else if distance == "l1" {
            format!(
                "SELECT v.rowid AS rowid, vec_distance_L1(v.embedding, ?) AS distance, m.custom_id, m.data, m.created_at
                 FROM vec_{col} v JOIN vec_meta_{col} m ON m.rowid = v.rowid
                 ORDER BY distance ASC LIMIT ?"
            )
        } else {
            // MATCH requires LIMIT visible to vec0 planner; use subquery so JOIN doesn't hide it.
            format!(
                "SELECT v.rowid AS rowid, v.distance AS distance, m.custom_id, m.data, m.created_at
                 FROM (SELECT rowid, distance FROM vec_{col} WHERE embedding MATCH ? ORDER BY distance LIMIT ?) v
                 JOIN vec_meta_{col} m ON m.rowid = v.rowid"
            )
        };
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(rusqlite::params![vec_json, limit], |row| {
            Ok(serde_json::json!({
                "rowid": row.get::<_, i64>(0)?,
                "distance": row.get::<_, f64>(1)?,
                "custom_id": row.get::<_, String>(2)?,
                "data": row.get::<_, String>(3)?,
                "created_at": row.get::<_, String>(4)?,
            }))
        })?;
        let mut results = Vec::new();
        for r in rows {
            results.push(r?);
        }
        Ok(results)
    })
    .await
    .map_err(|e| crate::Error::Internal(format!("join: {e}")))?
}

#[tauri::command]
pub async fn vector_delete<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, VecConnectionRegistry>,
    database: String,
    collection: String,
    id: String,
) -> Result<bool> {
    validate_collection(&collection)?;
    let db_path = resolve_db_path(&app, &database);
    let arc = state.get(&db_path).await?;
    let col = collection.clone();
    tokio::task::spawn_blocking(move || -> Result<bool> {
        let conn = arc.lock().unwrap();
        let row: Option<i64> = conn
            .query_row(
                &format!("SELECT rowid FROM vec_meta_{col} WHERE custom_id = ?"),
                rusqlite::params![id],
                |r| r.get(0),
            )
            .optional()?;
        let Some(rowid) = row else {
            return Ok(false);
        };
        conn.execute(
            &format!("DELETE FROM vec_{col} WHERE rowid = ?"),
            rusqlite::params![rowid],
        )?;
        conn.execute(
            &format!("DELETE FROM vec_meta_{col} WHERE rowid = ?"),
            rusqlite::params![rowid],
        )?;
        Ok(true)
    })
    .await
    .map_err(|e| crate::Error::Internal(format!("join: {e}")))?
}
