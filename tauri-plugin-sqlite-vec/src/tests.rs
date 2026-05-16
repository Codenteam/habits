/// Unit tests for the sqlite-vec plugin core logic.
///
/// These tests bypass Tauri completely, they exercise the SQLite / sqlite-vec
/// layer directly through the same helper functions used by the command
/// handlers, so no AppHandle or State is needed.
#[cfg(test)]
mod tests {
    use rusqlite::{Connection, OptionalExtension};
    use serde_json::json;

    // ── helpers ──────────────────────────────────────────────────────────────

    /// Open an in-memory SQLite connection with sqlite-vec loaded and the
    /// `vec_registry` bootstrap table created, same logic as `VecConnectionRegistry`.
    fn open_test_db() -> Connection {
        unsafe {
            rusqlite::ffi::sqlite3_auto_extension(Some(std::mem::transmute(
                sqlite_vec::sqlite3_vec_init as *const (),
            )));
        }
        let conn = Connection::open_in_memory().expect("in-memory db");
        conn.pragma_update(None, "journal_mode", "WAL").unwrap();
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS vec_registry (
                collection TEXT PRIMARY KEY,
                dim        INTEGER NOT NULL,
                next_rowid INTEGER NOT NULL DEFAULT 1
            );",
        )
        .unwrap();
        conn
    }

    fn validate_collection(name: &str) -> crate::Result<()> {
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

    fn ensure_tables_sync(conn: &Connection, collection: &str, dim: u32) -> crate::Result<()> {
        validate_collection(collection)?;
        let existing: Option<i64> = conn
            .query_row(
                "SELECT dim FROM vec_registry WHERE collection = ?",
                rusqlite::params![collection],
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
            "CREATE VIRTUAL TABLE vec_{collection} USING vec0(embedding float[{dim}]);
             CREATE TABLE IF NOT EXISTS vec_meta_{collection} (
               rowid      INTEGER PRIMARY KEY,
               custom_id  TEXT NOT NULL,
               data       TEXT,
               created_at TEXT NOT NULL,
               updated_at TEXT
             );
             CREATE INDEX IF NOT EXISTS idx_vec_meta_{collection}_custom ON vec_meta_{collection}(custom_id);"
        ))?;
        conn.execute(
            "INSERT INTO vec_registry (collection, dim, next_rowid) VALUES (?1, ?2, 1)",
            rusqlite::params![collection, dim],
        )?;
        Ok(())
    }

    fn vector_insert_sync(
        conn: &Connection,
        collection: &str,
        custom_id: &str,
        vector: &[f32],
        data: &str,
        now: &str,
    ) -> crate::Result<u64> {
        validate_collection(collection)?;
        let vec_json = serde_json::to_string(vector).unwrap();
        let rowid: i64 = conn.query_row(
            "SELECT next_rowid FROM vec_registry WHERE collection = ?",
            rusqlite::params![collection],
            |r| r.get(0),
        )?;
        conn.execute(
            "UPDATE vec_registry SET next_rowid = next_rowid + 1 WHERE collection = ?",
            rusqlite::params![collection],
        )?;
        conn.execute(
            &format!("INSERT INTO vec_{collection}(rowid, embedding) VALUES (?1, ?2)"),
            rusqlite::params![rowid, vec_json],
        )?;
        conn.execute(
            &format!("INSERT INTO vec_meta_{collection} (rowid, custom_id, data, created_at) VALUES (?1, ?2, ?3, ?4)"),
            rusqlite::params![rowid, custom_id, data, now],
        )?;
        Ok(rowid as u64)
    }

    fn vector_search_sync(
        conn: &Connection,
        collection: &str,
        vector: &[f32],
        limit: u32,
    ) -> crate::Result<Vec<serde_json::Value>> {
        validate_collection(collection)?;
        let vec_json = serde_json::to_string(vector).unwrap();
        let sql = format!(
            "SELECT v.rowid AS rowid, v.distance AS distance, m.custom_id, m.data, m.created_at
             FROM (SELECT rowid, distance FROM vec_{collection} WHERE embedding MATCH ? ORDER BY distance LIMIT ?) v
             JOIN vec_meta_{collection} m ON m.rowid = v.rowid"
        );
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(rusqlite::params![vec_json, limit], |row| {
            Ok(json!({
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
    }

    fn vector_delete_sync(
        conn: &Connection,
        collection: &str,
        custom_id: &str,
    ) -> crate::Result<bool> {
        validate_collection(collection)?;
        let row: Option<i64> = conn
            .query_row(
                &format!("SELECT rowid FROM vec_meta_{collection} WHERE custom_id = ?"),
                rusqlite::params![custom_id],
                |r| r.get(0),
            )
            .optional()?;
        let Some(rowid) = row else {
            return Ok(false);
        };
        conn.execute(
            &format!("DELETE FROM vec_{collection} WHERE rowid = ?"),
            rusqlite::params![rowid],
        )?;
        conn.execute(
            &format!("DELETE FROM vec_meta_{collection} WHERE rowid = ?"),
            rusqlite::params![rowid],
        )?;
        Ok(true)
    }

    // ── tests ─────────────────────────────────────────────────────────────────

    #[test]
    fn test_open_db_creates_vec_registry() {
        let conn = open_test_db();
        // vec_registry table must exist
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM vec_registry", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 0, "registry should be empty on a fresh DB");
    }

    #[test]
    fn test_sqlite_vec_extension_loaded() {
        let conn = open_test_db();
        // vec_version() is provided by the sqlite-vec extension
        let version: String = conn
            .query_row("SELECT vec_version()", [], |r| r.get(0))
            .expect("sqlite-vec extension should be loaded");
        assert!(!version.is_empty(), "vec_version() should return a non-empty string");
    }

    #[test]
    fn test_ensure_tables_creates_virtual_table() {
        let conn = open_test_db();
        ensure_tables_sync(&conn, "items", 3).unwrap();

        // Row written to registry
        let dim: i64 = conn
            .query_row(
                "SELECT dim FROM vec_registry WHERE collection = 'items'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(dim, 3);

        // Virtual table accessible
        let n: i64 = conn
            .query_row("SELECT COUNT(*) FROM vec_items", [], |r| r.get(0))
            .unwrap();
        assert_eq!(n, 0);
    }

    #[test]
    fn test_ensure_tables_idempotent() {
        let conn = open_test_db();
        ensure_tables_sync(&conn, "items", 3).unwrap();
        // Calling again with same dim should succeed without error
        ensure_tables_sync(&conn, "items", 3).unwrap();
    }

    #[test]
    fn test_ensure_tables_dim_mismatch_returns_error() {
        let conn = open_test_db();
        ensure_tables_sync(&conn, "items", 3).unwrap();
        let err = ensure_tables_sync(&conn, "items", 4).unwrap_err();
        assert!(
            matches!(err, crate::Error::DimMismatch(_)),
            "should return DimMismatch, got: {err}"
        );
    }

    #[test]
    fn test_validate_collection_rejects_invalid_names() {
        assert!(validate_collection("").is_err(), "empty string");
        assert!(validate_collection("1starts_with_digit").is_err(), "digit start");
        assert!(validate_collection("has space").is_err(), "space");
        assert!(validate_collection("has-dash").is_err(), "dash");
        assert!(validate_collection("DROP TABLE").is_err(), "SQL injection attempt");
    }

    #[test]
    fn test_validate_collection_accepts_valid_names() {
        assert!(validate_collection("items").is_ok());
        assert!(validate_collection("my_items").is_ok());
        assert!(validate_collection("_private").is_ok());
        assert!(validate_collection("items123").is_ok());
    }

    #[test]
    fn test_insert_vector_returns_rowid() {
        let conn = open_test_db();
        ensure_tables_sync(&conn, "vecs", 3).unwrap();

        let rowid = vector_insert_sync(
            &conn,
            "vecs",
            "doc-1",
            &[0.1, 0.2, 0.3],
            r#"{"text":"hello"}"#,
            "2024-01-01T00:00:00Z",
        )
        .unwrap();
        assert_eq!(rowid, 1, "first insert should have rowid = 1");
    }

    #[test]
    fn test_insert_vector_increments_rowid() {
        let conn = open_test_db();
        ensure_tables_sync(&conn, "vecs", 3).unwrap();

        let r1 = vector_insert_sync(&conn, "vecs", "a", &[0.1, 0.2, 0.3], "{}", "t").unwrap();
        let r2 = vector_insert_sync(&conn, "vecs", "b", &[0.4, 0.5, 0.6], "{}", "t").unwrap();
        assert_eq!(r2, r1 + 1, "rowids should be sequential");
    }

    #[test]
    fn test_search_finds_nearest_vector() {
        let conn = open_test_db();
        ensure_tables_sync(&conn, "vecs", 3).unwrap();

        vector_insert_sync(&conn, "vecs", "far", &[1.0, 0.0, 0.0], "{}", "t").unwrap();
        vector_insert_sync(&conn, "vecs", "near", &[0.1, 0.9, 0.0], "{}", "t").unwrap();

        // Query close to "near"
        let results = vector_search_sync(&conn, "vecs", &[0.0, 1.0, 0.0], 1).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0]["custom_id"], "near");
    }

    #[test]
    fn test_search_returns_multiple_results_in_order() {
        let conn = open_test_db();
        ensure_tables_sync(&conn, "docs", 2).unwrap();

        vector_insert_sync(&conn, "docs", "a", &[1.0, 0.0], "{}", "t").unwrap();
        vector_insert_sync(&conn, "docs", "b", &[0.9, 0.1], "{}", "t").unwrap();
        vector_insert_sync(&conn, "docs", "c", &[0.0, 1.0], "{}", "t").unwrap();

        // Query along [1.0, 0.0]: "a" should be closest, then "b"
        let results = vector_search_sync(&conn, "docs", &[1.0, 0.0], 2).unwrap();
        assert_eq!(results.len(), 2);
        assert_eq!(results[0]["custom_id"], "a");
        assert_eq!(results[1]["custom_id"], "b");
    }

    #[test]
    fn test_search_on_empty_collection_returns_empty() {
        let conn = open_test_db();
        ensure_tables_sync(&conn, "empty", 4).unwrap();
        let results = vector_search_sync(&conn, "empty", &[1.0, 0.0, 0.0, 0.0], 10).unwrap();
        assert!(results.is_empty());
    }

    #[test]
    fn test_delete_existing_vector_returns_true() {
        let conn = open_test_db();
        ensure_tables_sync(&conn, "vecs", 3).unwrap();
        vector_insert_sync(&conn, "vecs", "doc-1", &[0.1, 0.2, 0.3], "{}", "t").unwrap();

        let deleted = vector_delete_sync(&conn, "vecs", "doc-1").unwrap();
        assert!(deleted, "should return true when record existed");
    }

    #[test]
    fn test_delete_nonexistent_vector_returns_false() {
        let conn = open_test_db();
        ensure_tables_sync(&conn, "vecs", 3).unwrap();

        let deleted = vector_delete_sync(&conn, "vecs", "ghost").unwrap();
        assert!(!deleted, "should return false when record did not exist");
    }

    #[test]
    fn test_deleted_vector_not_returned_in_search() {
        let conn = open_test_db();
        ensure_tables_sync(&conn, "vecs", 3).unwrap();
        vector_insert_sync(&conn, "vecs", "keep", &[1.0, 0.0, 0.0], "{}", "t").unwrap();
        vector_insert_sync(&conn, "vecs", "gone", &[0.9, 0.1, 0.0], "{}", "t").unwrap();

        vector_delete_sync(&conn, "vecs", "gone").unwrap();

        let results = vector_search_sync(&conn, "vecs", &[1.0, 0.0, 0.0], 10).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0]["custom_id"], "keep");
    }

    #[test]
    fn test_insert_and_search_persisted_data_field() {
        let conn = open_test_db();
        ensure_tables_sync(&conn, "vecs", 2).unwrap();
        let payload = r#"{"source":"unit-test","score":42}"#;
        vector_insert_sync(&conn, "vecs", "rich", &[0.5, 0.5], payload, "2024-06-01").unwrap();

        let results = vector_search_sync(&conn, "vecs", &[0.5, 0.5], 1).unwrap();
        assert_eq!(results[0]["data"], payload);
        assert_eq!(results[0]["created_at"], "2024-06-01");
    }
}
