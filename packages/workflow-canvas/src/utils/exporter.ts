import { toSvg, toPng } from 'html-to-image';
import type { ExportOptions, ExportFormat } from '../types';

/**
 * Default export options
 */
const DEFAULT_OPTIONS: Partial<ExportOptions> = {
  backgroundColor: '#0f172a',
  padding: 20,
  quality: 0.95,
};

/**
 * Export a DOM element to the specified format
 */
export async function exportElement(
  element: HTMLElement,
  options: ExportOptions
): Promise<string> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  const exportOptions = {
    backgroundColor: mergedOptions.backgroundColor,
    quality: mergedOptions.quality,
    width: mergedOptions.width,
    height: mergedOptions.height,
    style: {
      padding: `${mergedOptions.padding}px`,
    },
  };

  switch (mergedOptions.format) {
    case 'svg':
      return toSvg(element, exportOptions);
    
    case 'png':
      return toPng(element, exportOptions);
    
    case 'html':
      return exportToHtml(element, mergedOptions);
    
    default:
      throw new Error(`Unsupported export format: ${mergedOptions.format}`);
  }
}

/**
 * Export element to standalone HTML
 */
async function exportToHtml(
  element: HTMLElement,
  options: Partial<ExportOptions>
): Promise<string> {
  // Get the SVG representation first
  const svgDataUrl = await toSvg(element, {
    backgroundColor: options.backgroundColor,
    quality: options.quality,
  });

  // Create standalone HTML document
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Habit Workflow</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: ${options.backgroundColor || '#0f172a'};
    }
    img {
      max-width: 100%;
      max-height: 100vh;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <img src="${svgDataUrl}" alt="Habit Workflow" />
</body>
</html>`;

  // Return as data URL
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

/**
 * Download exported content as a file
 */
export function downloadExport(
  dataUrl: string,
  filename: string,
  format: ExportFormat
): void {
  const link = document.createElement('a');
  link.download = `${filename}.${format}`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Prepare element for export (hide interactive elements)
 */
export function prepareForExport(container: HTMLElement): () => void {
  // Hide controls and minimap during export
  const controls = container.querySelector('.react-flow__controls');
  const minimap = container.querySelector('.react-flow__minimap');
  const panel = container.querySelector('.react-flow__panel');
  
  const originalDisplay = {
    controls: controls instanceof HTMLElement ? controls.style.display : null,
    minimap: minimap instanceof HTMLElement ? minimap.style.display : null,
    panel: panel instanceof HTMLElement ? panel.style.display : null,
  };
  
  if (controls instanceof HTMLElement) controls.style.display = 'none';
  if (minimap instanceof HTMLElement) minimap.style.display = 'none';
  if (panel instanceof HTMLElement) panel.style.display = 'none';
  
  // Return cleanup function
  return () => {
    if (controls instanceof HTMLElement && originalDisplay.controls !== null) {
      controls.style.display = originalDisplay.controls;
    }
    if (minimap instanceof HTMLElement && originalDisplay.minimap !== null) {
      minimap.style.display = originalDisplay.minimap;
    }
    if (panel instanceof HTMLElement && originalDisplay.panel !== null) {
      panel.style.display = originalDisplay.panel;
    }
  };
}
