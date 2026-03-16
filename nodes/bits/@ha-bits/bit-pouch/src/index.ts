/**
 * @ha-bits/bit-pouch
 * 
 * PouchDB database storage bit.
 * This bit replaces @ha-bits/bit-database with local persistence using PouchDB.
 * 
 * Uses PouchDB now
 * In browser/Tauri: Uses pouchdb (IndexedDB backend) via bundle stubs
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

import PouchDB from 'pouchdb';

interface DatabaseContext {
  propsValue: Record<string, any>;
}

// PouchDB document interface
interface PouchDocument {
  _id: string;
  _rev?: string;
  value: any;
  createdAt: string;
  updatedAt?: string;
  expiresAt: string | null;
  // For document-style storage
  [key: string]: any;
}

// Database instances per collection
const databases: Map<string, PouchDB.Database<PouchDocument>> = new Map();

// Detect environment - browser vs Node.js
const isBrowser = typeof window !== 'undefined';

// Simple IndexedDB test
async function testIndexedDB(): Promise<boolean> {
  if (!isBrowser) return true;
  
  return new Promise((resolve) => {
    try {
      console.log('💾 Testing raw IndexedDB...');
      const request = indexedDB.open('_habits_idb_test', 1);
      
      const timeout = setTimeout(() => {
        console.error('💾 IndexedDB test timeout');
        resolve(false);
      }, 3000);
      
      request.onerror = () => {
        clearTimeout(timeout);
        console.error('💾 IndexedDB test failed:', request.error);
        resolve(false);
      };
      
      request.onsuccess = () => {
        clearTimeout(timeout);
        console.log('💾 IndexedDB test passed');
        request.result.close();
        indexedDB.deleteDatabase('_habits_idb_test');
        resolve(true);
      };
      
      request.onupgradeneeded = (event) => {
        console.log('💾 IndexedDB onupgradeneeded');
      };
    } catch (e) {
      console.error('💾 IndexedDB test exception:', e);
      resolve(false);
    }
  });
}

let idbTestDone = false;
let idbWorks = false;

function getDatabase(collection: string): PouchDB.Database<PouchDocument> {
  if (!databases.has(collection)) {
    // In browser: use simple name (IndexedDB)
    // In Node.js: use path (LevelDB)
    const dbName = isBrowser ? `habits_${collection}` : `/tmp/habits-pouchdb/${collection}`;
    console.log(`💾 PouchDB creating: ${dbName} (browser: ${isBrowser})`);
    
    // Check available adapters
    if (isBrowser && typeof (PouchDB as any).adapters !== 'undefined') {
      console.log(`💾 PouchDB available adapters:`, Object.keys((PouchDB as any).adapters || {}));
    }
    
    // Let PouchDB auto-detect the best adapter
    const db = new PouchDB<PouchDocument>(dbName);
    databases.set(collection, db);
    
    // Log which adapter was chosen
    console.log(`💾 PouchDB initialized: ${dbName}, adapter: ${(db as any).adapter}`);
  }
  return databases.get(collection)!;
}

// Simple getter - with IndexedDB pre-test
async function getDatabaseReady(collection: string): Promise<PouchDB.Database<PouchDocument>> {
  // Run IndexedDB test once
  if (isBrowser && !idbTestDone) {
    idbTestDone = true;
    idbWorks = await testIndexedDB();
    if (!idbWorks) {
      console.error('💾 WARNING: IndexedDB is not working properly in this browser');
    }
  }
  
  return getDatabase(collection);
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

const pouchBit = {
  displayName: 'Database / Storage (PouchDB)',
  description: 'Store and retrieve data in workflows using PouchDB local storage',
  logoUrl: 'lucide:Database',
  
  /**
   * Declares which bit this one can replace.
   * The UI will show this as an alternative to the parent bit.
   */
  replaces: '@ha-bits/bit-database',
  
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
        
        const db = await getDatabaseReady(String(collection));
        const docId = `kv:${key}`;
        const parsedValue = parseValue(value);
        
        const now = new Date().toISOString();
        const expiresAt = ttl ? new Date(Date.now() + Number(ttl) * 1000).toISOString() : null;
        
        try {
          // Try to get existing doc to update
          const existing = await db.get(docId).catch(() => null);
          
          const doc: PouchDocument = {
            _id: docId,
            value: parsedValue,
            createdAt: existing?.createdAt || now,
            updatedAt: existing ? now : undefined,
            expiresAt,
          };
          
          if (existing) {
            doc._rev = existing._rev;
          }
          
          await db.put(doc);
          
          console.log(`💾 PouchDB Store: ${collection}/${key}`);
          
          return {
            success: true,
            collection: String(collection),
            key: String(key),
            createdAt: doc.createdAt,
            expiresAt: doc.expiresAt,
          };
        } catch (error) {
          console.error(`💾 PouchDB Store Error: ${collection}/${key}`, error);
          throw error;
        }
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
        
        const db = await getDatabaseReady(String(collection));
        const docId = `kv:${key}`;
        
        try {
          const doc = await db.get(docId);
          
          // Check expiry
          if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) {
            await db.remove(doc);
            console.log(`💾 PouchDB Get: ${collection}/${key} (expired)`);
            return {
              found: false,
              value: defaultValue || null,
              expired: true,
            };
          }
          
          console.log(`💾 PouchDB Get: ${collection}/${key}`);
          
          return {
            found: true,
            value: doc.value,
            createdAt: doc.createdAt,
            expiresAt: doc.expiresAt,
          };
        } catch (error: any) {
          if (error.status === 404) {
            console.log(`💾 PouchDB Get: ${collection}/${key} (not found)`);
            return {
              found: false,
              value: defaultValue || null,
            };
          }
          throw error;
        }
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
        
        const db = await getDatabaseReady(String(collection));
        const docId = `kv:${key}`;
        
        try {
          const doc = await db.get(docId);
          await db.remove(doc);
          
          console.log(`💾 PouchDB Delete: ${collection}/${key}`);
          
          return {
            success: true,
            deleted: true,
            collection: String(collection),
            key: String(key),
          };
        } catch (error: any) {
          if (error.status === 404) {
            console.log(`💾 PouchDB Delete: ${collection}/${key} (not found)`);
            return {
              success: true,
              deleted: false,
              collection: String(collection),
              key: String(key),
            };
          }
          throw error;
        }
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
        
        const db = await getDatabaseReady(String(collection));
        
        // Query all docs with kv: prefix
        const result = await db.allDocs({
          startkey: 'kv:',
          endkey: 'kv:\uffff',
          include_docs: false,
        });
        
        let keys = result.rows
          .map(row => row.id.replace('kv:', ''))
          .filter(key => !prefix || key.startsWith(String(prefix)));
        
        keys = keys.slice(0, Number(limit));
        
        console.log(`💾 PouchDB List: ${collection} (${keys.length} keys)`);
        
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
        
        console.log(`💾 PouchDB Insert: Starting for ${collection}`);
        const db = await getDatabaseReady(String(collection));
        console.log(`💾 PouchDB Insert: Got database instance (ready)`);
        const id = generateId();
        const docId = `doc:${id}`;
        
        let docData = parseValue(document);
        if (typeof docData !== 'object' || docData === null) {
          docData = { data: docData };
        }
        
        const now = new Date().toISOString();
        const doc: PouchDocument = {
          _id: docId,
          ...docData,
          customId: id,
          value: docData,
          createdAt: now,
          expiresAt: null,
        };
        
        console.log(`💾 PouchDB Insert: Calling db.put for ${collection}/${id}`);
        try {
          await db.put(doc);
          console.log(`💾 PouchDB Insert: Success ${collection}/${id}`);
        } catch (err) {
          console.error(`💾 PouchDB Insert: Error ${collection}/${id}`, err);
          throw err;
        }
        
        return {
          success: true,
          id,
          collection: String(collection),
          document: { ...docData, _id: id },
          createdAt: now,
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
        
        const db = await getDatabaseReady(String(collection));
        const filterObj = parseFilter(filter);
        const updateObj = parseFilter(update);
        
        // Get all documents
        const result = await db.allDocs({
          startkey: 'doc:',
          endkey: 'doc:\uffff',
          include_docs: true,
        });
        
        // Find matching document
        let matchedDoc: PouchDocument | null = null;
        
        for (const row of result.rows) {
          const doc = row.doc as PouchDocument;
          if (!doc) continue;
          
          // Skip expired
          if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) {
            continue;
          }
          
          // Check filter - can match on customId as _id
          let matches = true;
          for (const [k, v] of Object.entries(filterObj)) {
            const docKey = k === '_id' ? 'customId' : k;
            if (doc[docKey] !== v && doc.value?.[k] !== v) {
              matches = false;
              break;
            }
          }
          
          if (matches) {
            matchedDoc = doc;
            break;
          }
        }
        
        if (!matchedDoc) {
          console.log(`💾 PouchDB Update: ${collection} - no matching document found`);
          return {
            success: false,
            matched: 0,
            modified: 0,
            collection: String(collection),
          };
        }
        
        // Apply update
        const now = new Date().toISOString();
        const updatedValue = { ...matchedDoc.value, ...updateObj };
        const updatedDoc: PouchDocument = {
          ...matchedDoc,
          ...updateObj,
          value: updatedValue,
          updatedAt: now,
        };
        
        await db.put(updatedDoc);
        
        console.log(`💾 PouchDB Update: ${collection}/${matchedDoc.customId}`);
        
        return {
          success: true,
          matched: 1,
          modified: 1,
          collection: String(collection),
          document: { ...updatedValue, _id: matchedDoc.customId },
          updatedAt: now,
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
        
        const db = await getDatabaseReady(String(collection));
        const filterObj = parseFilter(filter);
        
        // Get all documents
        const result = await db.allDocs({
          startkey: 'doc:',
          endkey: 'doc:\uffff',
          include_docs: true,
        });
        
        const results: any[] = [];
        
        for (const row of result.rows) {
          const doc = row.doc as PouchDocument;
          if (!doc) continue;
          
          // Skip expired
          if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) {
            continue;
          }
          
          // Check filter
          let matches = true;
          for (const [k, v] of Object.entries(filterObj)) {
            if (doc.value?.[k] !== v && doc[k] !== v) {
              matches = false;
              break;
            }
          }
          
          if (matches) {
            results.push({
              _id: doc.customId,
              ...doc.value,
              _createdAt: doc.createdAt,
            });
            if (results.length >= Number(limit)) break;
          }
        }
        
        console.log(`💾 PouchDB Query: ${collection} (${results.length} results)`);
        
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
        
        const db = await getDatabaseReady(String(collection));
        const docId = `kv:${key}`;
        
        let currentValue = 0;
        let existingDoc: PouchDocument | null = null;
        
        try {
          existingDoc = await db.get(docId);
          currentValue = Number(existingDoc.value) || 0;
        } catch (error: any) {
          if (error.status !== 404) throw error;
        }
        
        const newValue = currentValue + Number(amount);
        const now = new Date().toISOString();
        
        const doc: PouchDocument = {
          _id: docId,
          value: newValue,
          createdAt: existingDoc?.createdAt || now,
          updatedAt: now,
          expiresAt: null,
        };
        
        if (existingDoc) {
          doc._rev = existingDoc._rev;
        }
        
        await db.put(doc);
        
        console.log(`💾 PouchDB Increment: ${collection}/${key} = ${newValue}`);
        
        return {
          collection: String(collection),
          key: String(key),
          previousValue: currentValue,
          newValue,
          amount: Number(amount),
        };
      },
    },
    
    /**
     * Add/Update attachment to a document
     */
    putAttachment: {
      name: 'putAttachment',
      displayName: 'Add Attachment',
      description: 'Add or update an attachment to a document',
      props: {
        collection: {
          type: 'SHORT_TEXT',
          displayName: 'Collection',
          description: 'Collection/table name',
          required: true,
        },
        documentId: {
          type: 'SHORT_TEXT',
          displayName: 'Document ID',
          description: 'ID of the document to attach to',
          required: true,
        },
        attachmentName: {
          type: 'SHORT_TEXT',
          displayName: 'Attachment Name',
          description: 'Name of the attachment (e.g., "image.jpg")',
          required: true,
        },
        attachmentData: {
          type: 'LONG_TEXT',
          displayName: 'Attachment Data',
          description: 'Base64 encoded data or blob',
          required: true,
        },
        contentType: {
          type: 'SHORT_TEXT',
          displayName: 'Content Type',
          description: 'MIME type (e.g., "image/jpeg", "application/pdf")',
          required: true,
          defaultValue: 'application/octet-stream',
        },
      },
      async run(context: DatabaseContext): Promise<any> {
        const { collection, documentId, attachmentName, attachmentData, contentType } = context.propsValue;
        
        const db = await getDatabaseReady(String(collection));
        const docId = `doc:${documentId}`;
        
        try {
          // Get the document to get its _rev
          const doc = await db.get(docId);
          
          // Convert base64 to Buffer (Node.js) or Blob (browser)
          let data: Buffer | Blob;
          if (typeof attachmentData === 'string') {
            // Assume base64 encoded string
            const base64Data = attachmentData.replace(/^data:[^;]+;base64,/, '');
            
            if (isBrowser) {
              // Browser: use Blob
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              data = new Blob([bytes], { type: String(contentType) });
            } else {
              // Node.js: use Buffer
              data = Buffer.from(base64Data, 'base64');
            }
          } else if (attachmentData instanceof Buffer) {
            data = attachmentData;
          } else {
            data = attachmentData as Blob;
          }
          
          await db.putAttachment(docId, String(attachmentName), doc._rev!, data, String(contentType));
          
          console.log(`💾 PouchDB Attachment Added: ${collection}/${documentId}/${attachmentName}`);
          
          return {
            success: true,
            collection: String(collection),
            documentId: String(documentId),
            attachmentName: String(attachmentName),
            contentType: String(contentType),
          };
        } catch (error: any) {
          console.error(`💾 PouchDB Attachment Error: ${collection}/${documentId}/${attachmentName}`, error);
          throw error;
        }
      },
    },
    
    /**
     * Get attachment from a document
     */
    getAttachment: {
      name: 'getAttachment',
      displayName: 'Get Attachment',
      description: 'Retrieve an attachment from a document',
      props: {
        collection: {
          type: 'SHORT_TEXT',
          displayName: 'Collection',
          description: 'Collection/table name',
          required: true,
        },
        documentId: {
          type: 'SHORT_TEXT',
          displayName: 'Document ID',
          description: 'ID of the document',
          required: true,
        },
        attachmentName: {
          type: 'SHORT_TEXT',
          displayName: 'Attachment Name',
          description: 'Name of the attachment to retrieve',
          required: true,
        },
      },
      async run(context: DatabaseContext): Promise<any> {
        const { collection, documentId, attachmentName } = context.propsValue;
        
        const db = await getDatabaseReady(String(collection));
        const docId = `doc:${documentId}`;
        
        try {
          const attachment = await db.getAttachment(docId, String(attachmentName));
          
          // Convert blob to base64
          let base64Data: string;
          if (attachment instanceof Blob) {
            const arrayBuffer = await attachment.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            base64Data = btoa(binary);
          } else {
            base64Data = '';
          }
          
          console.log(`💾 PouchDB Attachment Retrieved: ${collection}/${documentId}/${attachmentName}`);
          
          return {
            success: true,
            collection: String(collection),
            documentId: String(documentId),
            attachmentName: String(attachmentName),
            data: base64Data,
            contentType: (attachment as Blob).type || 'application/octet-stream',
          };
        } catch (error: any) {
          if (error.status === 404) {
            console.log(`💾 PouchDB Attachment Not Found: ${collection}/${documentId}/${attachmentName}`);
            return {
              success: false,
              found: false,
              collection: String(collection),
              documentId: String(documentId),
              attachmentName: String(attachmentName),
            };
          }
          throw error;
        }
      },
    },
    
    /**
     * Remove attachment from a document
     */
    removeAttachment: {
      name: 'removeAttachment',
      displayName: 'Remove Attachment',
      description: 'Remove an attachment from a document',
      props: {
        collection: {
          type: 'SHORT_TEXT',
          displayName: 'Collection',
          description: 'Collection/table name',
          required: true,
        },
        documentId: {
          type: 'SHORT_TEXT',
          displayName: 'Document ID',
          description: 'ID of the document',
          required: true,
        },
        attachmentName: {
          type: 'SHORT_TEXT',
          displayName: 'Attachment Name',
          description: 'Name of the attachment to remove',
          required: true,
        },
      },
      async run(context: DatabaseContext): Promise<any> {
        const { collection, documentId, attachmentName } = context.propsValue;
        
        const db = await getDatabaseReady(String(collection));
        const docId = `doc:${documentId}`;
        
        try {
          // Get the document to get its _rev
          const doc = await db.get(docId);
          
          await db.removeAttachment(docId, String(attachmentName), doc._rev!);
          
          console.log(`💾 PouchDB Attachment Removed: ${collection}/${documentId}/${attachmentName}`);
          
          return {
            success: true,
            removed: true,
            collection: String(collection),
            documentId: String(documentId),
            attachmentName: String(attachmentName),
          };
        } catch (error: any) {
          if (error.status === 404) {
            console.log(`💾 PouchDB Attachment Not Found: ${collection}/${documentId}/${attachmentName}`);
            return {
              success: true,
              removed: false,
              collection: String(collection),
              documentId: String(documentId),
              attachmentName: String(attachmentName),
            };
          }
          throw error;
        }
      },
    },
  },
  
  triggers: {},
};

export const pouch = pouchBit;
export default pouchBit;
