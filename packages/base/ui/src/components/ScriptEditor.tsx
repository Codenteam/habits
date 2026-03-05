import { memo, useCallback, useMemo } from 'react';
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';

interface ScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
  placeholder?: string;
}

// Map habit language names to Monaco language identifiers
const languageMap: Record<string, string> = {
  deno: 'typescript',
  typescript: 'typescript',
  python3: 'python',
  bash: 'shell',
  go: 'go',
  sql: 'sql',
};

const ScriptEditor = memo(({ 
  value, 
  onChange, 
  language = 'typescript',
  height = '200px',
}: ScriptEditorProps) => {
  const monacoLanguage = useMemo(() => languageMap[language] || 'typescript', [language]);

  const handleChange = useCallback((newValue: string | undefined) => {
    onChange(newValue || '');
  }, [onChange]);

  const handleBeforeMount = useCallback((monaco: Monaco) => {
    // Disable all validation/diagnostics
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    });
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    });

    monaco.editor.defineTheme('script-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'c792ea' },
        { token: 'string', foreground: 'c3e88d' },
        { token: 'number', foreground: 'f78c6c' },
        { token: 'comment', foreground: '545454', fontStyle: 'italic' },
        { token: 'type', foreground: 'ffcb6b' },
        { token: 'function', foreground: '82aaff' },
      ],
      colors: {
        'editor.background': '#1e1e2e',
        'editor.foreground': '#cdd6f4',
        'editor.lineHighlightBackground': '#313244',
        'editor.lineHighlightBorder': '#00000000',
        'editorLineNumber.foreground': '#6c7086',
        'editorLineNumber.activeForeground': '#cdd6f4',
        'editor.selectionBackground': '#45475a',
        'editor.inactiveSelectionBackground': '#313244',
        'editorCursor.foreground': '#f5e0dc',
        'scrollbarSlider.background': '#45475a50',
        'scrollbarSlider.hoverBackground': '#45475a80',
        'scrollbarSlider.activeBackground': '#45475aaa',
      }
    });
  }, []);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    monaco.editor.setTheme('script-dark');
    // Clear all markers (errors, warnings) for all languages
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelMarkers(model, 'owner', []);
    }
  }, []);

  return (
    <div 
      className="rounded border border-gray-600 overflow-hidden nodrag nowheel"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Editor
        height={height}
        language={monacoLanguage}
        value={value}
        onChange={handleChange}
        options={{
          minimap: { enabled: false },
          fontSize: 12,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          folding: true,
          automaticLayout: true,
          padding: { top: 8, bottom: 8 },
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          tabSize: 2,
          insertSpaces: true,
          formatOnPaste: true,
          renderValidationDecorations: 'off',
        }}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
      />
    </div>
  );
});

ScriptEditor.displayName = 'ScriptEditor';

export default ScriptEditor;
