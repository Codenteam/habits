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
 * Combined script language selector and editor component.
 * Used in both NodeConfigPanel (for configuration) and CustomNode (for inline editing).
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
            className="w-full px-3 py-2 border border-slate-600 rounded-md bg-slate-900 text-white focus:border-blue-500 focus:outline-none nodrag"
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
        />
      </div>
    </div>
  );
});

ScriptNodeEditor.displayName = 'ScriptNodeEditor';

export default ScriptNodeEditor;
