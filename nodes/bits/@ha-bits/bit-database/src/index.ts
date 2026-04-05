/**
 * @ha-bits/bit-database
 * 
 * Database/storage bit for persisting data in workflows.
 * Supports key-value storage, document storage, and simple querying.
 * 
 * This is the base in-memory implementation. It can be replaced by:
 * - @ha-bits/bit-database-mongodb: MongoDB storage
 * - @ha-bits/bit-database-sql: sql storage
 */

// Export types for child bits to implement
export interface DatabaseRecord {
  value: any;
  createdAt: string;
  updatedAt?: string;
  expiresAt: string | null;
}

export interface StoreParams {
  collection: string;
  key: string;
  value: any;
  ttl?: number;
}

export interface GetParams {
  collection: string;
  key: string;
  defaultValue?: any;
}

export interface DeleteParams {
  collection: string;
  key: string;
}

export interface ListParams {
  collection: string;
  prefix?: string;
  limit?: number;
}

export interface InsertParams {
  collection: string;
  document: any;
}

export interface UpdateParams {
  collection: string;
  filter: Record<string, any>;
  update: Record<string, any>;
}

export interface QueryParams {
  collection: string;
  filter?: Record<string, any>;
  limit?: number;
}

export interface IncrementParams {
  collection: string;
  key: string;
  amount?: number;
}

export interface StoreResult {
  success: boolean;
  collection: string;
  key: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface GetResult {
  found: boolean;
  value: any;
  expired?: boolean;
  createdAt?: string;
  expiresAt?: string | null;
}

export interface DeleteResult {
  success: boolean;
  deleted: boolean;
  collection: string;
  key: string;
}

export interface ListResult {
  collection: string;
  keys: string[];
  count: number;
}

export interface InsertResult {
  success: boolean;
  id: string;
  collection: string;
  document: any;
  createdAt: string;
}

export interface UpdateResult {
  success: boolean;
  matched: number;
  modified: number;
  collection: string;
  document?: any;
  updatedAt?: string;
}

export interface QueryResult {
  collection: string;
  results: any[];
  count: number;
}

export interface IncrementResult {
  collection: string;
  key: string;
  previousValue: number;
  newValue: number;
  amount: number;
}

interface DatabaseContext {
  propsValue: Record<string, any>;
}

// In-memory storage for demo purposes
// In production, this would connect to actual databases
const memoryStore: Map<string, Map<string, any>> = new Map();

function getCollection(name: string): Map<string, any> {
  if (!memoryStore.has(name)) {
    memoryStore.set(name, new Map());
  }
  return memoryStore.get(name)!;
}

const databaseBit = {
  displayName: 'Database / Storage (Memory)',
  description: 'Store and retrieve data in workflows using in-memory storage',
  logoUrl: 'lucide:Database',
  runtime: 'all',
  
  /**
   * Declares which bits can replace this one.
   * These bits implement the same interface but with different storage backends.
   */
  replaceableBy: [
    '@ha-bits/bit-database-mongodb',
    '@ha-bits/bit-database-sql',
  ],
  
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
        
        const coll = getCollection(String(collection));
        
        let parsedValue = value;
        if (typeof value === 'string') {
          try {
            parsedValue = JSON.parse(value);
          } catch {
            parsedValue = value;
          }
        }
        
        const record = {
          value: parsedValue,
          createdAt: new Date().toISOString(),
          expiresAt: ttl ? new Date(Date.now() + Number(ttl) * 1000).toISOString() : null,
        };
        
        coll.set(String(key), record);
        
        console.log(`💾 Database Store: ${collection}/${key}`);
        
        return {
          success: true,
          collection: String(collection),
          key: String(key),
          createdAt: record.createdAt,
          expiresAt: record.expiresAt,
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
        
        const coll = getCollection(String(collection));
        const record = coll.get(String(key));
        
        // Check expiry
        if (record?.expiresAt && new Date(record.expiresAt) < new Date()) {
          coll.delete(String(key));
          console.log(`💾 Database Get: ${collection}/${key} (expired)`);
          return {
            found: false,
            value: defaultValue || null,
            expired: true,
          };
        }
        
        if (!record) {
          console.log(`💾 Database Get: ${collection}/${key} (not found)`);
          return {
            found: false,
            value: defaultValue || null,
          };
        }
        
        console.log(`💾 Database Get: ${collection}/${key}`);
        
        return {
          found: true,
          value: record.value,
          createdAt: record.createdAt,
          expiresAt: record.expiresAt,
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
        
        const coll = getCollection(String(collection));
        const existed = coll.has(String(key));
        coll.delete(String(key));
        
        console.log(`💾 Database Delete: ${collection}/${key}`);
        
        return {
          success: true,
          deleted: existed,
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
        
        const coll = getCollection(String(collection));
        let keys = Array.from(coll.keys());
        
        if (prefix) {
          keys = keys.filter(k => k.startsWith(String(prefix)));
        }
        
        keys = keys.slice(0, Number(limit));
        
        console.log(`💾 Database List: ${collection} (${keys.length} keys)`);
        
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
        
        const coll = getCollection(String(collection));
        const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
        let doc = document;
        if (typeof document === 'string') {
          try {
            doc = JSON.parse(document);
          } catch {
            doc = { data: document };
          }
        }
        
        const record = {
          value: { ...doc, _id: id },
          createdAt: new Date().toISOString(),
          expiresAt: null,
        };
        
        coll.set(id, record);
        
        console.log(`💾 Database Insert: ${collection}/${id}`);
        
        return {
          success: true,
          id,
          collection: String(collection),
          document: record.value,
          createdAt: record.createdAt,
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
        
        const coll = getCollection(String(collection));
        
        let filterObj: Record<string, any> = {};
        if (filter) {
          filterObj = typeof filter === 'string' ? JSON.parse(filter) : filter;
        }
        
        let updateObj: Record<string, any> = {};
        if (update) {
          updateObj = typeof update === 'string' ? JSON.parse(update) : update;
        }
        
        // Find matching document
        let matchedKey: string | null = null;
        let matchedRecord: any = null;
        
        for (const [key, record] of coll.entries()) {
          // Skip expired
          if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
            continue;
          }
          
          // Check filter
          let matches = true;
          for (const [k, v] of Object.entries(filterObj)) {
            if (record.value?.[k] !== v) {
              matches = false;
              break;
            }
          }
          
          if (matches) {
            matchedKey = key;
            matchedRecord = record;
            break;
          }
        }
        
        if (!matchedKey || !matchedRecord) {
          console.log(`💾 Database Update: ${collection} - no matching document found`);
          return {
            success: false,
            matched: 0,
            modified: 0,
            collection: String(collection),
          };
        }
        
        // Apply update
        const updatedValue = { ...matchedRecord.value, ...updateObj };
        const updatedRecord = {
          ...matchedRecord,
          value: updatedValue,
          updatedAt: new Date().toISOString(),
        };
        
        coll.set(matchedKey, updatedRecord);
        
        console.log(`💾 Database Update: ${collection}/${matchedKey}`);
        
        return {
          success: true,
          matched: 1,
          modified: 1,
          collection: String(collection),
          document: updatedValue,
          updatedAt: updatedRecord.updatedAt,
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
        
        const coll = getCollection(String(collection));
        
        let filterObj: Record<string, any> = {};
        if (filter) {
          filterObj = typeof filter === 'string' ? JSON.parse(filter) : filter;
        }
        
        const results: any[] = [];
        
        for (const [key, record] of coll.entries()) {
          // Skip expired
          if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
            continue;
          }
          
          // Check filter
          let matches = true;
          for (const [k, v] of Object.entries(filterObj)) {
            if (record.value?.[k] !== v) {
              matches = false;
              break;
            }
          }
          
          if (matches) {
            results.push({ key, ...record.value, _createdAt: record.createdAt });
            if (results.length >= Number(limit)) break;
          }
        }
        
        console.log(`💾 Database Query: ${collection} (${results.length} results)`);
        
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
        
        const coll = getCollection(String(collection));
        const existing = coll.get(String(key));
        
        const currentValue = existing?.value || 0;
        const newValue = Number(currentValue) + Number(amount);
        
        coll.set(String(key), {
          value: newValue,
          createdAt: existing?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: null,
        });
        
        console.log(`💾 Database Increment: ${collection}/${key} = ${newValue}`);
        
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

export const database = databaseBit;
export default databaseBit;
