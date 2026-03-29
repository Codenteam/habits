/**
 * HTML Asset Inliner
 * 
 * Processes HTML files to:
 * 1. Remove Tailwind CDN and generate CSS via Tailwind CLI
 * 2. Inject custom scripts
 * 
 * This creates self-contained HTML that works offline.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
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
 * Extract Tailwind config from HTML inline script
 */
function extractTailwindConfig(html: string): { config: string | null; htmlWithoutConfig: string } {
  // Match tailwind.config = { ... } in script tags
  const configPattern = /<script[^>]*>\s*(tailwind\.config\s*=\s*\{[\s\S]*?\})\s*;?\s*<\/script>/gi;
  let config: string | null = null;
  
  const htmlWithoutConfig = html.replace(configPattern, (match, configContent) => {
    config = configContent;
    return ''; // Remove the config script
  });
  
  return { config, htmlWithoutConfig };
}

/**
 * Generate Tailwind CSS using @tailwindcss/cli v4
 */
async function runTailwindCli(htmlPath: string, outputCssPath: string, configContent?: string): Promise<boolean> {
  try {
    const tmpDir = path.dirname(outputCssPath);
    
    // Create input CSS file with @import and @source directives (Tailwind v4 syntax)
    const inputCssPath = path.join(tmpDir, 'input.css');
    const inputCss = `@import "tailwindcss";
@source "${htmlPath}";`;
    fs.writeFileSync(inputCssPath, inputCss);
    
    // Run Tailwind CLI via npx
    return new Promise((resolve) => {
      const proc = spawn('npx', ['@tailwindcss/cli', '-i', inputCssPath, '-o', outputCssPath], {
        cwd: tmpDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      });
      
      let stderr = '';
      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputCssPath)) {
          resolve(true);
        } else {
          logger.warn('Tailwind CLI failed', { code, stderr: stderr.slice(0, 500) });
          resolve(false);
        }
      });
      
      proc.on('error', (err) => {
        logger.warn('Tailwind CLI spawn error', { error: err.message });
        resolve(false);
      });
    });
  } catch (err: any) {
    logger.warn('Tailwind processing failed', { error: err.message });
    return false;
  }
}

/**
 * Process an HTML file to inline Tailwind CSS and inject scripts
 */
export async function processHtmlFile(
  htmlContent: string,
  options: HtmlAssetInlinerOptions
): Promise<ProcessedHtml> {
  let html = htmlContent;
  let tailwindProcessed = false;
  
  // Create temp directory for processing
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-inliner-'));
  
  try {
    // Step 1: Check for Tailwind CDN and process it
    const tailwindCdnPattern = /<script[^>]*src=["']https:\/\/cdn\.tailwindcss\.com[^"']*["'][^>]*><\/script>/gi;
    
    if (tailwindCdnPattern.test(html)) {
      logger.info('Detected Tailwind CDN, running Tailwind CLI...');
      
      // Reset regex lastIndex
      tailwindCdnPattern.lastIndex = 0;
      
      // Remove the Tailwind CDN script
      html = html.replace(tailwindCdnPattern, '');
      
      // Extract any tailwind.config from inline scripts
      const { config: tailwindConfig, htmlWithoutConfig } = extractTailwindConfig(html);
      html = htmlWithoutConfig;
      
      // Write HTML to temp file for Tailwind to scan
      const tempHtmlPath = path.join(tmpDir, 'input.html');
      fs.writeFileSync(tempHtmlPath, html);
      
      // Run Tailwind
      const outputCssPath = path.join(tmpDir, 'tailwind-output.css');
      const success = await runTailwindCli(tempHtmlPath, outputCssPath, tailwindConfig || undefined);
      
      if (success && fs.existsSync(outputCssPath)) {
        const tailwindCss = fs.readFileSync(outputCssPath, 'utf8');
        
        // Inject the generated CSS into <head>
        const styleTag = `<style id="tailwind-css">\n${tailwindCss}\n</style>`;
        
        if (html.includes('</head>')) {
          html = html.replace('</head>', `${styleTag}\n</head>`);
        } else if (html.includes('<body')) {
          html = html.replace(/<body([^>]*)>/i, `${styleTag}\n<body$1>`);
        } else {
          html = styleTag + '\n' + html;
        }
        
        tailwindProcessed = true;
        logger.info('Tailwind CSS generated and inlined', { cssSize: tailwindCss.length });
      }
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
  } finally {
    // Cleanup temp directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
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
