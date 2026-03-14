/**
 * Browser-compatible PouchDB stub
 * 
 * This file is used instead of pouchdb-node when bundling for browser/Tauri.
 * PouchDB's browser build uses IndexedDB instead of LevelDB.
 */

// @ts-ignore - pouchdb types differ slightly from pouchdb-node
import PouchDB from 'pouchdb';

// Re-export as default - API is compatible
export default PouchDB;
