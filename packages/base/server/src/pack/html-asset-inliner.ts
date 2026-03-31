/**
 * HTML Asset Inliner
 * 
 * Processes HTML files to:
 * 1. Replace Tailwind CDN with local script
 * 2. Inject custom scripts
 * 
 * This creates self-contained HTML that works offline.
 */

import * as fs from 'fs';
import * as path from 'path';
import { replaceTailwindCDN } from './tailwind-replacer';
import { LoggerFactory } from '@ha-bits/core/logger';

const logger = LoggerFactory.getRoot();

/**
 * Script to inject into HTML
 */
export interface InjectScript {
  /** Script ID attribute */
  id: string;
  /** Script content (will be inlined) */
  content: string;
}

/**
 * Options for HTML asset inlining
 */
export interface HtmlAssetInlinerOptions {
  /** Base directory for resolving relative paths */
  baseDir: string;
  /** Scripts to inject into the HTML (before </head>) */
  injectScripts?: InjectScript[];
}

/**
 * Result of processing an HTML file
 */
export interface ProcessedHtml {
  /** The processed HTML content with all assets inlined */
  html: string;
  /** Whether Tailwind was detected and processed */
  tailwindProcessed: boolean;
}

/**
 * Process an HTML file to replace Tailwind CDN and inject scripts
 */
export async function processHtmlFile(
  htmlContent: string,
  options: HtmlAssetInlinerOptions
): Promise<ProcessedHtml> {
  let html = htmlContent;
  let tailwindProcessed = false;
  
  try {
    // Step 1: Check for Tailwind CDN and replace it
    const tailwindCdnPattern = /<script[^>]*src=["']https:\/\/cdn\.tailwindcss\.com[^"']*["'][^>]*><\/script>/gi;
    
    if (tailwindCdnPattern.test(html)) {
      logger.info('Detected Tailwind CDN, replacing with local version...');
      
      // Reset regex lastIndex
      tailwindCdnPattern.lastIndex = 0;
      
      // Replace CDN with local script
      html = await replaceTailwindCDN(html);
      
      tailwindProcessed = true;
      logger.info('Tailwind CDN replaced with local version');
    }
    
    // Step 2: Inject scripts if provided
    if (options.injectScripts && options.injectScripts.length > 0) {
      const scriptsBlock = options.injectScripts
        .map(s => `<script id="${s.id}">\n${s.content}\n</script>`)
        .join('\n');
      
      // Inject before </head> or at start of <body>
      if (html.includes('</head>')) {
        html = html.replace('</head>', scriptsBlock + '\n</head>');
      } else if (html.includes('<body>')) {
        html = html.replace('<body>', '<body>\n' + scriptsBlock);
      } else {
        html = scriptsBlock + '\n' + html;
      }
      logger.info('Injected scripts into HTML', { count: options.injectScripts.length });
    }
    
    return {
      html,
      tailwindProcessed,
    };
  } catch (err: any) {
    logger.warn('HTML processing failed', { error: err.message });
    return {
      html: htmlContent,
      tailwindProcessed: false,
    };
  }
}

/**
 * Process all HTML files in a directory
 */
export async function processHtmlDirectory(
  dir: string,
  options?: Partial<HtmlAssetInlinerOptions>
): Promise<Map<string, ProcessedHtml>> {
  const results = new Map<string, ProcessedHtml>();
  
  const processDir = async (currentDir: string) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        await processDir(fullPath);
      } else if (entry.name.endsWith('.html') || entry.name.endsWith('.htm')) {
        const htmlContent = fs.readFileSync(fullPath, 'utf8');
        const relativePath = path.relative(dir, fullPath);
        
        const processed = await processHtmlFile(htmlContent, {
          baseDir: path.dirname(fullPath),
          ...options,
        });
        
        results.set(relativePath, processed);
      }
    }
  };
  
  await processDir(dir);
  return results;
}
