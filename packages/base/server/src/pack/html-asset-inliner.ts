/**
 * HTML Asset Inliner
 * 
 * Processes HTML files to:
 * 1. Remove Tailwind CDN and generate CSS via Tailwind CLI
 * 2. Inline all assets using the 'inliner' npm package
 * 
 * This creates fully self-contained HTML that works offline.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LoggerFactory } from '@ha-bits/core/logger';
import postcss from 'postcss';
// @ts-ignore - moduleResolution mismatch with @tailwindcss/postcss types
import tailwindcss from '@tailwindcss/postcss';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Inliner = require('inliner');

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
  /** Number of CSS files inlined */
  cssFilesInlined: number;
  /** Number of JS files inlined */
  jsFilesInlined: number;
  /** Number of images inlined */
  imagesInlined: number;
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
 * Generate Tailwind CSS using postcss + tailwindcss v4
 */
async function runTailwindCli(htmlPath: string, outputCssPath: string, configContent?: string): Promise<boolean> {
  try {
    // For Tailwind v4 with @tailwindcss/postcss, we need to run from a directory
    // where tailwindcss can be resolved. Use the project root.
    const projectRoot = process.cwd();
    
    // Tailwind v4 uses @import "tailwindcss" and @source directive
    const inputCss = `@import "tailwindcss";
@source "${htmlPath}";`;
    
    // Process with postcss + @tailwindcss/postcss (v4)
    // Run from project root so tailwindcss can be resolved
    const result = await postcss([
      tailwindcss()
    ]).process(inputCss, {
      from: path.join(projectRoot, 'input.css'),
      to: outputCssPath
    });
    
    // Write output CSS
    fs.writeFileSync(outputCssPath, result.css);
    
    return fs.existsSync(outputCssPath);
  } catch (err: any) {
    logger.warn('Tailwind processing failed', { error: err.message });
    return false;
  }
}

/**
 * Inline all assets in HTML using the inliner package
 */
async function runInliner(htmlPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      new Inliner(htmlPath, {
        images: true,        // Inline images as base64 data URIs
        compressCSS: false,  // Don't compress CSS
        compressJS: false,   // Don't compress JS
        skipAbsoluteUrls: false, // Process absolute URLs too
      }, (error: Error | null, html: string) => {
        if (error) {
          logger.warn('Inliner failed, returning original HTML', { error: error.message });
          resolve(fs.readFileSync(htmlPath, 'utf8'));
        } else {
          resolve(html);
        }
      });
    } catch (err: any) {
      // If inliner fails, return original content
      logger.warn('Inliner failed, returning original HTML', { error: err.message });
      resolve(fs.readFileSync(htmlPath, 'utf8'));
    }
  });
}

/**
 * Process an HTML file to inline all assets
 */
export async function processHtmlFile(
  htmlContent: string,
  options: HtmlAssetInlinerOptions
): Promise<ProcessedHtml> {
  const { baseDir } = options;
  
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
    
    const fileName = `processed-${Date.now()}.html`;

    // TODO: Can't you figure out a better path??? The whole /tmp thing won't work in windows!

    const buildDir = path.join('/tmp', 'habits-html-inliner');
    // Create if not there
    if(!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
    }
    // Step 2: Write the processed HTML to temp file
    const htmlForInlining = path.join(buildDir, fileName);
    
    // Copy all assets from baseDir to tmpDir for inliner to find them
    // copyDirRecursive(baseDir, tmpDir);
    
    // Write the processed HTML
    fs.writeFileSync(htmlForInlining, html);
    
    // Step 3: Run inliner to inline CSS, JS, and images
    logger.info('Running inliner to bundle all assets...');
    let inlinedHtml = await runInliner(htmlForInlining);
    
    // Step 4: Inject scripts if provided
    if (options.injectScripts && options.injectScripts.length > 0) {
      const scriptsBlock = options.injectScripts
        .map(s => `<script id="${s.id}">\n${s.content}\n</script>`)
        .join('\n');
      
      // Inject before </head> or at start of <body>
      if (inlinedHtml.includes('</head>')) {
        inlinedHtml = inlinedHtml.replace('</head>', scriptsBlock + '\n</head>');
      } else if (inlinedHtml.includes('<body>')) {
        inlinedHtml = inlinedHtml.replace('<body>', '<body>\n' + scriptsBlock);
      } else {
        inlinedHtml = scriptsBlock + '\n' + inlinedHtml;
      }
      logger.info('Injected scripts into HTML', { count: options.injectScripts.length });
    }
    
    return {
      html: inlinedHtml,
      tailwindProcessed,
      cssFilesInlined: 0, // inliner doesn't report this
      jsFilesInlined: 0,
      imagesInlined: 0,
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
 * Copy directory recursively
 */
function copyDirRecursive(src: string, dest: string): void {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
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
