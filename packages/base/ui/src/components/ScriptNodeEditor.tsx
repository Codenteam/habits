import { lazy, memo, Suspense } from 'react';
import { Code, Loader2 } from 'lucide-react';

const ScriptEditor = lazy(() => import('./ScriptEditor'));

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

// Only JavaScript is supported
const JAVASCRIPT_LANGUAGE = 'javascript';

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
// Suppress unused warning
void JAVASCRIPT_LANGUAGE;

const ScriptNodeEditor = memo(({
  script,
  language,
  onScriptChange,
  onLanguageChange: _onLanguageChange,
  height = '200px',
  showLanguageSelector: _showLanguageSelector = true,
  showLabel = true,
  className = '',
  readonly = false,
}: ScriptNodeEditorProps) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Script Editor */}
      <div>
        {showLabel && (
          <label className="block text-sm font-medium mb-1 text-slate-300">
            <Code className="w-4 h-4 inline mr-1" />
            Script
          </label>
        )}
        <Suspense
          fallback={
            <div
              className="flex items-center justify-center rounded border border-gray-600 bg-[#1e1e2e] text-slate-400"
              style={{ height }}
            >
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          }
        >
          <ScriptEditor
            value={script}
            onChange={onScriptChange}
            language={language || 'deno'}
            height={height}
            readOnly={readonly}
          />
        </Suspense>
      </div>
    </div>
  );
});

ScriptNodeEditor.displayName = 'ScriptNodeEditor';

export default ScriptNodeEditor;
