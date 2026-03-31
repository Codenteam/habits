/**
 * Tailwind CSS to Style Tag Converter
 * 
 * Processes HTML with Tailwind CSS classes and generates a style tag.
 * Works with Tailwind 4 and handles:
 * - CSS variable removal (--tw-*)
 * - RGB to hex color conversion
 * - Outputs styles in a <style> tag
 * 
 * Based on tailwind-to-inline but externalized for better compatibility.
 */

import * as fs from 'fs';
import * as path from 'path';
import postcss from 'postcss';
// @ts-ignore - Tailwind 4 PostCSS plugin
import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

/**
 * Extract Tailwind config from HTML script tags
 */
const extractTailwindConfig = (html: string): any => {
  // Match script tag containing tailwind.config
  // Extract everything between 'tailwind.config = ' and the closing script tag
  const configMatch = html.match(/<script[^>]*>\s*tailwind\.config\s*=\s*([\s\S]*?)<\/script>/);
  
  console.log('Config match found:', !!configMatch);
  if (configMatch) {
    console.log('Matched config string:', configMatch[1]?.substring(0, 200));
  }
  
  if (configMatch && configMatch[1]) {
    try {
      // Remove any trailing content after the closing brace of the config object
      // The config should be a complete JS object
      const configStr = configMatch[1].trim();
      
      // Find the matching closing brace for the config object
      // This handles nested objects correctly
      let braceCount = 0;
      let endIndex = -1;
      for (let i = 0; i < configStr.length; i++) {
        if (configStr[i] === '{') braceCount++;
        if (configStr[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i + 1;
            break;
          }
        }
      }
      
      const finalConfigStr = endIndex > 0 ? configStr.substring(0, endIndex) : configStr;
      console.log('Final config string to parse:', finalConfigStr.substring(0, 300));
      
      // Parse the config object
      const config = new Function(`return ${finalConfigStr}`)();
      console.log('Parsed config:', JSON.stringify(config, null, 2).substring(0, 500));
      return config;
    } catch (e) {
      console.warn('Failed to parse Tailwind config:', e);
      return {};
    }
  }
  
  return {};
};

/**
 * Convert Tailwind v3 config theme extensions to CSS for Tailwind v4
 */
const configToCSS = (config: any): string => {
  let css = '';
  
  // Handle custom animations
  if (config?.theme?.extend?.animation) {
    const animations = config.theme.extend.animation;
    console.log('Found custom animations:', animations);
    for (const [name, value] of Object.entries(animations)) {
      css += `.animate-${name} {\n  animation: ${value};\n}\n`;
    }
  } else {
    console.log('No custom animations found in config:', JSON.stringify(config, null, 2));
  }
  
  return css;
};

/**
 * Process HTML with Tailwind CSS to generate styles
 */
const processTailwindCSS = async (html: string, config: any = {}): Promise<string> => {
  // Create a virtual CSS file path that can resolve tailwindcss from node_modules
  // Use process.cwd() to get the workspace root where node_modules exists
  const virtualFrom = path.join(process.cwd(), 'virtual-tailwind.css');
  
  // Use Tailwind v4 with just content scanning (config is applied via CSS)
  const tailwindConfig = {
    content: [{ raw: html, extension: 'html' }],
  };
  
  // Use full Tailwind with utilities and base
  const result = await postcss([
    tailwindcss(tailwindConfig),
    autoprefixer,
  ]).process('@import "tailwindcss/utilities";', {
    from: virtualFrom,
    map: false,
  });

  // Add custom CSS from config
  const customCSS = configToCSS(config);

  return result.css + '\n' + customCSS;
};


/**
 * Generate styles and inject into HTML as a style tag
 */
const generateStyleTag = async (html: string): Promise<string> => {
  // Extract Tailwind config before processing
  const config = extractTailwindConfig(html);
  
  // Generate CSS with the extracted config
  const tailwindCss = await processTailwindCSS(html, config);
  
  // Remove Tailwind CDN script and config script
  let processedHtml = html
    .replace(/<script[^>]*src=["']https:\/\/cdn\.tailwindcss\.com[^"']*["'][^>]*><\/script>/gi, '')
    .replace(/<script[^>]*>\s*tailwind\.config\s*=\s*\{[\s\S]*?\}\s*<\/script>/gi, '');

  // Inject the generated CSS as a style tag
  // Insert before </head> or at the start of <body> if no </head>
  if (processedHtml.includes('</head>')) {
    return processedHtml.replace('</head>', `<style>\n${tailwindCss}\n</style>\n</head>`);
  } else if (processedHtml.includes('<body>')) {
    return processedHtml.replace('<body>', `<body>\n<style>\n${tailwindCss}\n</style>`);
  } else {
    return `<style>\n${tailwindCss}\n</style>\n${processedHtml}`;
  }
};

/**
 * Process HTML string and add Tailwind styles in a style tag
 */
export const makeStylesInlineFromString = async (
  htmlString: string,
): Promise<string> => {
  return generateStyleTag(htmlString);
};

/**
 * Read an HTML file and add Tailwind styles in a style tag
 */
export const makeStylesInline = async (
  templatePath: string,
): Promise<string> => {
  const htmlContent = fs.readFileSync(templatePath, 'utf8');
  return generateStyleTag(htmlContent);
};
