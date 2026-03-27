/**
 * Polling Store
 * 
 * SQLite-backed store for polling trigger deduplication.
 * Tracks seen items by ID, date, or both to prevent duplicate workflow executions.
 * 
 * Uses @ha-bits/bit-database-sql driver functions internally.
 */

import { LoggerFactory } from '@ha-bits/core';

const logger = LoggerFactory.getRoot();

// ============================================================================
// Types
// ============================================================================

/**
 * Deduplication strategy for polling triggers
 */
export type DedupStrategy = 'id' | 'date' | 'both';

/**
 * Record of a seen item in the polling store
 */
export interface SeenItemRecord {
  /** Unique identifier from the source (e.g., Stripe payment ID) */
  id: string;
  /** Timestamp when the item was created at the source */
  sourceDate: string;
  /** Timestamp when we first saw/processed this item */
  seenAt: string;
  /** Optional: Full item data for debugging/auditing */
  data?: any;
}

/**
 * Options for the polling store
 */
export interface PollingStoreOptions {
  /** Database file name (default: 'habits-polling.db') */
  database?: string;
  /** Collection/table prefix for this trigger (default: 'polling') */
  collection?: string;
  /** Deduplication strategy (default: 'id') */
  dedupStrategy?: DedupStrategy;
  /** Time-to-live in days for seen records (default: 30) - TODO: implement cleanup */
  ttlDays?: number;
}

/**
 * Context for checking/marking items
 */
export interface PollingItemContext {
  /** Trigger identifier (e.g., 'stripe:paymentSucceededPolling') */
  triggerId: string;
  /** Workflow ID this trigger belongs to */
  workflowId: string;
}

// ============================================================================
// Driver Functions (lazy loaded)
// ============================================================================

/**
 * Driver API interface - matches @ha-bits/bit-database-sql/driver exports
 */
interface DatabaseDriver {
  store: (params: { collection: string; key: string; value: any; database?: string }) => Promise<any>;
  get: (params: { collection: string; key: string; database?: string }) => Promise<{ found: boolean; value: any }>;
  del: (params: { collection: string; key: string; database?: string }) => Promise<any>;
  list: (params: { collection: string; prefix?: string; limit?: number; database?: string }) => Promise<{ keys: string[] }>;
}

let driverModule: DatabaseDriver | null = null;
let driverLoadAttempted = false;
let useInMemoryFallback = false;

// In-memory fallback storage
const inMemoryStore = new Map<string, any>();

/**
 * In-memory driver fallback when SQLite is not available
 */
const inMemoryDriver: DatabaseDriver = {
  async store(params) {
    const key = `${params.collection}:${params.key}`;
    inMemoryStore.set(key, params.value);
    return { success: true };
  },
  async get(params) {
    const key = `${params.collection}:${params.key}`;
    if (inMemoryStore.has(key)) {
      return { found: true, value: inMemoryStore.get(key) };
    }
    return { found: false, value: null };
  },
  async del(params) {
    const key = `${params.collection}:${params.key}`;
    inMemoryStore.delete(key);
    return { success: true };
  },
  async list(params) {
    const prefix = `${params.collection}:${params.prefix || ''}`;
    const keys: string[] = [];
    for (const key of inMemoryStore.keys()) {
      if (key.startsWith(prefix)) {
        keys.push(key.replace(`${params.collection}:`, ''));
      }
    }
    return { keys: keys.slice(0, params.limit || 100) };
  },
};

/**
 * Get the database driver module.
 * Lazy-loads @ha-bits/bit-database-sql/driver to avoid circular dependencies.
 * Falls back to in-memory storage if the module is not available.
 */
async function getDriver(): Promise<DatabaseDriver> {
  if (useInMemoryFallback) {
    return inMemoryDriver;
  }
  
  if (!driverModule && !driverLoadAttempted) {
    driverLoadAttempted = true;
    try {
      // Try to load the driver - works in Node.js and bundled (via stub)
      // Using dynamic import with string variable to avoid TypeScript compile-time resolution
      const modulePath = '@ha-bits/bit-database-sql/driver';
      driverModule = await import(/* webpackIgnore: true */ modulePath) as DatabaseDriver;
      logger.log('💾 Polling store: Loaded database driver');
    } catch (err: any) {
      logger.warn(`💾 Polling store: Database driver not available, using in-memory fallback: ${err.message}`);
      useInMemoryFallback = true;
      return inMemoryDriver;
    }
  }
  
  return driverModule || inMemoryDriver;
}

// ============================================================================
// Polling Store Class
// ============================================================================

/**
 * PollingStore - SQLite-backed store for polling trigger deduplication.
 * 
 * @example
 * ```ts
 * const store = new PollingStore({
 *   collection: 'stripe_payments',
 *   dedupStrategy: 'id',
 * });
 * 
 * const ctx = { triggerId: 'stripe:paymentSucceeded', workflowId: 'wf-123' };
 * 
 * // Check if we've seen this payment before
 * if (await store.hasSeenItem(ctx, 'pi_abc123')) {
 *   console.log('Already processed');
 * } else {
 *   // Process the payment
 *   await store.markItemSeen(ctx, 'pi_abc123', '2024-01-15T10:00:00Z');
 * }
 * ```
 */
export class PollingStore {
  private options: Required<PollingStoreOptions>;

  constructor(options: PollingStoreOptions = {}) {
    this.options = {
      database: options.database ?? 'habits-polling.db',
      collection: options.collection ?? 'polling',
      dedupStrategy: options.dedupStrategy ?? 'id',
      ttlDays: options.ttlDays ?? 30,
    };
  }

  /**
   * Generate a unique key for a seen item
   */
  private getItemKey(ctx: PollingItemContext, itemId: string): string {
    return `${ctx.workflowId}:${ctx.triggerId}:${itemId}`;
  }

  /**
   * Generate the key for storing last polled date
   */
  private getLastPolledKey(ctx: PollingItemContext): string {
    return `${ctx.workflowId}:${ctx.triggerId}:__lastPolled__`;
  }

  /**
   * Check if an item has been seen before
   */
  async hasSeenItem(ctx: PollingItemContext, itemId: string, itemDate?: string): Promise<boolean> {
    const driver = await getDriver();
    const key = this.getItemKey(ctx, itemId);

    const result = await driver.get({
      collection: this.options.collection,
      key,
      database: this.options.database,
    });

    if (!result.found) {
      return false;
    }

    // If using date-based dedup, also check the date
    if (this.options.dedupStrategy === 'date' && itemDate) {
      const record = result.value as SeenItemRecord;
      // Item is considered "seen" if we have a record with same or newer date
      return new Date(record.sourceDate) >= new Date(itemDate);
    }

    // For 'id' or 'both' strategy, existence is enough
    return true;
  }

  /**
   * Mark an item as seen
   */
  async markItemSeen(
    ctx: PollingItemContext,
    itemId: string,
    sourceDate: string,
    data?: any
  ): Promise<void> {
    const driver = await getDriver();
    const key = this.getItemKey(ctx, itemId);

    const record: SeenItemRecord = {
      id: itemId,
      sourceDate,
      seenAt: new Date().toISOString(),
      data: data,
    };

    await driver.store({
      collection: this.options.collection,
      key,
      value: record,
      database: this.options.database,
    });

    logger.log(`💾 Polling store: Marked item as seen: ${itemId}`);
  }

  /**
   * Get multiple items' seen status in batch
   * Returns a Set of item IDs that have been seen
   */
  async getSeenItems(ctx: PollingItemContext, itemIds: string[]): Promise<Set<string>> {
    const seen = new Set<string>();
    
    // Check each item - could be optimized with a query in the future
    for (const itemId of itemIds) {
      if (await this.hasSeenItem(ctx, itemId)) {
        seen.add(itemId);
      }
    }

    return seen;
  }

  /**
   * Mark multiple items as seen in batch
   */
  async markItemsSeen(
    ctx: PollingItemContext,
    items: Array<{ id: string; date: string; data?: any }>
  ): Promise<void> {
    for (const item of items) {
      await this.markItemSeen(ctx, item.id, item.date, item.data);
    }
  }

  /**
   * Get the last polled timestamp for a trigger
   * Returns null if never polled before
   */
  async getLastPolledDate(ctx: PollingItemContext): Promise<string | null> {
    const driver = await getDriver();
    const key = this.getLastPolledKey(ctx);

    const result = await driver.get({
      collection: this.options.collection,
      key,
      database: this.options.database,
    });

    if (!result.found) {
      return null;
    }

    return result.value as string;
  }

  /**
   * Set the last polled timestamp for a trigger
   */
  async setLastPolledDate(ctx: PollingItemContext, date: string): Promise<void> {
    const driver = await getDriver();
    const key = this.getLastPolledKey(ctx);

    await driver.store({
      collection: this.options.collection,
      key,
      value: date,
      database: this.options.database,
    });

    logger.log(`💾 Polling store: Updated last polled date: ${date}`);
  }

  /**
   * Get the count of seen items for a trigger
   */
  async getSeenCount(ctx: PollingItemContext): Promise<number> {
    const driver = await getDriver();
    const prefix = `${ctx.workflowId}:${ctx.triggerId}:`;

    const result = await driver.list({
      collection: this.options.collection,
      prefix,
      limit: 10000, // High limit to count all
      database: this.options.database,
    });

    // Subtract 1 if lastPolled key exists
    const count = result.keys.filter((k: string) => !k.endsWith('__lastPolled__')).length;
    return count;
  }

  /**
   * Clear all seen items for a trigger (useful for testing or reset)
   */
  async clearTrigger(ctx: PollingItemContext): Promise<number> {
    const driver = await getDriver();
    const prefix = `${ctx.workflowId}:${ctx.triggerId}:`;

    const result = await driver.list({
      collection: this.options.collection,
      prefix,
      limit: 10000,
      database: this.options.database,
    });

    let deleted = 0;
    for (const key of result.keys) {
      await driver.del({
        collection: this.options.collection,
        key,
        database: this.options.database,
      });
      deleted++;
    }

    logger.log(`💾 Polling store: Cleared ${deleted} items for trigger ${ctx.triggerId}`);
    return deleted;
  }

  /**
   * TODO: Implement TTL-based cleanup
   * Clean up old records based on ttlDays configuration
   */
  async cleanup(): Promise<number> {
    // TODO: Implement cleanup based on ttlDays
    // This would require querying all records and deleting those older than ttlDays
    // For now, this is a no-op placeholder
    logger.log(`💾 Polling store: Cleanup not yet implemented (TTL: ${this.options.ttlDays} days)`);
    return 0;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new PollingStore instance
 */
export function createPollingStore(options?: PollingStoreOptions): PollingStore {
  return new PollingStore(options);
}

// ============================================================================
// Default Export
// ============================================================================

export default PollingStore;
