/**
 * @ha-bits/bit-rss
 *
 * RSS/Atom feed bit for fetching and parsing XML feeds.
 * Uses rss-parser for reliable RSS 2.0, RSS 1.0 (RDF), and Atom 1.0 parsing.
 */

import Parser = require('rss-parser');

// ─── Types ────────────────────────────────────────────────────────────────────

interface RssContext {
  propsValue: Record<string, any>;
}

interface RssTriggerContext {
  propsValue: Record<string, any>;
  store: {
    get<T>(key: string): Promise<T | null>;
    put(key: string, value: any): Promise<void>;
  };
  setSchedule: (options: { cronExpression: string; timezone?: string }) => void;
}

export interface RssFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string | null;
  guid: string | null;
  author: string | null;
  categories: string[];
  enclosure: { url: string; type: string; length: number } | null;
  raw: Record<string, any>;
}

export interface RssFeed {
  title: string;
  link: string;
  description: string;
  language: string | null;
  lastBuildDate: string | null;
  items: RssFeedItem[];
  count: number;
  feedType: 'rss2' | 'rss1' | 'atom' | 'unknown';
}

export interface FetchFeedResult {
  success: boolean;
  feed: RssFeed;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function mapItem(item: Parser.Item): RssFeedItem {
  let enclosure: RssFeedItem['enclosure'] = null;
  if ((item as any).enclosure) {
    const enc = (item as any).enclosure;
    enclosure = {
      url: enc.url ?? '',
      type: enc.type ?? '',
      length: Number(enc.length ?? 0),
    };
  }
  return {
    title: item.title ?? '',
    link: item.link ?? '',
    description: item.contentSnippet ?? item.content ?? (item as any).summary ?? '',
    pubDate: item.pubDate ?? item.isoDate ?? null,
    guid: item.guid ?? item.link ?? null,
    author: (item as any).creator ?? (item as any)['dc:creator'] ?? null,
    categories: Array.isArray(item.categories) ? item.categories.map(String) : [],
    enclosure,
    raw: item as any,
  };
}

// ─── Bit Definition ───────────────────────────────────────────────────────────

const rssBit = {
  displayName: 'RSS Feed',
  description: 'Fetch and parse RSS/Atom XML feeds',
  logoUrl: 'lucide:Rss',
  runtime: 'all',

  actions: {
    /**
     * Fetch and parse an RSS/Atom feed from a URL.
     */
    fetchFeed: {
      name: 'fetchFeed',
      displayName: 'Fetch Feed',
      description: 'Fetch an RSS or Atom feed from a URL and return the parsed list of items',
      props: {
        url: {
          type: 'SHORT_TEXT',
          displayName: 'Feed URL',
          description: 'The URL of the RSS or Atom feed (XML)',
          required: true,
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Item Limit',
          description: 'Maximum number of items to return (0 = all)',
          required: false,
          defaultValue: 0,
        },
      },

      async run(context: RssContext): Promise<FetchFeedResult> {
        const { url, limit = 0 } = context.propsValue;

        const parser = new Parser();
        const rawFeed = await parser.parseURL(url);

        console.log("dataaaa", rawFeed.items);

        const allItems: RssFeedItem[] = rawFeed.items.map(mapItem);
        const itemLimit = Number(limit);
        const items = itemLimit > 0 ? allItems.slice(0, itemLimit) : allItems;

        const feed: RssFeed = {
          title: rawFeed.title ?? '',
          link: rawFeed.link ?? '',
          description: rawFeed.description ?? '',
          language: (rawFeed as any).language ?? null,
          lastBuildDate: rawFeed.lastBuildDate ?? null,
          items,
          count: items.length,
          feedType: 'rss2',
        };

        console.log(`[bit-rss] Fetched "${feed.title}" – ${feed.count} item(s) from ${url}`);
        return { success: true, feed };
      },
    },
  },

  triggers: {
    /**
     * Polling trigger – fires for each new item in the feed.
     *
     * On every poll cycle the trigger fetches the feed, walks the items from
     * newest to oldest, and stops as soon as it hits the GUID that was saved
     * on the previous run.  Only the genuinely new items are returned, and the
     * GUID of the most-recent item is persisted in context.store.
     */
    newItems: {
      name: 'newItems',
      displayName: 'New Feed Items',
      description: 'Polls an RSS/Atom feed for new items on a schedule',
      type: 'POLLING',

      props: {
        url: {
          type: 'SHORT_TEXT',
          displayName: 'Feed URL',
          description: 'The URL of the RSS or Atom feed to watch',
          required: true,
        },
        cronExpression: {
          type: 'SHORT_TEXT',
          displayName: 'Poll Interval',
          description: 'Cron expression for polling (default: every 10 minutes)',
          required: false,
          defaultValue: '*/10 * * * *',
        },
      },

      async onEnable(context: RssTriggerContext): Promise<void> {
        console.log("cronnn", context.propsValue.cronExpression);
        const cron = context.propsValue.cronExpression || '*/10 * * * *';
        if (context.propsValue.url) {
          await context.store.put('feedUrl', context.propsValue.url);
          console.log("feed urlll saved", context.propsValue.url);
        }
        context.setSchedule({ cronExpression: cron, timezone: 'UTC' });
      },

      async onDisable(_context: RssTriggerContext): Promise<void> {
        // Server handles stopping the cron job.
      },

      async run(context: RssTriggerContext): Promise<RssFeedItem[]> {
        console.log("startt runnn")
        console.log("Urllllsss", await context.store.get<string>('feedUrl') );
        const url: string = context.propsValue.url || await context.store.get<string>('feedUrl') || '';
        console.log("Urllll", url);

        if (!url) {
          console.log('[bit-rss] No feed URL available, skipping');
          return [];
        }

        const parser = new Parser();
        const rawFeed = await parser.parseURL(url);
        const items = rawFeed.items;
        console.log("itemsss", items);

        const lastGuid = await context.store.get<string>('lastItemGuid');

        console.log("last guiddd", lastGuid);
        const newItems: Parser.Item[] = [];

        for (const item of items) {
          const guid = item.guid || item.link || item.title || '';
          if (guid === lastGuid) break;
          newItems.push(item);
        }

        if (newItems.length > 0) {
          const first = newItems[0];
          const newLastGuid = first.guid || first.link || first.title || '';
          await context.store.put('lastItemGuid', newLastGuid);
        }

        console.log(`[bit-rss] newItems trigger: ${newItems.length} new item(s) from ${url}`);
        return newItems.map(mapItem);
      },

      sampleData: {
        title: 'Sample RSS Item',
        link: 'https://example.com/item/1',
        description: 'A sample feed item description',
        pubDate: new Date().toISOString(),
        guid: 'https://example.com/item/1',
        author: null,
        categories: [],
        enclosure: null,
        raw: {},
      },
    },
  },
};

export const rss = rssBit;
export default rssBit;
