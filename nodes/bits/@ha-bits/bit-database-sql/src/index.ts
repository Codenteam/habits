/**
 * @ha-bits/bit-database-sql
 * 
 * SQL database storage bit using Drizzle ORM.
 * This bit replaces @ha-bits/bit-database with SQL persistence using SQLite.
 * 
 * Environments:
 * - Node.js: Uses better-sqlite3 via driver.ts
 * - Browser/Tauri: Uses stubs/tauri-driver.js (via bundle alias substitution)
 */

// TODO: Some typings aren't working, try to fix that later. For now we can use 'as any' in driver calls. Maybe we can match to bit-database for both nosql/sql.

import type {
  StoreResult,
  GetResult,
  DeleteResult,
  ListResult,
  InsertResult,
  UpdateResult,
  QueryResult,
  IncrementResult,
} from '@ha-bits/bit-database';

export type { VectorSearchResult } from './driver';
import type { VectorSearchResult } from './driver';

// Relative import - bundle generator's plugin will intercept and stub for Tauri
import * as driver from './driver';

interface DatabaseContext {
  propsValue: Record<string, any>;
}

const sqlBit = {
  displayName: 'Database / Storage (SQL/SQLite)',
  description: 'Store and retrieve data in workflows using SQLite with Drizzle ORM',
  logoUrl: 'lucide:Database',
  runtime: 'all',
  replaces: '@ha-bits/bit-database',
  
  actions: {
    store: {
      name: 'store',
      displayName: 'Store Value',
      description: 'Store a value with a key in SQLite',
      props: {
        collection: { type: 'SHORT_TEXT', displayName: 'Collection/Table', required: true, defaultValue: 'default' },
        key: { type: 'SHORT_TEXT', displayName: 'Key', required: true },
        value: { type: 'JSON', displayName: 'Value', required: true },
        ttl: { type: 'NUMBER', displayName: 'TTL (seconds)', required: false, defaultValue: 0 },
        database: { type: 'SHORT_TEXT', displayName: 'Database File', required: false, defaultValue: 'habits-cortex.db' },
      },
      async run(context: DatabaseContext): Promise<StoreResult> {
        return driver.store(context.propsValue as any);
      },
    },
    
    get: {
      name: 'get',
      displayName: 'Get Value',
      description: 'Retrieve a value by key from SQLite',
      props: {
        collection: { type: 'SHORT_TEXT', displayName: 'Collection/Table', required: true, defaultValue: 'default' },
        key: { type: 'SHORT_TEXT', displayName: 'Key', required: true },
        defaultValue: { type: 'JSON', displayName: 'Default Value', required: false },
        database: { type: 'SHORT_TEXT', displayName: 'Database File', required: false, defaultValue: 'habits-cortex.db' },
      },
      async run(context: DatabaseContext): Promise<GetResult> {
        return driver.get(context.propsValue as any);
      },
    },
    
    delete: {
      name: 'delete',
      displayName: 'Delete Value',
      description: 'Delete a value by key from SQLite',
      props: {
        collection: { type: 'SHORT_TEXT', displayName: 'Collection/Table', required: true, defaultValue: 'default' },
        key: { type: 'SHORT_TEXT', displayName: 'Key', required: true },
        database: { type: 'SHORT_TEXT', displayName: 'Database File', required: false, defaultValue: 'habits-cortex.db' },
      },
      async run(context: DatabaseContext): Promise<DeleteResult> {
        return driver.del(context.propsValue as any);
      },
    },
    
    list: {
      name: 'list',
      displayName: 'List Keys',
      description: 'List all keys in a collection from SQLite',
      props: {
        collection: { type: 'SHORT_TEXT', displayName: 'Collection/Table', required: true, defaultValue: 'default' },
        prefix: { type: 'SHORT_TEXT', displayName: 'Key Prefix', required: false },
        limit: { type: 'NUMBER', displayName: 'Limit', required: false, defaultValue: 100 },
        database: { type: 'SHORT_TEXT', displayName: 'Database File', required: false, defaultValue: 'habits-cortex.db' },
      },
      async run(context: DatabaseContext): Promise<ListResult> {
        return driver.list(context.propsValue as any);
      },
    },
    
    insert: {
      name: 'insert',
      displayName: 'Insert Document',
      description: 'Insert a document with auto-generated ID into SQLite',
      props: {
        collection: { type: 'SHORT_TEXT', displayName: 'Collection/Table', required: true },
        document: { type: 'JSON', displayName: 'Document', required: true },
        database: { type: 'SHORT_TEXT', displayName: 'Database File', required: false, defaultValue: 'habits-cortex.db' },
      },
      async run(context: DatabaseContext): Promise<InsertResult> {
        return driver.insert(context.propsValue as any);
      },
    },
    
    update: {
      name: 'update',
      displayName: 'Update Document',
      description: 'Update a document matching a filter in SQLite',
      props: {
        collection: { type: 'SHORT_TEXT', displayName: 'Collection/Table', required: true },
        filter: { type: 'JSON', displayName: 'Filter', required: true },
        update: { type: 'JSON', displayName: 'Update', required: true },
        database: { type: 'SHORT_TEXT', displayName: 'Database File', required: false, defaultValue: 'habits-cortex.db' },
      },
      async run(context: DatabaseContext): Promise<UpdateResult> {
        return driver.update(context.propsValue as any);
      },
    },
    
    query: {
      name: 'query',
      displayName: 'Query Documents',
      description: 'Query documents with simple filters from SQLite',
      props: {
        collection: { type: 'SHORT_TEXT', displayName: 'Collection/Table', required: true },
        filter: { type: 'JSON', displayName: 'Filter', required: false, defaultValue: '{}' },
        limit: { type: 'NUMBER', displayName: 'Limit', required: false, defaultValue: 100 },
        database: { type: 'SHORT_TEXT', displayName: 'Database File', required: false, defaultValue: 'habits-cortex.db' },
      },
      async run(context: DatabaseContext): Promise<QueryResult> {
        return driver.query(context.propsValue as any);
      },
    },
    
    increment: {
      name: 'increment',
      displayName: 'Increment Value',
      description: 'Increment a numeric value by a given amount in SQLite',
      props: {
        collection: { type: 'SHORT_TEXT', displayName: 'Collection/Table', required: true, defaultValue: 'counters' },
        key: { type: 'SHORT_TEXT', displayName: 'Key', required: true },
        amount: { type: 'NUMBER', displayName: 'Amount', required: false, defaultValue: 1 },
        database: { type: 'SHORT_TEXT', displayName: 'Database File', required: false, defaultValue: 'habits-cortex.db' },
      },
      async run(context: DatabaseContext): Promise<IncrementResult> {
        return driver.increment(context.propsValue as any);
      },
    },
    
    deleteDoc: {
      name: 'deleteDoc',
      displayName: 'Delete Document',
      description: 'Delete a document by ID from SQLite',
      props: {
        collection: { type: 'SHORT_TEXT', displayName: 'Collection/Table', required: true },
        id: { type: 'SHORT_TEXT', displayName: 'Document ID', required: true },
        database: { type: 'SHORT_TEXT', displayName: 'Database File', required: false, defaultValue: 'habits-cortex.db' },
      },
      async run(context: DatabaseContext): Promise<DeleteResult> {
        return driver.deleteDoc(context.propsValue as any);
      },
    },

    vectorInsert: {
      name: 'vectorInsert',
      displayName: 'Vector Insert',
      description: 'Insert a document with an embedding vector into a sqlite-vec virtual table',
      props: {
        collection: { type: 'SHORT_TEXT', displayName: 'Collection', required: true },
        document:   { type: 'JSON',       displayName: 'Document (must include .vector: number[])', required: true },
        database:   { type: 'SHORT_TEXT', displayName: 'Database File', required: false, defaultValue: 'habits-cortex.db' },
      },
      async run(context: DatabaseContext): Promise<InsertResult> {
        return driver.vectorInsert(context.propsValue as any);
      },
    },

    vectorSearch: {
      name: 'vectorSearch',
      displayName: 'Vector Search',
      description: 'Find top-K most similar documents via sqlite-vec (L2, cosine, or L1)',
      props: {
        collection: { type: 'SHORT_TEXT', displayName: 'Collection', required: true },
        vector:     { type: 'JSON',       displayName: 'Query Vector (number[])', required: true },
        limit:      { type: 'NUMBER',     displayName: 'Top K', required: false, defaultValue: 10 },
        distance:   { type: 'SHORT_TEXT', displayName: 'Distance (l2|cosine|l1)', required: false, defaultValue: 'l2' },
        filter:     { type: 'JSON',       displayName: 'Metadata filter', required: false, defaultValue: '{}' },
        database:   { type: 'SHORT_TEXT', displayName: 'Database File', required: false, defaultValue: 'habits-cortex.db' },
      },
      async run(context: DatabaseContext): Promise<VectorSearchResult> {
        return driver.vectorSearch(context.propsValue as any);
      },
    },

    vectorDelete: {
      name: 'vectorDelete',
      displayName: 'Vector Delete',
      description: 'Delete a document from both the vector and metadata tables',
      props: {
        collection: { type: 'SHORT_TEXT', displayName: 'Collection', required: true },
        id:         { type: 'SHORT_TEXT', displayName: 'Document ID', required: true },
        database:   { type: 'SHORT_TEXT', displayName: 'Database File', required: false, defaultValue: 'habits-cortex.db' },
      },
      async run(context: DatabaseContext): Promise<DeleteResult> {
        return driver.vectorDelete(context.propsValue as any);
      },
    },
  },
  
  triggers: {},
};

export const databaseSql = sqlBit;
export default sqlBit;
