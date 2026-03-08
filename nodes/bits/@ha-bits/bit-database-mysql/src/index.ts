/**
 * @ha-bits/bit-database-mysql
 * 
 * MySQL database storage bit.
 * This bit replaces @ha-bits/bit-database with MySQL persistence.
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

import mysql from 'mysql2/promise';
import type { Pool } from 'mysql2/promise';

interface DatabaseContext {
  propsValue: Record<string, any>;
}

// MySQL connection state
let pool: Pool | null = null;
const initializedTables: Set<string> = new Set();

async function getPool(): Promise<Pool> {
  if (pool) return pool;
  
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'habits_db',
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
  });
  
  console.log(`💾 MySQL pool created`);
  return pool;
}

async function ensureTable(collection: string): Promise<void> {
  if (initializedTables.has(collection)) {
    return;
  }
  
  const p = await getPool();
  const tableName = `kv_${collection.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  
  await p.execute(`
    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
      \`_key\` VARCHAR(255) PRIMARY KEY,
      \`value\` JSON,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`expires_at\` DATETIME NULL,
      INDEX idx_expires_at (\`expires_at\`)
    )
  `);
  
  initializedTables.add(collection);
}

function getTableName(collection: string): string {
  return `kv_${collection.replace(/[^a-zA-Z0-9_]/g, '_')}`;
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

const databaseMySQLBit = {
  displayName: 'Database / Storage (MySQL)',
  description: 'Store and retrieve data in workflows using MySQL',
  logoUrl: 'lucide:Database',
  
  /**
   * Declares which bit this one can replace.
   * The UI will show this as an alternative to the parent bit.
   */
  replaces: '@ha-bits/bit-database',
  
  /**
   * Connection properties specific to MySQL
   */
  auth: {
    host: {
      type: 'SHORT_TEXT',
      displayName: 'MySQL Host',
      description: 'MySQL server host (default: localhost)',
      required: false,
    },
    port: {
      type: 'NUMBER',
      displayName: 'MySQL Port',
      description: 'MySQL server port (default: 3306)',
      required: false,
    },
    user: {
      type: 'SHORT_TEXT',
      displayName: 'Username',
      description: 'MySQL username (default: root)',
      required: false,
    },
    password: {
      type: 'SECRET_TEXT',
      displayName: 'Password',
      description: 'MySQL password',
      required: false,
    },
    database: {
      type: 'SHORT_TEXT',
      displayName: 'Database Name',
      description: 'MySQL database name (default: habits_db)',
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
        
        await ensureTable(String(collection));
        const p = await getPool();
        const tableName = getTableName(String(collection));
        
        const parsedValue = parseValue(value);
        const now = new Date();
        const expiresAt = ttl ? new Date(now.getTime() + Number(ttl) * 1000) : null;
        
        await p.execute(
          `INSERT INTO \`${tableName}\` (\`_key\`, \`value\`, \`created_at\`, \`expires_at\`)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), \`expires_at\` = VALUES(\`expires_at\`)`,
          [String(key), JSON.stringify(parsedValue), now, expiresAt]
        );
        
        console.log(`💾 MySQL Store: ${collection}/${key}`);
        
        return {
          success: true,
          collection: String(collection),
          key: String(key),
          createdAt: now.toISOString(),
          expiresAt: expiresAt?.toISOString() || null,
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
        
        await ensureTable(String(collection));
        const p = await getPool();
        const tableName = getTableName(String(collection));
        
        const [rows]: any = await p.execute(
          `SELECT \`value\`, \`created_at\`, \`expires_at\` FROM \`${tableName}\` WHERE \`_key\` = ?`,
          [String(key)]
        );
        
        if (rows.length === 0) {
          console.log(`💾 MySQL Get: ${collection}/${key} (not found)`);
          return {
            found: false,
            value: defaultValue || null,
          };
        }
        
        const record = rows[0];
        
        // Check expiry
        if (record.expires_at && new Date(record.expires_at) < new Date()) {
          await p.execute(
            `DELETE FROM \`${tableName}\` WHERE \`_key\` = ?`,
            [String(key)]
          );
          console.log(`💾 MySQL Get: ${collection}/${key} (expired)`);
          return {
            found: false,
            value: defaultValue || null,
            expired: true,
          };
        }
        
        console.log(`💾 MySQL Get: ${collection}/${key}`);
        
        return {
          found: true,
          value: record.value,
          createdAt: record.created_at?.toISOString?.() || String(record.created_at),
          expiresAt: record.expires_at?.toISOString?.() || null,
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
        
        await ensureTable(String(collection));
        const p = await getPool();
        const tableName = getTableName(String(collection));
        
        const [result]: any = await p.execute(
          `DELETE FROM \`${tableName}\` WHERE \`_key\` = ?`,
          [String(key)]
        );
        
        console.log(`💾 MySQL Delete: ${collection}/${key}`);
        
        return {
          success: true,
          deleted: result.affectedRows > 0,
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
        
        await ensureTable(String(collection));
        const p = await getPool();
        const tableName = getTableName(String(collection));
        
        let query = `SELECT \`_key\` FROM \`${tableName}\` WHERE (\`expires_at\` IS NULL OR \`expires_at\` > NOW())`;
        const queryParams: any[] = [];
        
        if (prefix) {
          query += ` AND \`_key\` LIKE ?`;
          queryParams.push(`${prefix}%`);
        }
        
        query += ` LIMIT ?`;
        queryParams.push(Number(limit));
        
        const [rows]: any = await p.execute(query, queryParams);
        const keys = rows.map((r: any) => r._key);
        
        console.log(`💾 MySQL List: ${collection} (${keys.length} keys)`);
        
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
        
        await ensureTable(String(collection));
        const p = await getPool();
        const tableName = getTableName(String(collection));
        
        const id = generateId();
        
        let doc = parseValue(document);
        if (typeof doc !== 'object' || doc === null) {
          doc = { data: doc };
        }
        
        const now = new Date();
        const docWithId = { ...doc, _id: id };
        
        await p.execute(
          `INSERT INTO \`${tableName}\` (\`_key\`, \`value\`, \`created_at\`)
           VALUES (?, ?, ?)`,
          [id, JSON.stringify(docWithId), now]
        );
        
        console.log(`💾 MySQL Insert: ${collection}/${id}`);
        
        return {
          success: true,
          id,
          collection: String(collection),
          document: docWithId,
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
        
        await ensureTable(String(collection));
        const p = await getPool();
        const tableName = getTableName(String(collection));
        
        const filterObj = parseFilter(filter);
        const updateObj = parseFilter(update);
        
        // Build WHERE clause using JSON_EXTRACT
        let whereClause = '1=1';
        const whereParams: any[] = [];
        
        for (const [k, v] of Object.entries(filterObj)) {
          whereClause += ` AND JSON_EXTRACT(\`value\`, '$.${k}') = ?`;
          whereParams.push(JSON.stringify(v));
        }
        
        whereClause += ` AND (\`expires_at\` IS NULL OR \`expires_at\` > NOW())`;
        
        // First, find the record
        const [rows]: any = await p.execute(
          `SELECT \`_key\`, \`value\` FROM \`${tableName}\` WHERE ${whereClause} LIMIT 1`,
          whereParams
        );
        
        if (rows.length === 0) {
          console.log(`💾 MySQL Update: ${collection} - no matching document found`);
          return {
            success: false,
            matched: 0,
            modified: 0,
            collection: String(collection),
          };
        }
        
        const record = rows[0];
        const existingValue = record.value;
        const updatedValue = { ...existingValue, ...updateObj };
        const now = new Date();
        
        await p.execute(
          `UPDATE \`${tableName}\` SET \`value\` = ?, \`updated_at\` = ? WHERE \`_key\` = ?`,
          [JSON.stringify(updatedValue), now, record._key]
        );
        
        console.log(`💾 MySQL Update: ${collection}/${record._key}`);
        
        return {
          success: true,
          matched: 1,
          modified: 1,
          collection: String(collection),
          document: updatedValue,
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
        
        await ensureTable(String(collection));
        const p = await getPool();
        const tableName = getTableName(String(collection));
        
        const filterObj = parseFilter(filter);
        
        // Build WHERE clause using JSON_EXTRACT
        let whereClause = '(\`expires_at\` IS NULL OR \`expires_at\` > NOW())';
        const whereParams: any[] = [];
        
        for (const [k, v] of Object.entries(filterObj)) {
          whereClause += ` AND JSON_EXTRACT(\`value\`, '$.${k}') = ?`;
          whereParams.push(JSON.stringify(v));
        }
        
        whereParams.push(Number(limit));
        
        const [rows]: any = await p.execute(
          `SELECT \`_key\`, \`value\`, \`created_at\` FROM \`${tableName}\` WHERE ${whereClause} LIMIT ?`,
          whereParams
        );
        
        const results = rows.map((row: any) => ({
          key: row._key,
          ...row.value,
          _createdAt: row.created_at?.toISOString?.() || String(row.created_at),
        }));
        
        console.log(`💾 MySQL Query: ${collection} (${results.length} results)`);
        
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
        
        await ensureTable(String(collection));
        const p = await getPool();
        const tableName = getTableName(String(collection));
        
        // Get current value
        const [rows]: any = await p.execute(
          `SELECT \`value\` FROM \`${tableName}\` WHERE \`_key\` = ?`,
          [String(key)]
        );
        
        const currentValue = rows.length > 0 ? (rows[0].value || 0) : 0;
        const newValue = Number(currentValue) + Number(amount);
        const now = new Date();
        
        await p.execute(
          `INSERT INTO \`${tableName}\` (\`_key\`, \`value\`, \`created_at\`)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE \`value\` = ?`,
          [String(key), newValue, now, newValue]
        );
        
        console.log(`💾 MySQL Increment: ${collection}/${key} = ${newValue}`);
        
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

export const databaseMySQL = databaseMySQLBit;
export default databaseMySQLBit;

// Cleanup function
export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    initializedTables.clear();
    console.log('💾 MySQL connection closed');
  }
}
