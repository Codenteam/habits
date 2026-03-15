/**
 * @ha-bits/bit-database-sql Tauri Stub
 * 
 * Replaces the main bit for Tauri/browser bundling.
 * The bit structure is defined here, delegating operations to the driver.
 */

var driver = require('./tauri-driver');

var sqlBit = {
  displayName: 'Database / Storage (SQL/SQLite)',
  description: 'SQL database using Tauri plugin-sql',
  logoUrl: 'lucide:Database',
  replaces: '@ha-bits/bit-database',
  triggers: {},
  
  actions: {
    store: {
      name: 'store',
      displayName: 'Store Value',
      description: 'Store a value with a key',
      props: {
        collection: { type: 'SHORT_TEXT', displayName: 'Collection', required: true, defaultValue: 'default' },
        key: { type: 'SHORT_TEXT', displayName: 'Key', required: true },
        value: { type: 'JSON', displayName: 'Value', required: true },
        ttl: { type: 'NUMBER', displayName: 'TTL (seconds)', required: false, defaultValue: 0 },
        database: { type: 'SHORT_TEXT', displayName: 'Database', required: false, defaultValue: 'habits.db' },
      },
      run: function(ctx) { return driver.store(ctx.propsValue); }
    },
    get: {
      name: 'get',
      displayName: 'Get Value',
      description: 'Retrieve a value by key',
      props: {
        collection: { type: 'SHORT_TEXT', displayName: 'Collection', required: true, defaultValue: 'default' },
        key: { type: 'SHORT_TEXT', displayName: 'Key', required: true },
        defaultValue: { type: 'JSON', displayName: 'Default', required: false },
        database: { type: 'SHORT_TEXT', displayName: 'Database', required: false, defaultValue: 'habits.db' },
      },
      run: function(ctx) { return driver.get(ctx.propsValue); }
    },
    delete: {
      name: 'delete',
      displayName: 'Delete Value',
      description: 'Delete a value by key',
      props: {
        collection: { type: 'SHORT_TEXT', displayName: 'Collection', required: true, defaultValue: 'default' },
        key: { type: 'SHORT_TEXT', displayName: 'Key', required: true },
        database: { type: 'SHORT_TEXT', displayName: 'Database', required: false, defaultValue: 'habits.db' },
      },
      run: function(ctx) { return driver.del(ctx.propsValue); }
    },
    list: {
      name: 'list',
      displayName: 'List Keys',
      description: 'List all keys in a collection',
      props: {
        collection: { type: 'SHORT_TEXT', displayName: 'Collection', required: true, defaultValue: 'default' },
        prefix: { type: 'SHORT_TEXT', displayName: 'Prefix', required: false },
        limit: { type: 'NUMBER', displayName: 'Limit', required: false, defaultValue: 100 },
        database: { type: 'SHORT_TEXT', displayName: 'Database', required: false, defaultValue: 'habits.db' },
      },
      run: function(ctx) { return driver.list(ctx.propsValue); }
    },
    insert: {
      name: 'insert',
      displayName: 'Insert Document',
      description: 'Insert a document with auto-generated ID',
      props: {
        collection: { type: 'SHORT_TEXT', displayName: 'Collection', required: true },
        document: { type: 'JSON', displayName: 'Document', required: true },
        database: { type: 'SHORT_TEXT', displayName: 'Database', required: false, defaultValue: 'habits.db' },
      },
      run: function(ctx) { return driver.insert(ctx.propsValue); }
    },
    update: {
      name: 'update',
      displayName: 'Update Document',
      description: 'Update a document matching a filter',
      props: {
        collection: { type: 'SHORT_TEXT', displayName: 'Collection', required: true },
        filter: { type: 'JSON', displayName: 'Filter', required: true },
        update: { type: 'JSON', displayName: 'Update', required: true },
        database: { type: 'SHORT_TEXT', displayName: 'Database', required: false, defaultValue: 'habits.db' },
      },
      run: function(ctx) { return driver.update(ctx.propsValue); }
    },
    query: {
      name: 'query',
      displayName: 'Query Documents',
      description: 'Query documents with filters',
      props: {
        collection: { type: 'SHORT_TEXT', displayName: 'Collection', required: true },
        filter: { type: 'JSON', displayName: 'Filter', required: false, defaultValue: '{}' },
        limit: { type: 'NUMBER', displayName: 'Limit', required: false, defaultValue: 100 },
        database: { type: 'SHORT_TEXT', displayName: 'Database', required: false, defaultValue: 'habits.db' },
      },
      run: function(ctx) { return driver.query(ctx.propsValue); }
    },
    increment: {
      name: 'increment',
      displayName: 'Increment Value',
      description: 'Increment a numeric value',
      props: {
        collection: { type: 'SHORT_TEXT', displayName: 'Collection', required: true, defaultValue: 'counters' },
        key: { type: 'SHORT_TEXT', displayName: 'Key', required: true },
        amount: { type: 'NUMBER', displayName: 'Amount', required: false, defaultValue: 1 },
        database: { type: 'SHORT_TEXT', displayName: 'Database', required: false, defaultValue: 'habits.db' },
      },
      run: function(ctx) { return driver.increment(ctx.propsValue); }
    },
  },
};

module.exports = sqlBit;
module.exports.default = sqlBit;
module.exports.databaseSql = sqlBit;
