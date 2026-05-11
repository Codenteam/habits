/**
 * @ha-bits/bit-rss
 *
 * RSS/Atom feed bit for fetching and parsing XML feeds.
 * Supports RSS 2.0, RSS 1.0 (RDF), and Atom 1.0 formats.
 * Uses native fetch – no external dependencies.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

interface RssContext {
  propsValue: Record<string, any>;
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
  raw: Record<string, string>;
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

// ─── XML Helpers ──────────────────────────────────────────────────────────────

/**
 * Decode common XML/HTML entities.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/**
 * Extract the inner text of the FIRST occurrence of <tagName ...>...</tagName>.
 * Handles CDATA sections transparently.
 */
function getTag(xml: string, tagName: string): string | null {
  // Try namespaced and plain variants
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `<(?:[a-zA-Z0-9_:-]*:)?${escapedTag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[a-zA-Z0-9_:-]*:)?${escapedTag}>`,
    'i',
  );
  const m = xml.match(re);
  if (!m) return null;
  // Strip CDATA wrappers
  const value = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
  return decodeEntities(value);
}

/**
 * Extract the value of an XML attribute from a tag string.
 */
function getAttr(tag: string, attr: string): string | null {
  const re = new RegExp(`${attr}=["']([^"']*)["']`, 'i');
  const m = tag.match(re);
  return m ? decodeEntities(m[1]) : null;
}

/**
 * Split an XML string into repeated blocks for a given tag.
 */
function getBlocks(xml: string, tagName: string): string[] {
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `<(?:[a-zA-Z0-9_:-]*:)?${escapedTag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[a-zA-Z0-9_:-]*:)?${escapedTag}>`,
    'gi',
  );
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    results.push(m[1]);
  }
  return results;
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

function detectFeedType(xml: string): 'rss2' | 'rss1' | 'atom' | 'unknown' {
  if (/<feed\b/i.test(xml)) return 'atom';
  if (/rdf:RDF/i.test(xml)) return 'rss1';
  if (/<rss\b/i.test(xml)) return 'rss2';
  return 'unknown';
}

/**
 * Parse RSS 2.0 feed.
 */
function parseRss2(xml: string): RssFeed {
  const channelMatch = xml.match(/<channel[^>]*>([\s\S]*?)<\/channel>/i);
  const channel = channelMatch ? channelMatch[1] : xml;

  // Channel-level fields (skip first <item> block when reading channel meta)
  const channelMeta = channel.replace(/<item[\s\S]*?<\/item>/gi, '');

  const items: RssFeedItem[] = getBlocks(xml, 'item').map((block) => {
    const enclosureMatch = block.match(/<enclosure\s([^/]*?)\/>/i);
    const enclosure = enclosureMatch
      ? {
          url: getAttr(enclosureMatch[1], 'url') ?? '',
          type: getAttr(enclosureMatch[1], 'type') ?? '',
          length: Number(getAttr(enclosureMatch[1], 'length') ?? 0),
        }
      : null;

    // Collect all simple text tags as raw
    const raw: Record<string, string> = {};
    const tagRe = /<([a-zA-Z0-9_:-]+)[^>]*>([^<]*)<\/[a-zA-Z0-9_:-]+>/g;
    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = tagRe.exec(block)) !== null) {
      raw[tagMatch[1]] = decodeEntities(tagMatch[2].trim());
    }

    return {
      title: getTag(block, 'title') ?? '',
      link: getTag(block, 'link') ?? '',
      description: getTag(block, 'description') ?? '',
      pubDate: getTag(block, 'pubDate') ?? getTag(block, 'dc:date'),
      guid: getTag(block, 'guid'),
      author: getTag(block, 'author') ?? getTag(block, 'dc:creator'),
      categories: getBlocks(block, 'category').map((c) => decodeEntities(c.trim())),
      enclosure,
      raw,
    };
  });

  return {
    title: getTag(channelMeta, 'title') ?? '',
    link: getTag(channelMeta, 'link') ?? '',
    description: getTag(channelMeta, 'description') ?? '',
    language: getTag(channelMeta, 'language'),
    lastBuildDate: getTag(channelMeta, 'lastBuildDate'),
    items,
    count: items.length,
    feedType: 'rss2',
  };
}

/**
 * Parse Atom 1.0 feed.
 */
function parseAtom(xml: string): RssFeed {
  const feedTitle = getTag(xml, 'title') ?? '';

  // Atom link element: <link href="..." rel="alternate"/>
  const linkMatch = xml.match(/<link\s[^>]*href=["']([^"']*)["'][^>]*rel=["']alternate["']/i)
    ?? xml.match(/<link\s[^>]*rel=["']alternate["'][^>]*href=["']([^"']*)["']/i)
    ?? xml.match(/<link\s[^>]*href=["']([^"']*)["']/i);
  const feedLink = linkMatch ? decodeEntities(linkMatch[1]) : '';

  const feedSubtitle = getTag(xml, 'subtitle') ?? '';
  const feedUpdated = getTag(xml, 'updated');

  const items: RssFeedItem[] = getBlocks(xml, 'entry').map((block) => {
    // Atom link
    const entryLinkMatch =
      block.match(/<link\s[^>]*href=["']([^"']*)["'][^>]*rel=["']alternate["']/i)
      ?? block.match(/<link\s[^>]*rel=["']alternate["'][^>]*href=["']([^"']*)["']/i)
      ?? block.match(/<link\s[^>]*href=["']([^"']*)["']/i);
    const link = entryLinkMatch ? decodeEntities(entryLinkMatch[1]) : '';

    // Author name inside <author><name>…</name></author>
    const authorBlock = block.match(/<author[^>]*>([\s\S]*?)<\/author>/i);
    const author = authorBlock ? (getTag(authorBlock[1], 'name') ?? null) : null;

    // Content: prefer <content>, fall back to <summary>
    const description =
      getTag(block, 'content') ?? getTag(block, 'summary') ?? '';

    const raw: Record<string, string> = {};
    const tagRe = /<([a-zA-Z0-9_:-]+)[^>]*>([^<]*)<\/[a-zA-Z0-9_:-]+>/g;
    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = tagRe.exec(block)) !== null) {
      raw[tagMatch[1]] = decodeEntities(tagMatch[2].trim());
    }

    return {
      title: getTag(block, 'title') ?? '',
      link,
      description,
      pubDate: getTag(block, 'published') ?? getTag(block, 'updated'),
      guid: getTag(block, 'id'),
      author,
      categories: getBlocks(block, 'category').map((c) => {
        const termMatch = c.match(/term=["']([^"']*)["']/i);
        return termMatch ? decodeEntities(termMatch[1]) : decodeEntities(c.trim());
      }),
      enclosure: null,
      raw,
    };
  });

  return {
    title: feedTitle,
    link: feedLink,
    description: feedSubtitle,
    language: getTag(xml, 'language'),
    lastBuildDate: feedUpdated,
    items,
    count: items.length,
    feedType: 'atom',
  };
}

/**
 * Parse RSS 1.0 / RDF feed (simple subset).
 */
function parseRss1(xml: string): RssFeed {
  const channelBlock = xml.match(/<channel[^>]*>([\s\S]*?)<\/channel>/i)?.[1] ?? '';

  const items: RssFeedItem[] = getBlocks(xml, 'item').map((block) => {
    const raw: Record<string, string> = {};
    const tagRe = /<([a-zA-Z0-9_:-]+)[^>]*>([^<]*)<\/[a-zA-Z0-9_:-]+>/g;
    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = tagRe.exec(block)) !== null) {
      raw[tagMatch[1]] = decodeEntities(tagMatch[2].trim());
    }
    return {
      title: getTag(block, 'title') ?? '',
      link: getTag(block, 'link') ?? '',
      description: getTag(block, 'description') ?? '',
      pubDate: getTag(block, 'dc:date'),
      guid: getTag(block, 'rdf:about') ?? null,
      author: getTag(block, 'dc:creator'),
      categories: getBlocks(block, 'dc:subject').map((s) => decodeEntities(s.trim())),
      enclosure: null,
      raw,
    };
  });

  return {
    title: getTag(channelBlock, 'title') ?? '',
    link: getTag(channelBlock, 'link') ?? '',
    description: getTag(channelBlock, 'description') ?? '',
    language: getTag(channelBlock, 'dc:language'),
    lastBuildDate: getTag(channelBlock, 'dc:date'),
    items,
    count: items.length,
    feedType: 'rss1',
  };
}

/**
 * Dispatch to the appropriate parser.
 */
function parseFeed(xml: string): RssFeed {
  const feedType = detectFeedType(xml);
  switch (feedType) {
    case 'atom':
      return parseAtom(xml);
    case 'rss1':
      return parseRss1(xml);
    default:
      return parseRss2(xml);
  }
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
        const {
          url,
          limit = 0,
        } = context.propsValue;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        let xml: string;
        try {
          const response = await fetch(url, {
            headers: {
              Accept:
                'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(
              `HTTP ${response.status} ${response.statusText} while fetching ${url}`,
            );
          }

          xml = await response.text();
        } catch (error: any) {
          clearTimeout(timeoutId);
          throw new Error(`Failed to fetch RSS feed from ${url}: ${error.message}`);
        }

        const feed = parseFeed(xml);

        // Apply item limit if requested
        const itemLimit = Number(limit);
        if (itemLimit > 0 && feed.items.length > itemLimit) {
          feed.items = feed.items.slice(0, itemLimit);
          feed.count = feed.items.length;
        }

        console.log(
          `[bit-rss] Fetched "${feed.title}" (${feed.feedType}) – ${feed.count} item(s) from ${url}`,
        );

        return { success: true, feed };
      },
    },
  },

  triggers: {},
};

export const rss = rssBit;
export default rssBit;
