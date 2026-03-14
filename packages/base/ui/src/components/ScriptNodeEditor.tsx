import { memo, useCallback } from 'react';
import { Code } from 'lucide-react';
import ScriptEditor from './ScriptEditor';

export interface ScriptNodeEditorProps {
  /** Current script content */
  script: string;
  /** Current language */
  language: string;
  /** Callback when script changes */
  onScriptChange: (script: string) => void;
  /** Callback when language changes */
  onLanguageChange: (language: string) => void;
  /** Height of the editor */
  height?: string;
  /** Whether to show the language selector */
  showLanguageSelector?: boolean;
  /** Whether to show the label for the script editor */
  showLabel?: boolean;
  /** Additional class names */
  className?: string;
  /** Readonly mode - disables editing */
  readonly?: boolean;
}

// Available languages with display names
const LANGUAGES = [
  { value: 'deno', label: 'Deno (TypeScript)' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python3', label: 'Python 3' },
  { value: 'bash', label: 'Bash' },
  { value: 'go', label: 'Go' },
  { value: 'sql', label: 'SQL' },
] as const;

/**
 * ScriptNodeEditor - Combined language selector and code editor for script nodes
 * 
 * WHERE USED:
 * - packages/base/ui - CustomNode (inline script editing on canvas)
 * - packages/base/ui - NodeConfigPanel (script configuration in side panel)
 * 
 * WHY:
 * - Provides a unified interface for editing script content with language selection
 * - Wraps ScriptEditor (Monaco) with language dropdown and optional labels
 * - Supports readonly mode for preview contexts
 * 
 * WHEN TO USE:
 * - When editing script-type workflow nodes
 * - When you need both language selection and code editing together
 */
const ScriptNodeEditor = memo(({
  script,
  language,
  onScriptChange,
  onLanguageChange,
  height = '200px',
  showLanguageSelector = true,
  showLabel = true,
  className = '',
  readonly = false,
}: ScriptNodeEditorProps) => {
  const handleLanguageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onLanguageChange(e.target.value);
  }, [onLanguageChange]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Language Selection */}
      {showLanguageSelector && (
        <div>
          <label className="block text-sm font-medium mb-1 text-slate-300">Language</label>
          <select
            value={language}
            onChange={handleLanguageChange}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={readonly}
            className={`w-full px-3 py-2 border border-slate-600 rounded-md bg-slate-900 text-white focus:border-blue-500 focus:outline-none nodrag ${readonly ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {LANGUAGES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Script Editor */}
      <div>
        {showLabel && (
          <label className="block text-sm font-medium mb-1 text-slate-300">
            <Code className="w-4 h-4 inline mr-1" />
            Script
          </label>
        )}
        <ScriptEditor
          value={script}
          onChange={onScriptChange}
          language={language}
          height={height}
          readOnly={readonly}
        />
      </div>
    </div>
  );
});

ScriptNodeEditor.displayName = 'ScriptNodeEditor';

export default ScriptNodeEditor;
