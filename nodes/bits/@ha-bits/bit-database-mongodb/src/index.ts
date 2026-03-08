/**
 * @ha-bits/bit-database-mongodb
 * 
 * MongoDB database storage bit.
 * This bit replaces @ha-bits/bit-database with MongoDB persistence.
 * 
 * Import types from parent to ensure interface compatibility.
 */

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

import { MongoClient, Db } from 'mongodb';

interface DatabaseContext {
  propsValue: Record<string, any>;
}

// MongoDB connection state
let client: MongoClient | null = null;
let db: Db | null = null;

async function getDb(): Promise<Db> {
  if (db) return db;
  
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DATABASE || 'habits_db';
  
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  
  console.log(`💾 MongoDB connected: ${dbName}`);
  return db;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

function parseValue(value: any): any {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function parseFilter(filter: any): Record<string, any> {
  if (!filter) return {};
  if (typeof filter === 'string') {
    try {
      return JSON.parse(filter);
    } catch {
      return {};
    }
  }
  return filter;
}

const databaseMongoDBBit = {
  displayName: 'Database / Storage (MongoDB)',
  description: 'Store and retrieve data in workflows using MongoDB',
  logoUrl: 'lucide:Database',
  
  /**
   * Declares which bit this one can replace.
   * The UI will show this as an alternative to the parent bit.
   */
  replaces: '@ha-bits/bit-database',
  
  /**
   * Connection properties specific to MongoDB
   */
  auth: {
    uri: {
      type: 'SHORT_TEXT',
      displayName: 'MongoDB URI',
      description: 'MongoDB connection string (default: mongodb://localhost:27017)',
      required: false,
    },
    database: {
      type: 'SHORT_TEXT',
      displayName: 'Database Name',
      description: 'MongoDB database name (default: habits_db)',
      required: false,
    },
  },
  
  actions: {
    /**
     * Store a value
     */
    store: {
      name: 'store',
      displayName: 'Store Value',
      description: 'Store a value with a key',
      props: {
        collection: {
          type: 'SHORT_TEXT',
          displayName: 'Collection',
          description: 'Collection/table name',
          required: true,
          defaultValue: 'default',
        },
        key: {
          type: 'SHORT_TEXT',
          displayName: 'Key',
          description: 'Unique key for the value',
          required: true,
        },
        value: {
          type: 'JSON',
          displayName: 'Value',
          description: 'The value to store (can be any JSON)',
          required: true,
        },
        ttl: {
          type: 'NUMBER',
          displayName: 'TTL (seconds)',
          description: 'Time to live in seconds (0 = no expiry)',
          required: false,
          defaultValue: 0,
        },
      },
      async run(context: DatabaseContext): Promise<StoreResult> {
        const { collection = 'default', key, value, ttl } = context.propsValue;
        
        const database = await getDb();
        const coll = database.collection(String(collection));
        const parsedValue = parseValue(value);
        const now = new Date();
        
        const record = {
          _key: String(key),
          value: parsedValue,
          createdAt: now,
          expiresAt: ttl ? new Date(now.getTime() + Number(ttl) * 1000) : null,
        };
        
        await coll.updateOne(
          { _key: String(key) },
          { $set: record },
          { upsert: true }
        );
        
        // Create TTL index if ttl is set
        if (ttl) {
          try {
            await coll.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
          } catch {
            // Index might already exist
          }
        }
        
        console.log(`💾 MongoDB Store: ${collection}/${key}`);
        
        return {
          success: true,
          collection: String(collection),
          key: String(key),
          createdAt: record.createdAt.toISOString(),
          expiresAt: record.expiresAt?.toISOString() || null,
        };
      },
    },
    
    /**
     * Get a value
     */
    get: {
      name: 'get',
      displayName: 'Get Value',
      description: 'Retrieve a value by key',
      props: {
        collection: {
          type: 'SHORT_TEXT',
          displayName: 'Collection',
          description: 'Collection/table name',
          required: true,
          defaultValue: 'default',
        },
        key: {
          type: 'SHORT_TEXT',
          displayName: 'Key',
          description: 'Key to retrieve',
          required: true,
        },
        defaultValue: {
          type: 'JSON',
          displayName: 'Default Value',
          description: 'Value to return if key not found',
          required: false,
        },
      },
      async run(context: DatabaseContext): Promise<GetResult> {
        const { collection = 'default', key, defaultValue } = context.propsValue;
        
        const database = await getDb();
        const coll = database.collection(String(collection));
        const record = await coll.findOne({ _key: String(key) });
        
        if (!record) {
          console.log(`💾 MongoDB Get: ${collection}/${key} (not found)`);
          return {
            found: false,
            value: defaultValue || null,
          };
        }
        
        // Check expiry
        if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
          console.log(`💾 MongoDB Get: ${collection}/${key} (expired)`);
          return {
            found: false,
            value: defaultValue || null,
            expired: true,
          };
        }
        
        console.log(`💾 MongoDB Get: ${collection}/${key}`);
        
        return {
          found: true,
          value: record.value,
          createdAt: record.createdAt?.toISOString?.() || record.createdAt,
          expiresAt: record.expiresAt?.toISOString?.() || null,
        };
      },
    },
    
    /**
     * Delete a value
     */
    delete: {
      name: 'delete',
      displayName: 'Delete Value',
      description: 'Delete a value by key',
      props: {
        collection: {
          type: 'SHORT_TEXT',
          displayName: 'Collection',
          description: 'Collection/table name',
          required: true,
          defaultValue: 'default',
        },
        key: {
          type: 'SHORT_TEXT',
          displayName: 'Key',
          description: 'Key to delete',
          required: true,
        },
      },
      async run(context: DatabaseContext): Promise<DeleteResult> {
        const { collection = 'default', key } = context.propsValue;
        
        const database = await getDb();
        const coll = database.collection(String(collection));
        const result = await coll.deleteOne({ _key: String(key) });
        
        console.log(`💾 MongoDB Delete: ${collection}/${key}`);
        
        return {
          success: true,
          deleted: result.deletedCount > 0,
          collection: String(collection),
          key: String(key),
        };
      },
    },
    
    /**
     * List all keys in a collection
     */
    list: {
      name: 'list',
      displayName: 'List Keys',
      description: 'List all keys in a collection',
      props: {
        collection: {
          type: 'SHORT_TEXT',
          displayName: 'Collection',
          description: 'Collection/table name',
          required: true,
          defaultValue: 'default',
        },
        prefix: {
          type: 'SHORT_TEXT',
          displayName: 'Key Prefix',
          description: 'Filter keys by prefix (optional)',
          required: false,
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Limit',
          description: 'Maximum number of keys to return',
          required: false,
          defaultValue: 100,
        },
      },
      async run(context: DatabaseContext): Promise<ListResult> {
        const { collection = 'default', prefix, limit = 100 } = context.propsValue;
        
        const database = await getDb();
        const coll = database.collection(String(collection));
        
        const filter: any = {};
        if (prefix) {
          filter._key = { $regex: `^${prefix}` };
        }
        
        const docs = await coll
          .find(filter, { projection: { _key: 1 } })
          .limit(Number(limit))
          .toArray();
        
        const keys = docs.map((d: any) => d._key);
        
        console.log(`💾 MongoDB List: ${collection} (${keys.length} keys)`);
        
        return {
          collection: String(collection),
          keys,
          count: keys.length,
        };
      },
    },
    
    /**
     * Insert a document with auto-generated ID
     */
    insert: {
      name: 'insert',
      displayName: 'Insert Document',
      description: 'Insert a document with auto-generated ID',
      props: {
        collection: {
          type: 'SHORT_TEXT',
          displayName: 'Collection',
          description: 'Collection/table name',
          required: true,
        },
        document: {
          type: 'JSON',
          displayName: 'Document',
          description: 'The document to insert',
          required: true,
        },
      },
      async run(context: DatabaseContext): Promise<InsertResult> {
        const { collection, document } = context.propsValue;
        
        const database = await getDb();
        const coll = database.collection(String(collection));
        const id = generateId();
        
        let doc = parseValue(document);
        if (typeof doc !== 'object' || doc === null) {
          doc = { data: doc };
        }
        
        const now = new Date();
        const record = {
          _key: id,
          ...doc,
          _id: id,
          createdAt: now,
        };
        
        await coll.insertOne(record);
        
        console.log(`💾 MongoDB Insert: ${collection}/${id}`);
        
        return {
          success: true,
          id,
          collection: String(collection),
          document: { ...doc, _id: id },
          createdAt: now.toISOString(),
        };
      },
    },
    
    /**
     * Update a document by filter
     */
    update: {
      name: 'update',
      displayName: 'Update Document',
      description: 'Update a document matching a filter',
      props: {
        collection: {
          type: 'SHORT_TEXT',
          displayName: 'Collection',
          description: 'Collection/table name',
          required: true,
        },
        filter: {
          type: 'JSON',
          displayName: 'Filter',
          description: 'Filter criteria to find document (e.g., {"_id": "abc123"})',
          required: true,
        },
        update: {
          type: 'JSON',
          displayName: 'Update',
          description: 'Fields to update',
          required: true,
        },
      },
      async run(context: DatabaseContext): Promise<UpdateResult> {
        const { collection, filter, update } = context.propsValue;
        
        const database = await getDb();
        const coll = database.collection(String(collection));
        const filterObj = parseFilter(filter);
        const updateObj = parseFilter(update);
        
        // Convert _id filter to _key if needed
        const mongoFilter: any = {};
        for (const [k, v] of Object.entries(filterObj)) {
          if (k === '_id') {
            mongoFilter._key = v;
          } else {
            mongoFilter[k] = v;
          }
        }
        
        const now = new Date();
        const result = await coll.findOneAndUpdate(
          mongoFilter,
          { $set: { ...updateObj, updatedAt: now } },
          { returnDocument: 'after' }
        );
        
        if (!result) {
          console.log(`💾 MongoDB Update: ${collection} - no matching document found`);
          return {
            success: false,
            matched: 0,
            modified: 0,
            collection: String(collection),
          };
        }
        
        console.log(`💾 MongoDB Update: ${collection}/${result._key}`);
        
        const { _id: mongoId, _key, createdAt, updatedAt, ...docFields } = result;
        
        return {
          success: true,
          matched: 1,
          modified: 1,
          collection: String(collection),
          document: { ...docFields, _id: _key },
          updatedAt: now.toISOString(),
        };
      },
    },
    
    /**
     * Query documents (simple filter)
     */
    query: {
      name: 'query',
      displayName: 'Query Documents',
      description: 'Query documents with simple filters',
      props: {
        collection: {
          type: 'SHORT_TEXT',
          displayName: 'Collection',
          description: 'Collection/table name',
          required: true,
        },
        filter: {
          type: 'JSON',
          displayName: 'Filter',
          description: 'Filter criteria as JSON (e.g., {"status": "active"})',
          required: false,
          defaultValue: '{}',
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Limit',
          description: 'Maximum results to return',
          required: false,
          defaultValue: 100,
        },
      },
      async run(context: DatabaseContext): Promise<QueryResult> {
        const { collection, filter, limit = 100 } = context.propsValue;
        
        const database = await getDb();
        const coll = database.collection(String(collection));
        const filterObj = parseFilter(filter);
        
        // Convert _id filter to _key if needed
        const mongoFilter: any = {};
        for (const [k, v] of Object.entries(filterObj)) {
          if (k === '_id') {
            mongoFilter._key = v;
          } else {
            mongoFilter[k] = v;
          }
        }
        
        const docs = await coll
          .find(mongoFilter)
          .limit(Number(limit))
          .toArray();
        
        const results = docs.map((doc: any) => {
          const { _id: mongoId, _key, createdAt, ...fields } = doc;
          return {
            key: _key,
            ...fields,
            _id: _key,
            _createdAt: createdAt?.toISOString?.() || createdAt,
          };
        });
        
        console.log(`💾 MongoDB Query: ${collection} (${results.length} results)`);
        
        return {
          collection: String(collection),
          results,
          count: results.length,
        };
      },
    },
    
    /**
     * Increment a numeric value
     */
    increment: {
      name: 'increment',
      displayName: 'Increment Value',
      description: 'Increment a numeric value by a given amount',
      props: {
        collection: {
          type: 'SHORT_TEXT',
          displayName: 'Collection',
          description: 'Collection/table name',
          required: true,
          defaultValue: 'counters',
        },
        key: {
          type: 'SHORT_TEXT',
          displayName: 'Key',
          description: 'Counter key',
          required: true,
        },
        amount: {
          type: 'NUMBER',
          displayName: 'Amount',
          description: 'Amount to increment (can be negative)',
          required: false,
          defaultValue: 1,
        },
      },
      async run(context: DatabaseContext): Promise<IncrementResult> {
        const { collection = 'counters', key, amount = 1 } = context.propsValue;
        
        const database = await getDb();
        const coll = database.collection(String(collection));
        
        // Get current value
        const existing = await coll.findOne({ _key: String(key) });
        const currentValue = existing?.value || 0;
        const newValue = Number(currentValue) + Number(amount);
        
        const now = new Date();
        await coll.updateOne(
          { _key: String(key) },
          {
            $set: {
              _key: String(key),
              value: newValue,
              updatedAt: now,
            },
            $setOnInsert: {
              createdAt: now,
            },
          },
          { upsert: true }
        );
        
        console.log(`💾 MongoDB Increment: ${collection}/${key} = ${newValue}`);
        
        return {
          collection: String(collection),
          key: String(key),
          previousValue: currentValue,
          newValue,
          amount: Number(amount),
        };
      },
    },
  },
  
  triggers: {},
};

export const databaseMongoDB = databaseMongoDBBit;
export default databaseMongoDBBit;

// Cleanup function
export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('💾 MongoDB connection closed');
  }
}
