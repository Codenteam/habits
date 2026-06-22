import type { Editor as GrapesEditor, EditorConfig } from 'grapesjs';
import type { editor as MonacoEditorType } from 'monaco-editor';

export type MonacoModule = typeof import('monaco-editor');
export type { GrapesEditor, EditorConfig, MonacoEditorType };

export async function loadMonacoEditor(): Promise<MonacoModule> {
  return import('monaco-editor');
}

export interface GrapesJsStack {
  grapesjs: typeof import('grapesjs').default;
  grapesjsBlocksBasic: typeof import('grapesjs-blocks-basic').default;
  grapesjsPresetWebpage: typeof import('grapesjs-preset-webpage').default;
  grapesjsPluginForms: typeof import('grapesjs-plugin-forms').default;
  grapesjsTailwind: typeof import('grapesjs-tailwind').default;
  parserPostCSS: typeof import('grapesjs-parser-postcss').default;
  customCodePlugin: typeof import('grapesjs-custom-code').default;
}

export async function loadGrapesJsStack(): Promise<GrapesJsStack> {
  const [
    grapesjsMod,
    grapesjsBlocksBasic,
    grapesjsPresetWebpage,
    grapesjsPluginForms,
    grapesjsTailwind,
    parserPostCSS,
    customCodePlugin,
  ] = await Promise.all([
    import('grapesjs'),
    import('grapesjs-blocks-basic'),
    import('grapesjs-preset-webpage'),
    import('grapesjs-plugin-forms'),
    import('grapesjs-tailwind'),
    import('grapesjs-parser-postcss'),
    import('grapesjs-custom-code'),
    import('grapesjs/dist/css/grapes.min.css'),
  ]);

  return {
    grapesjs: grapesjsMod.default,
    grapesjsBlocksBasic: grapesjsBlocksBasic.default,
    grapesjsPresetWebpage: grapesjsPresetWebpage.default,
    grapesjsPluginForms: grapesjsPluginForms.default,
    grapesjsTailwind: grapesjsTailwind.default,
    parserPostCSS: parserPostCSS.default,
    customCodePlugin: customCodePlugin.default,
  };
}

export function defineMonacoTheme(monaco: MonacoModule): void {
  monaco.editor.defineTheme('cyber-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'tag', foreground: '22d3ee' },
      { token: 'attribute.name', foreground: 'a78bfa' },
      { token: 'attribute.value', foreground: '4ade80' },
      { token: 'comment', foreground: '3f3f46', fontStyle: 'italic' },
    ],
    colors: {
      'editor.background': '#13141c',
      'editor.foreground': '#ffffff',
      'editor.lineHighlightBackground': '#1f202a',
      'editor.lineHighlightBorder': '#00000000',
      'editorLineNumber.foreground': '#ffffff50',
      'editorLineNumber.activeForeground': '#ffffff',
      'editor.selectionBackground': '#ffffff25',
      'editor.inactiveSelectionBackground': '#ffffff15',
      'editorCursor.foreground': '#ffffff',
      'editorWidget.background': '#1a1b26',
      'editorWidget.border': '#ffffff20',
      'scrollbarSlider.background': '#ffffff15',
      'scrollbarSlider.hoverBackground': '#ffffff25',
      'scrollbarSlider.activeBackground': '#ffffff35',
    },
  });
}
