import { useEffect, useRef, useState, useCallback } from 'react';
import {
  WorkflowCanvas,
  WorkflowCanvasRef,
  parseHabitContent,
  convertToCanvasFormat,
  exportElement,
  downloadExport,
  prepareForExport,
  applyNodeChanges,
  applyDagreLayout,
  type WorkflowNode,
  type WorkflowEdge,
  type ExportFormat,
  type NodeChange,
} from '@ha-bits/workflow-canvas';
// CSS is imported via workflow-canvas main export

interface ViewerState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  error: string | null;
  loading: boolean;
}

interface InputFormProps {
  onSubmit: (params: { habit?: string; url?: string }) => void;
}

/**
 * Input form shown when no habit content or URL is provided
 */
function InputForm({ onSubmit }: InputFormProps) {
  const [mode, setMode] = useState<'paste' | 'url'>('paste');
  const [habitContent, setHabitContent] = useState('');
  const [urlInput, setUrlInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'paste' && habitContent.trim()) {
      onSubmit({ habit: habitContent });
    } else if (mode === 'url' && urlInput.trim()) {
      onSubmit({ url: urlInput });
    }
  };

  return (
    <div className="flex items-center justify-center w-full h-full bg-slate-900 p-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Habit Viewer</h1>
        
        {/* Mode Toggle */}
        <div className="flex mb-4 bg-slate-800 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode('paste')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'paste'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Paste YAML/JSON
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'url'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Load from URL
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'paste' ? (
            <div className="mb-4">
              <label className="block text-slate-300 text-sm mb-2">
                Paste your habit YAML or JSON content:
              </label>
              <textarea
                value={habitContent}
                onChange={(e) => setHabitContent(e.target.value)}
                placeholder={`name: my-workflow
description: Example workflow
triggers:
  - type: http
    path: /api/example
steps:
  - name: step1
    type: script
    ...`}
                className="w-full h-64 bg-slate-800 text-white border border-slate-600 rounded-lg p-3 font-mono text-sm resize-none focus:outline-none focus:border-blue-500"
              />
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-slate-300 text-sm mb-2">
                Enter URL to fetch habit content:
              </label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/habit.yaml or /path/to/habit.yaml"
                className="w-full bg-slate-800 text-white border border-slate-600 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500"
              />
              <p className="text-slate-500 text-xs mt-2">
                Supports both absolute URLs and relative paths
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={mode === 'paste' ? !habitContent.trim() : !urlInput.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            View Workflow
          </button>
        </form>

        <p className="text-slate-500 text-xs mt-4 text-center">
          You can also pass content directly via URL parameters: <code className="text-slate-400">?habit=...</code> or <code className="text-slate-400">?url=...</code>
        </p>
      </div>
    </div>
  );
}

/**
 * Parse URL parameters for habit content and render settings
 */
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    // Habit content - passed as URL-encoded string (use \n for newlines)
    habit: params.get('habit'),
    // URL to fetch habit content from (relative or absolute)
    url: params.get('url'),
    // Render format: svg, png, html, or interactive (default)
    format: params.get('format') as ExportFormat | 'interactive' | null,
    // Auto-download after render
    download: params.get('download') === 'true',
    // Filename for download
    filename: params.get('filename') || 'habit-workflow',
    // Hide controls
    hideControls: params.get('hideControls') === 'true',
    // Hide minimap
    hideMinimap: params.get('hideMinimap') === 'true',
    // Background color
    bgColor: params.get('bgColor') || '#0f172a',
    // Fit view
    fitView: params.get('fitView') !== 'false',
    // Compact mode - collapse node details by default
    compact: params.get('compact') === 'true',
  };
}

/**
 * Resolve URL (supports relative and absolute URLs)
 */
function resolveUrl(url: string): string {
  // Absolute URL - use as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Relative URL - resolve against current origin
  return new URL(url, window.location.origin).href;
}

/**
 * Decode habit content - handles URL-encoded content (potentially double-encoded)
 * and converts escaped \n to actual newlines
 */
function decodeHabit(habit: string): string {
  let decoded = habit;
  
  // Keep decoding while it looks URL-encoded (has %XX patterns)
  // It seems some of our tools in Codenteam does double URL encoding. 
  // This handles double or triple encoding
  let maxIterations = 5; // Safety limit
  while (decoded.includes('%') && maxIterations > 0) {
    const newDecoded = decodeURIComponent(decoded);
    if (newDecoded === decoded) break; // No change, stop
    decoded = newDecoded;
    maxIterations--;
  }
  
  // Replace literal \n with actual newlines (in case they weren't URL-encoded)
  return decoded.replace(/\\n/g, '\n');
}

function App() {
  const canvasRef = useRef<WorkflowCanvasRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ViewerState>({
    nodes: [],
    edges: [],
    error: null,
    loading: true,
  });
  const [exported, setExported] = useState<string | null>(null);
  const [showInputForm, setShowInputForm] = useState(false);

  const params = getUrlParams();

  // Handle form submission - redirect with new params
  const handleFormSubmit = useCallback((formParams: { habit?: string; url?: string }) => {
    const newParams = new URLSearchParams(window.location.search);
    
    if (formParams.habit) {
      newParams.set('habit', encodeURIComponent(formParams.habit));
      newParams.delete('url');
    } else if (formParams.url) {
      newParams.set('url', formParams.url);
      newParams.delete('habit');
    }
    
    // Redirect to the same page with new params
    window.location.search = newParams.toString();
  }, []);

  // Handle node changes (dragging, selecting, etc.)
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    setState(s => ({
      ...s,
      nodes: applyNodeChanges(changes, s.nodes),
    }));
  }, []);

  // Handle auto-layout (re-arrange nodes using dagre with real dimensions)
  const handleAutoLayout = useCallback(() => {
    // Get nodes with actual dimensions from ReactFlow instance if available
    const instance = canvasRef.current?.getInstance();
    const nodesWithDimensions = instance?.getNodes() as WorkflowNode[] | undefined;
    
    setState(s => {
      // Use nodes with actual dimensions if available, otherwise use state nodes
      const nodesToLayout = nodesWithDimensions || s.nodes;
      // Merge actual dimensions back into state nodes
      const mergedNodes = s.nodes.map(node => {
        const nodeWithDims = nodesToLayout.find(n => n.id === node.id);
        if (nodeWithDims?.width && nodeWithDims?.height) {
          return { ...node, width: nodeWithDims.width, height: nodeWithDims.height };
        }
        return node;
      });
      return {
        ...s,
        nodes: applyDagreLayout(mergedNodes, s.edges),
      };
    });
    // Fit view after layout
    setTimeout(() => canvasRef.current?.fitView(), 100);
  }, []);

  useEffect(() => {
    async function loadHabit() {
      if (!params.habit && !params.url) {
        // Show input form instead of error
        setShowInputForm(true);
        setState(s => ({
          ...s,
          loading: false,
        }));
        return;
      }

      try {
        let content: string;
        
        if (params.url) {
          // Fetch content from URL
          const resolvedUrl = resolveUrl(params.url);
          const response = await fetch(resolvedUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
          }
          content = await response.text();
        } else {
          content = decodeHabit(params.habit!);
        }
        
        const parsed = parseHabitContent(content);
        let { nodes, edges } = convertToCanvasFormat(parsed);

        // Check if nodes need auto-layout (no positions or all at origin)
        const needsLayout = nodes.length > 0 && (
          nodes.some(n => !n.position || n.position.x === undefined || n.position.y === undefined) ||
          nodes.every(n => n.position && n.position.x === 0 && n.position.y === 0)
        );

        // Apply layout algorithm if needed
        if (needsLayout) {
          nodes = applyDagreLayout(nodes, edges);

          setTimeout(() => canvasRef.current?.fitView(), 200)
        }

        // Apply compact mode - collapse all nodes by default
        if (params.compact) {
          nodes = nodes.map(node => ({
            ...node,
            data: {
              ...node.data,
              collapsed: true,
            },
          }));
        }

        setState({
          nodes,
          edges,
          error: null,
          loading: false,
        });
      } catch (err) {
        setState(s => ({
          ...s,
          loading: false,
          error: `Failed to parse habit: ${err instanceof Error ? err.message : String(err)}`,
        }));
      }
    }

    loadHabit();
  }, [params.habit, params.url]);

  // Handle export after render
  useEffect(() => {
    async function performExport() {
      if (
        state.loading ||
        state.error ||
        !params.format ||
        params.format === 'interactive' ||
        !containerRef.current
      ) {
        return;
      }

      // Wait for ReactFlow to render
      await new Promise(resolve => setTimeout(resolve, 500));

      const element = containerRef.current.querySelector('.react-flow') as HTMLElement;
      if (!element) return;

      try {
        const cleanup = prepareForExport(element);
        const result = await exportElement(element, {
          format: params.format,
          backgroundColor: params.bgColor,
        });
        cleanup();

        setExported(result);

        if (params.download) {
          downloadExport(result, params.filename, params.format);
        }
      } catch (err) {
        console.error('Export failed:', err);
      }
    }

    performExport();
  }, [state.loading, state.error, params.format, params.download, params.filename, params.bgColor]);

  // Loading state
  if (state.loading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-slate-900">
        <div className="text-slate-400">Loading habit...</div>
      </div>
    );
  }

  // Show input form when no habit/url provided
  if (showInputForm) {
    return <InputForm onSubmit={handleFormSubmit} />;
  }

  // Error state
  if (state.error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-slate-900 p-4">
        <div className="text-red-400 text-center max-w-md">
          <div className="text-lg font-semibold mb-2">Error</div>
          <div className="text-sm">{state.error}</div>
        </div>
      </div>
    );
  }

  // Show exported image/html
  if (exported && params.format && params.format !== 'interactive') {
    if (params.format === 'html') {
      return (
        <iframe
          src={exported}
          className="w-full h-full border-0"
          title="Habit Workflow"
        />
      );
    }
    return (
      <div className="flex items-center justify-center w-full h-full bg-slate-900">
        <img src={exported} alt="Habit Workflow" className="max-w-full max-h-full object-contain" />
      </div>
    );
  }

  // Interactive view
  return (
    <div ref={containerRef} className="w-full h-full relative">
      <WorkflowCanvas
        ref={canvasRef}
        nodes={state.nodes}
        edges={state.edges}
        showControls={!params.hideControls}
        showMinimap={!params.hideControls && !params.hideMinimap}
        fitView={params.fitView}
        backgroundColor={params.bgColor}
        interactive={true}
        onNodesChange={handleNodesChange}
        onAutoLayout={handleAutoLayout}
        showActionButtons={!params.hideControls}
        forceAutoLayout={true}
      />
    </div>
  );
}

export default App;
