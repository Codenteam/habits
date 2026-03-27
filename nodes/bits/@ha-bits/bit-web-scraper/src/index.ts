/**
 * @ha-bits/bit-web-scraper
 * 
 * Web scraping bit for extracting data from webpages.
 * Uses native fetch and regex-based HTML parsing (no external dependencies).
 * 
 * Features:
 * - Scrape webpage content
 * - Extract text from HTML
 * - Extract links from pages
 * - Find email addresses
 * - Extract HTML tables
 * - Basic selectors via regex patterns
 * 
 * Note: For advanced scraping with JavaScript rendering, consider using
 * @ha-bits/bit-http with a headless browser service or Playwright.
 */

interface ScraperContext {
  propsValue: Record<string, any>;
}

interface ScrapeResult {
  success: boolean;
  url: string;
  statusCode: number;
  html: string;
  title?: string;
  description?: string;
  contentLength: number;
}

interface ExtractTextResult {
  success: boolean;
  text: string;
  wordCount: number;
  characterCount: number;
}

interface ExtractLinksResult {
  success: boolean;
  links: Array<{
    href: string;
    text: string;
    isExternal: boolean;
  }>;
  count: number;
}

interface ExtractEmailsResult {
  success: boolean;
  emails: string[];
  count: number;
}

interface ExtractTablesResult {
  success: boolean;
  tables: Array<{
    headers: string[];
    rows: string[][];
  }>;
  count: number;
}

/**
 * Simple HTML entity decoder
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
  };
  
  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }
  
  // Handle numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  return decoded;
}

/**
 * Strip HTML tags and normalize whitespace
 */
function stripHtml(html: string): string {
  // Remove script and style content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Decode entities
  text = decodeHtmlEntities(text);
  
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Extract meta content from HTML
 */
function extractMeta(html: string, name: string): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`, 'i'),
    new RegExp(`<meta[^>]*property=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${name}["']`, 'i'),
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtmlEntities(match[1]);
  }
  
  return undefined;
}

/**
 * Check if URL is external relative to base URL
 */
function isExternalUrl(href: string, baseUrl: string): boolean {
  try {
    const base = new URL(baseUrl);
    const url = new URL(href, baseUrl);
    return url.hostname !== base.hostname;
  } catch {
    return false;
  }
}

const webScraperBit = {
  displayName: 'Web Scraper',
  description: 'Extract data from webpages including text, links, emails, and tables',
  logoUrl: 'lucide:Globe',
  
  actions: {
    /**
     * Scrape a webpage
     */
    scrapeUrl: {
      name: 'scrapeUrl',
      displayName: 'Scrape URL',
      description: 'Fetch and scrape a webpage',
      props: {
        url: {
          type: 'SHORT_TEXT',
          displayName: 'URL',
          description: 'URL to scrape',
          required: true,
        },
        userAgent: {
          type: 'SHORT_TEXT',
          displayName: 'User Agent',
          description: 'Custom User-Agent header',
          required: false,
          defaultValue: 'Mozilla/5.0 (compatible; HabitsBot/1.0)',
        },
        timeout: {
          type: 'NUMBER',
          displayName: 'Timeout (ms)',
          description: 'Request timeout in milliseconds',
          required: false,
          defaultValue: 30000,
        },
        followRedirects: {
          type: 'CHECKBOX',
          displayName: 'Follow Redirects',
          required: false,
          defaultValue: true,
        },
      },
      async run(context: ScraperContext): Promise<ScrapeResult> {
        const { url, userAgent = 'Mozilla/5.0 (compatible; HabitsBot/1.0)', timeout = 30000 } = context.propsValue;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), Number(timeout));
        
        try {
          const response = await fetch(url, {
            headers: {
              'User-Agent': userAgent,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
            },
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          const html = await response.text();
          
          // Extract title
          const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
          const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : undefined;
          
          // Extract description
          const description = extractMeta(html, 'description') || extractMeta(html, 'og:description');
          
          console.log(`🕷️ Web Scraper: Scraped ${url} (${html.length} bytes)`);
          
          return {
            success: true,
            url,
            statusCode: response.status,
            html,
            title,
            description,
            contentLength: html.length,
          };
        } catch (error: any) {
          clearTimeout(timeoutId);
          throw new Error(`Failed to scrape ${url}: ${error.message}`);
        }
      },
    },
    
    /**
     * Extract text content from HTML
     */
    extractText: {
      name: 'extractText',
      displayName: 'Extract Text',
      description: 'Extract plain text content from HTML',
      props: {
        html: {
          type: 'LONG_TEXT',
          displayName: 'HTML',
          description: 'HTML content to extract text from',
          required: true,
        },
        selector: {
          type: 'SHORT_TEXT',
          displayName: 'CSS Selector Pattern',
          description: 'Simple tag selector (e.g., "article", "main", "div.content"). Limited support.',
          required: false,
        },
      },
      async run(context: ScraperContext): Promise<ExtractTextResult> {
        const { html, selector } = context.propsValue;
        
        let content = html;
        
        // Simple selector support (tag name or tag.class)
        if (selector) {
          const tagMatch = selector.match(/^(\w+)(?:\.(\S+))?$/);
          if (tagMatch) {
            const [, tag, className] = tagMatch;
            let pattern: RegExp;
            
            if (className) {
              pattern = new RegExp(`<${tag}[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
            } else {
              pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
            }
            
            const matches = content.match(pattern);
            if (matches) {
              content = matches.join('\n');
            }
          }
        }
        
        const text = stripHtml(content);
        
        console.log(`🕷️ Web Scraper: Extracted ${text.length} characters of text`);
        
        return {
          success: true,
          text,
          wordCount: text.split(/\s+/).filter(Boolean).length,
          characterCount: text.length,
        };
      },
    },
    
    /**
     * Extract all links from HTML
     */
    extractLinks: {
      name: 'extractLinks',
      displayName: 'Extract Links',
      description: 'Extract all links from HTML',
      props: {
        html: {
          type: 'LONG_TEXT',
          displayName: 'HTML',
          description: 'HTML content to extract links from',
          required: true,
        },
        baseUrl: {
          type: 'SHORT_TEXT',
          displayName: 'Base URL',
          description: 'Base URL for resolving relative links',
          required: false,
        },
        filterExternal: {
          type: 'CHECKBOX',
          displayName: 'External Links Only',
          description: 'Only return external links',
          required: false,
          defaultValue: false,
        },
        filterInternal: {
          type: 'CHECKBOX',
          displayName: 'Internal Links Only',
          description: 'Only return internal links',
          required: false,
          defaultValue: false,
        },
      },
      async run(context: ScraperContext): Promise<ExtractLinksResult> {
        const { html, baseUrl, filterExternal, filterInternal } = context.propsValue;
        
        const linkPattern = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        const links: Array<{ href: string; text: string; isExternal: boolean }> = [];
        
        let match;
        while ((match = linkPattern.exec(html)) !== null) {
          let href = match[1];
          const text = stripHtml(match[2]);
          
          // Skip anchors, javascript, and mailto
          if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
            continue;
          }
          
          // Resolve relative URLs
          if (baseUrl && !href.startsWith('http')) {
            try {
              href = new URL(href, baseUrl).href;
            } catch {
              continue;
            }
          }
          
          const isExternal = baseUrl ? isExternalUrl(href, baseUrl) : false;
          
          // Apply filters
          if (filterExternal && !isExternal) continue;
          if (filterInternal && isExternal) continue;
          
          links.push({ href, text, isExternal });
        }
        
        // Deduplicate by href
        const uniqueLinks = Array.from(
          new Map(links.map(l => [l.href, l])).values()
        );
        
        console.log(`🕷️ Web Scraper: Extracted ${uniqueLinks.length} links`);
        
        return {
          success: true,
          links: uniqueLinks,
          count: uniqueLinks.length,
        };
      },
    },
    
    /**
     * Extract email addresses from HTML or text
     */
    extractEmails: {
      name: 'extractEmails',
      displayName: 'Extract Emails',
      description: 'Find all email addresses in content',
      props: {
        content: {
          type: 'LONG_TEXT',
          displayName: 'Content',
          description: 'HTML or text content to search for emails',
          required: true,
        },
        validateDomain: {
          type: 'CHECKBOX',
          displayName: 'Filter Common Invalid',
          description: 'Filter out common invalid/example domains',
          required: false,
          defaultValue: true,
        },
      },
      async run(context: ScraperContext): Promise<ExtractEmailsResult> {
        const { content, validateDomain = true } = context.propsValue;
        
        // Email regex pattern
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        
        const matches = content.match(emailPattern) || [];
        
        // Filter and deduplicate
        const invalidDomains = ['example.com', 'example.org', 'test.com', 'localhost', 'domain.com', 'email.com', 'yoursite.com'];
        
        const lowercased = matches.map((e: string) => e.toLowerCase());
        let emails: string[] = Array.from(new Set<string>(lowercased));
        
        if (validateDomain) {
          emails = emails.filter((email: string) => {
            const domain = email.split('@')[1];
            return !invalidDomains.some(d => domain.includes(d));
          });
        }
        
        console.log(`🕷️ Web Scraper: Found ${emails.length} email addresses`);
        
        return {
          success: true,
          emails,
          count: emails.length,
        };
      },
    },
    
    /**
     * Extract HTML tables
     */
    extractTables: {
      name: 'extractTables',
      displayName: 'Extract Tables',
      description: 'Extract data from HTML tables',
      props: {
        html: {
          type: 'LONG_TEXT',
          displayName: 'HTML',
          description: 'HTML content containing tables',
          required: true,
        },
        includeHeaders: {
          type: 'CHECKBOX',
          displayName: 'Detect Headers',
          description: 'Try to detect table headers (th tags or first row)',
          required: false,
          defaultValue: true,
        },
      },
      async run(context: ScraperContext): Promise<ExtractTablesResult> {
        const { html, includeHeaders = true } = context.propsValue;
        
        const tablePattern = /<table[^>]*>([\s\S]*?)<\/table>/gi;
        const tables: Array<{ headers: string[]; rows: string[][] }> = [];
        
        let tableMatch;
        while ((tableMatch = tablePattern.exec(html)) !== null) {
          const tableHtml = tableMatch[1];
          
          // Extract headers
          const headers: string[] = [];
          if (includeHeaders) {
            const thPattern = /<th[^>]*>([\s\S]*?)<\/th>/gi;
            let thMatch;
            while ((thMatch = thPattern.exec(tableHtml)) !== null) {
              headers.push(stripHtml(thMatch[1]));
            }
          }
          
          // Extract rows
          const rows: string[][] = [];
          const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
          
          let trMatch;
          let isFirstRow = true;
          while ((trMatch = trPattern.exec(tableHtml)) !== null) {
            const rowHtml = trMatch[1];
            
            // Skip if this is the header row
            if (isFirstRow && headers.length > 0 && rowHtml.includes('<th')) {
              isFirstRow = false;
              continue;
            }
            isFirstRow = false;
            
            const cells: string[] = [];
            const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
            
            let tdMatch;
            while ((tdMatch = tdPattern.exec(rowHtml)) !== null) {
              cells.push(stripHtml(tdMatch[1]));
            }
            
            if (cells.length > 0) {
              // If no headers detected, use first row as headers
              if (includeHeaders && headers.length === 0 && rows.length === 0) {
                headers.push(...cells);
              } else {
                rows.push(cells);
              }
            }
          }
          
          if (rows.length > 0 || headers.length > 0) {
            tables.push({ headers, rows });
          }
        }
        
        console.log(`🕷️ Web Scraper: Extracted ${tables.length} tables`);
        
        return {
          success: true,
          tables,
          count: tables.length,
        };
      },
    },
    
    /**
     * Extract structured data (JSON-LD, microdata)
     */
    extractStructuredData: {
      name: 'extractStructuredData',
      displayName: 'Extract Structured Data',
      description: 'Extract JSON-LD and other structured data from HTML',
      props: {
        html: {
          type: 'LONG_TEXT',
          displayName: 'HTML',
          description: 'HTML content to extract structured data from',
          required: true,
        },
      },
      async run(context: ScraperContext) {
        const { html } = context.propsValue;
        
        const structuredData: any[] = [];
        
        // Extract JSON-LD
        const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        let jsonLdMatch;
        while ((jsonLdMatch = jsonLdPattern.exec(html)) !== null) {
          try {
            const data = JSON.parse(jsonLdMatch[1]);
            structuredData.push({ type: 'json-ld', data });
          } catch {
            // Invalid JSON, skip
          }
        }
        
        // Extract Open Graph data
        const ogData: Record<string, string> = {};
        const ogPattern = /<meta[^>]*property=["']og:([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi;
        let ogMatch;
        while ((ogMatch = ogPattern.exec(html)) !== null) {
          ogData[ogMatch[1]] = decodeHtmlEntities(ogMatch[2]);
        }
        if (Object.keys(ogData).length > 0) {
          structuredData.push({ type: 'open-graph', data: ogData });
        }
        
        // Extract Twitter Card data
        const twitterData: Record<string, string> = {};
        const twitterPattern = /<meta[^>]*name=["']twitter:([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi;
        let twitterMatch;
        while ((twitterMatch = twitterPattern.exec(html)) !== null) {
          twitterData[twitterMatch[1]] = decodeHtmlEntities(twitterMatch[2]);
        }
        if (Object.keys(twitterData).length > 0) {
          structuredData.push({ type: 'twitter-card', data: twitterData });
        }
        
        console.log(`🕷️ Web Scraper: Extracted ${structuredData.length} structured data items`);
        
        return {
          success: true,
          structuredData,
          count: structuredData.length,
        };
      },
    },
    
    /**
     * Extract phone numbers
     */
    extractPhoneNumbers: {
      name: 'extractPhoneNumbers',
      displayName: 'Extract Phone Numbers',
      description: 'Find phone numbers in content',
      props: {
        content: {
          type: 'LONG_TEXT',
          displayName: 'Content',
          description: 'HTML or text content to search',
          required: true,
        },
      },
      async run(context: ScraperContext) {
        const { content } = context.propsValue;
        
        // Various phone number patterns
        const phonePatterns = [
          /\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g, // US format
          /\+?[0-9]{1,4}[-.\s]?[0-9]{2,4}[-.\s]?[0-9]{2,4}[-.\s]?[0-9]{2,4}/g, // International
        ];
        
        const phones = new Set<string>();
        
        for (const pattern of phonePatterns) {
          const matches = content.match(pattern) || [];
          for (const match of matches) {
            // Normalize: remove spaces, dots, dashes, parentheses
            const normalized = match.replace(/[-.\s()]/g, '');
            if (normalized.length >= 10) {
              phones.add(match.trim());
            }
          }
        }
        
        const phoneList = [...phones];
        
        console.log(`🕷️ Web Scraper: Found ${phoneList.length} phone numbers`);
        
        return {
          success: true,
          phones: phoneList,
          count: phoneList.length,
        };
      },
    },
    
    /**
     * Extract images
     */
    extractImages: {
      name: 'extractImages',
      displayName: 'Extract Images',
      description: 'Extract image URLs from HTML',
      props: {
        html: {
          type: 'LONG_TEXT',
          displayName: 'HTML',
          description: 'HTML content to extract images from',
          required: true,
        },
        baseUrl: {
          type: 'SHORT_TEXT',
          displayName: 'Base URL',
          description: 'Base URL for resolving relative URLs',
          required: false,
        },
        minSize: {
          type: 'NUMBER',
          displayName: 'Min Size (px)',
          description: 'Minimum width/height to include (if specified in HTML)',
          required: false,
        },
      },
      async run(context: ScraperContext) {
        const { html, baseUrl, minSize } = context.propsValue;
        
        const imgPattern = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
        const images: Array<{ src: string; alt?: string; width?: number; height?: number }> = [];
        
        let match;
        while ((match = imgPattern.exec(html)) !== null) {
          const imgTag = match[0];
          let src = match[1];
          
          // Skip data URIs and empty sources
          if (src.startsWith('data:') || !src) continue;
          
          // Resolve relative URLs
          if (baseUrl && !src.startsWith('http')) {
            try {
              src = new URL(src, baseUrl).href;
            } catch {
              continue;
            }
          }
          
          // Extract alt
          const altMatch = imgTag.match(/alt=["']([^"']*?)["']/i);
          const alt = altMatch ? decodeHtmlEntities(altMatch[1]) : undefined;
          
          // Extract dimensions
          const widthMatch = imgTag.match(/width=["']?(\d+)/i);
          const heightMatch = imgTag.match(/height=["']?(\d+)/i);
          const width = widthMatch ? parseInt(widthMatch[1]) : undefined;
          const height = heightMatch ? parseInt(heightMatch[1]) : undefined;
          
          // Apply size filter
          if (minSize) {
            if ((width && width < minSize) || (height && height < minSize)) {
              continue;
            }
          }
          
          images.push({ src, alt, width, height });
        }
        
        // Deduplicate by src
        const uniqueImages = Array.from(
          new Map(images.map(i => [i.src, i])).values()
        );
        
        console.log(`🕷️ Web Scraper: Found ${uniqueImages.length} images`);
        
        return {
          success: true,
          images: uniqueImages,
          count: uniqueImages.length,
        };
      },
    },
  },
  
  triggers: {},
};

export const webScraper = webScraperBit;
export default webScraperBit;
