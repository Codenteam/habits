/**
 * Guest-side bindings for tauri-plugin-sqlite-vec.
 *
 * Every function maps 1-to-1 to a Tauri command defined in commands.rs.
 * Callers must have the appropriate permissions granted in their
 * tauri.conf.json (e.g. "sqlite-vec:allow-ensure-tables").
 */
import { invoke } from "@tauri-apps/api/core";

export interface SearchResult {
  rowid: number;
  distance: number;
  custom_id: string;
  data: string;
  created_at: string;
}

/**
 * Create (or validate) the virtual vector table for a named collection.
 *
 * @param database   - SQLite file name relative to the app data directory.
 * @param collection - Identifier for the vector collection (alphanumeric / _).
 * @param dim        - Embedding dimension. Must be consistent across calls.
 */
export function ensureTables(
  database: string,
  collection: string,
  dim: number
): Promise<void> {
  return invoke("plugin:sqlite-vec|ensure_tables", {
    database,
    collection,
    dim,
  });
}

/**
 * Insert a vector into a collection.
 *
 * @returns The internal row id assigned to the inserted vector.
 */
export function vectorInsert(
  database: string,
  collection: string,
  customId: string,
  vector: number[],
  data: string,
  now: string
): Promise<number> {
  return invoke<number>("plugin:sqlite-vec|vector_insert", {
    database,
    collection,
    custom_id: customId,
    vector,
    data,
    now,
  });
}

/**
 * Search for the nearest vectors.
 *
 * @param distance - One of `"l2"` (default KNN), `"cosine"`, or `"l1"`.
 * @param limit    - Maximum number of results to return.
 */
export function vectorSearch(
  database: string,
  collection: string,
  vector: number[],
  distance: "l2" | "cosine" | "l1",
  limit: number
): Promise<SearchResult[]> {
  return invoke<SearchResult[]>("plugin:sqlite-vec|vector_search", {
    database,
    collection,
    vector,
    distance,
    limit,
  });
}

/**
 * Delete a vector by its custom id.
 *
 * @returns `true` when the record existed and was deleted, `false` otherwise.
 */
export function vectorDelete(
  database: string,
  collection: string,
  id: string
): Promise<boolean> {
  return invoke<boolean>("plugin:sqlite-vec|vector_delete", {
    database,
    collection,
    id,
  });
}
