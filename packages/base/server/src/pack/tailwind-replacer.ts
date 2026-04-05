/**
 * Tailwind CDN Replacer
 * 
 * Simply replaces the Tailwind CDN script with the local cached version.
 * No processing, no transformation - just a simple replacement.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// Load tailwind script at runtime using fs.readFileSync
// __dirname is available in CommonJS modules

// Try multiple possible paths (works for both tsx dev and built bundle)
function loadTailwindScript(): string {
  const paths = [
    path.join(__dirname, 'tailwind.local.txt'),
    path.join(__dirname, '..', 'pack', 'tailwind.local.txt'),
    path.join(process.cwd(), 'packages/base/server/src/pack/tailwind.local.txt'),
  ];
  
  for (const p of paths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf8');
    }
  }
  
  console.warn('Warning: tailwind.local.txt not found, Tailwind CDN replacement disabled');
  return '';
}

const tailwindScriptRaw = loadTailwindScript();

/**
 * Replace Tailwind CDN with local script
 */
export async function replaceTailwindCDN(html: string): Promise<string> {
  // Use the bundled Tailwind script content
  let tailwindScript = tailwindScriptRaw;
  
  // Escape any </script> tags in the JavaScript to prevent breaking out of the script tag
  tailwindScript = tailwindScript.replace(/<\/script>/gi, '<\\/script>');
  
  // Find and replace the CDN script tag with inline script
  const cdnPattern = /<script[^>]*src=["']https:\/\/cdn\.tailwindcss\.com[^"']*["'][^>]*><\/script>/gi;
  
  if (cdnPattern.test(html)) {
    // Reset regex
    cdnPattern.lastIndex = 0;
    
    // Replace with local inline script
    // Use a function to avoid $ special replacement patterns
    const inlineScript = `<script>\n${tailwindScript}\n</script>`;
    let result = html.replace(cdnPattern, () => inlineScript);
    
    // Remove tailwind.config script as it's not compatible with the standalone version
    const configPattern = /<script[^>]*>\s*tailwind\.config\s*=\s*\{[\s\S]*?\}\s*<\/script>/gi;
    result = result.replace(configPattern, '');
    
    return result;
  }
  
  return html;
}
