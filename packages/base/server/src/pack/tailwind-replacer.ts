/**
 * Tailwind CDN Replacer
 * 
 * Simply replaces the Tailwind CDN script with the local cached version.
 * No processing, no transformation - just a simple replacement.
 */

// Import the Tailwind script content at build time as raw text
// esbuild is configured to load *.local.js files as text
import tailwindScriptRaw from './tailwind.local.js';

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
