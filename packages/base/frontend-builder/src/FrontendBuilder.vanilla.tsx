/**
 * PLEASE PLEASE PLEASE, Humans and Bots, don't split this file, and don't use the react components for monaco or grapes
 * PLEASE!!
 * 
 * 
 * Don't use states, use refs instead, re-rendering causes a ton of issues. 
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import grapesjs, { type Editor as GrapesEditor, type EditorConfig } from 'grapesjs';
import grapesjsPresetWebpage from 'grapesjs-preset-webpage';
import grapesjsBlocksBasic from 'grapesjs-blocks-basic';
import grapesjsPluginForms from 'grapesjs-plugin-forms';
import grapesjsTailwind from 'grapesjs-tailwind';
import parserPostCSS from 'grapesjs-parser-postcss';
import customCodePlugin from 'grapesjs-custom-code';
import * as monaco from 'monaco-editor';
import type { editor as MonacoEditorType } from 'monaco-editor';
import { Save, Plug, Loader2, Settings, Bot, Zap, X, AlignLeft } from 'lucide-react';
import type { FrontendBuilderProps, WebCanvasConfig, HostingDetectionResult } from './types';
import { detectHostingEnvironment, validateTenantUrl, generateWithAI } from './webcanvas-client';

// Import CSS
import 'grapesjs/dist/css/grapes.min.css';
import './FrontendBuilder.css';

// ==========================================
// Helper Functions
// ==========================================

const defaultModel = 'claude-sonnet-4-6';
// Fetch available models from tenant API
async function fetchAvailableModels(tenantUrl: string, apiKey: string): Promise<{ id: string, name: string }[]> {
  try {
    const url = `${tenantUrl}/api/models`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('Failed to fetch models:', response.status);
      return [];
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      return data.map((m: any) => typeof m === 'string' ? { id: m, name: m } : {
        id: m.model_id,
        name: m.name
      });
    }
    if (data.models && Array.isArray(data.models)) {
      return data.models.map((m: any) => typeof m === 'string' ? { id: m, name: m } : { id: m.id || m.name || m.model, name: m.name || m.id });
    }
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((m: any) => typeof m === 'string' ? { id: m, name: m } : { id: m.id || m.name || m.model, name: m.name || m.id });
    }
    return [];
  } catch (err) {
    console.warn('Error fetching models:', err);
    return [];
  }
}

// Register HTML formatting provider for Monaco (js-beautify)
let formatterRegistered = false;
function registerHtmlFormatter() {
  if (formatterRegistered) return;
  formatterRegistered = true;

}

// Define Monaco theme
function defineMonacoTheme() {
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
    }
  });
}

// ==========================================
// Main FrontendBuilder Component
// ==========================================

/**
 * FrontendBuilder (Vanilla) - A GrapesJS-based visual editor with AI generation support
 * Uses vanilla GrapesJS and Monaco Editor directly instead of React wrappers
 */
export function FrontendBuilderVanilla({
  initialHtml = '',
  onChange,
  config: initialConfig = {},
  height = '600px',
  className = '',
  showAIModalOnInit: _showAIModalOnInit = false,
  habitData,
}: Omit<FrontendBuilderProps, 'showAiPanel'>) {
  void _showAIModalOnInit; // Available for future use

  // ==========================================
  // GrapesJS <-> Code Utilities (refs for preventing feedback loops)
  // ==========================================
  const skipGrapesChangeRef = useRef<number | null>(null);

  // Debug flag - set to true to log all change events
  const debug = true;

  const _onChange = (html: string) => {
    console.log('[FrontendBuilder] 🔔 Sending changes outside, triggered with HTML length:', html.length);
    onChange?.(html);
  }

  const grapesToCode = useCallback((editor: GrapesEditor): string | null => {

    // Safety check: ensure editor wrapper exists before calling getHtml
    try {
      const wrapper = editor.getWrapper();
      if (!wrapper) {
        return null;
      }
    } catch {
      return null;
    }

    const html = editor.getHtml();
    const css = editor.getCss();

    // Re-inject CssComposer styles as a <style> tag so they aren't lost
    let editorContent = html;
    if (css && css.trim()) {
      if (editorContent.includes('</head>')) {
        editorContent = editorContent.replace('</head>', `<style>\n${css}\n</style>\n</head>`);
      } else {
        editorContent = `<style>\n${css}\n</style>\n${editorContent}`;
      }
    }


    return editorContent;
  }, []);

  const lockGrapes = () => {
    /**
     * IMPORTANT NOTE:
     * When upading using setComponents, it repalces the whole canvas, forcing a change:changesCount event, which causes grapesToCode to run, which causes a feedback loop if we don't ignore the first change event after setComponents.
     */
    skipGrapesChangeRef.current = Date.now() + 500;
  };

  const codeToGrapes = useCallback((html: string) => {



    const editor = editorRef.current;
    if (!editor) return;

    // Extract <style> tags so we can feed them to CssComposer explicitly
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let cssContent = '';
    let match;
    while ((match = styleRegex.exec(html)) !== null) {
      cssContent += match[1] + '\n';
    }
    const htmlWithoutStyles = html.replace(styleRegex, '');

    // Set HTML components (without <style> tags – those go to CssComposer)
    editor.getWrapper()?.components(htmlWithoutStyles, {
      asDocument: true,
    });

    // Restore styles via CssComposer so GrapesJS tracks them properly
    if (cssContent.trim()) {
      editor.setStyle(cssContent);
    } else {
      editor.CssComposer.clear();
    }

  }, []);

  // ==========================================
  // CHANGE HANDLERS - One function per change source
  // ==========================================

  /**
   * Handle changes from EXTERNAL sources (initialHtml prop changes)
   * This is triggered when the parent component updates the initialHtml prop
   */
  const handleExternalChange = useCallback((newHtml: string) => {
    if (debug) console.log('[FrontendBuilder] 🔵 EXTERNAL CHANGE:', { htmlLength: newHtml.length, preview: newHtml.substring(0, 100) });
    if (!editorRef.current) return;

    setCurrentHtml(newHtml);
    codeToGrapes(newHtml);

    // Update Monaco editor (throttled)
    monacoEditorRef.current?.setValue(newHtml);

  }, [codeToGrapes]);

  /**
   * Handle changes from AI generation
   * This is called during streaming and after AI generation completes
   */
  const handleAIChange = useCallback((generatedHtml: string, isStreaming: boolean = false) => {
    if (debug) console.log('[FrontendBuilder] 🤖 AI CHANGE:', { isStreaming, htmlLength: generatedHtml.length, preview: generatedHtml.substring(0, 100) });
    if (!editorRef.current) return;
    // If starting with ```html or ``` or ending with ```, remove those code fences
    if (generatedHtml.startsWith('```html')) {
      generatedHtml = generatedHtml.replace(/^```html\s*/, '').replace(/```$/, '');
    }
    else if (generatedHtml.startsWith('```')) {
      generatedHtml = generatedHtml.replace(/^```\s*/, '').replace(/```$/, '');
    }
    if (generatedHtml.endsWith('```')) {
      generatedHtml = generatedHtml.replace(/```$/, '');
    }
    setCurrentHtml(generatedHtml);

    // Update Monaco editor
    monacoEditorRef.current?.setValue(generatedHtml);


    lockGrapes();

    setTimeout(() => {
      // Wait a bit so the lock can kick in
      try {
        codeToGrapes(generatedHtml);
      } catch (e) {
        if (!isStreaming) {
          // Only throw errors for final generation, ignore streaming errors
          throw e;
        }
      }
    }, 10);


  }, [codeToGrapes]);

  /**
   * Handle changes from MONACO editor (user edits code)
   * This is called when user clicks "Apply Changes" button
   */
  const handleMonacoChange = useCallback(() => {

    const html = monacoEditorRef.current!.getValue();
    if (debug) {
      console.log('[FrontendBuilder] 📝 MONACO CHANGE (Save Button Clicked):', {
        htmlLength: html.length,
        preview: html.substring(0, 100),
        fullContent: html
      });
    }
    if (!editorRef.current) return;

    lockGrapes();

    // Apply current Monaco content to GrapesJS
    codeToGrapes(html);

    // Send outside
    _onChange(html);

  }, [codeToGrapes]);

  /**
   * Handle changes from GRAPES editor (user edits visually)
   * This is called when GrapesJS fires change events
   */
  const handleGrapesChange = useCallback(() => {
    if (skipGrapesChangeRef.current !== null) {
      if (Date.now() < skipGrapesChangeRef.current) {
        if (debug) console.log('[FrontendBuilder] 🚫 Skipping Grapes Change to prevent feedback loop');
        return;
      }
      // Time has passed, reset to null
      skipGrapesChangeRef.current = null;
    }
    if (debug) console.log('[FrontendBuilder] 🎨 GRAPES CHANGE: visual editor updated');
    if (!editorRef.current) return;

    // Safety check: ensure editor is fully loaded
    try {
      const wrapper = editorRef.current.getWrapper();
      if (!wrapper) return;
    } catch {
      return;
    }

    const newHtml = grapesToCode(editorRef.current);

    _onChange(newHtml || '');
    if (newHtml !== null) {
      setCurrentHtml(newHtml);
      monacoEditorRef.current?.setValue(newHtml);
    }
  }, [grapesToCode]);

  // ==========================================
  // GrapesJS State & Refs
  // ==========================================
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<GrapesEditor | null>(null);
  const initializedRef = useRef(false);

  const [hostingResult, setHostingResult] = useState<HostingDetectionResult | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const currentHtmlRef = useRef(initialHtml);
  // Helper to get/set currentHtml via ref
  const setCurrentHtml = (html: string) => {
    currentHtmlRef.current = html;
  };
  const currentHtml = currentHtmlRef.current;
  const [config, setConfig] = useState<WebCanvasConfig>(() => {
    const savedTenantUrl = typeof window !== 'undefined' ? localStorage.getItem('webcanvas-tenant-url') : null;
    const savedApiKey = typeof window !== 'undefined' ? localStorage.getItem('webcanvas-api-key') : null;
    return {
      provider: 'auto',
      model: 'claude-sonnet-4-6',
      // model: 'gemini-3-pro-preview',
      ...initialConfig,
      ...(savedTenantUrl ? { tenantUrl: savedTenantUrl } : {}),
      ...(savedApiKey ? { apiKey: savedApiKey } : {}),
    };
  });

  const configRef = useRef(config);
  const hostingResultRef = useRef(hostingResult);

  // ==========================================
  // AI Sidebar State & Refs
  // ==========================================
  const hasCredentials = hostingResult?.isHosted || !!(config.tenantUrl && config.apiKey);

  const [tenantUrl, setTenantUrl] = useState(config.tenantUrl || '');
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [prompt, setPrompt] = useState('');
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [aiProvider, setAiProvider] = useState<'intersect' | 'openai' | 'anthropic' | 'gemini'>('intersect');
  const [customApiKey, setCustomApiKey] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(560);
  const [isResizing, setIsResizing] = useState(false);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const monacoContainerRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<MonacoEditorType.IStandaloneCodeEditor | null>(null);
  const monacoInitializedRef = useRef(false);

  // ==========================================
  // Keep refs in sync
  // ==========================================
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    hostingResultRef.current = hostingResult;
  }, [hostingResult]);

  // ==========================================
  // Persist credentials to localStorage
  // ==========================================
  useEffect(() => {
    if (config.tenantUrl) {
      localStorage.setItem('webcanvas-tenant-url', config.tenantUrl);
    }
    if (config.apiKey) {
      localStorage.setItem('webcanvas-api-key', config.apiKey);
    }
  }, [config.tenantUrl, config.apiKey]);

  // ==========================================
  // Detect hosting environment on mount
  // ==========================================
  useEffect(() => {
    detectHostingEnvironment().then((result) => {
      setHostingResult(result);

      if (result.isHosted) {
        setConfig(prev => ({
          ...prev,
          ...(result.tenantUrl ? { tenantUrl: result.tenantUrl } : {}),
          ...(result.apiKey ? { apiKey: result.apiKey } : {}),
        }));
      } else if (!result.isHosted && !initialConfig.tenantUrl && !config.tenantUrl) {
        setShowSetupModal(true);
      }
    });
  }, [initialConfig.tenantUrl, config.tenantUrl]);

  // ==========================================
  // Sidebar resize handling
  // ==========================================
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 320 && newWidth <= 800) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // ==========================================
  // Initialize vanilla Monaco Editor
  // ==========================================
  useEffect(() => {
    if (!monacoContainerRef.current || monacoInitializedRef.current) return;
    monacoInitializedRef.current = true;

    defineMonacoTheme();
    registerHtmlFormatter();

    const monacoEditor = monaco.editor.create(monacoContainerRef.current, {
      value: currentHtml,
      language: 'html',
      theme: 'cyber-dark',
      minimap: { enabled: false },
      fontSize: 11,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      folding: true,
      automaticLayout: true,
      formatOnPaste: true,
      formatOnType: true,
      padding: { top: 8, bottom: 8 },
      scrollbar: {
        verticalScrollbarSize: 6,
        horizontalScrollbarSize: 6,
      },
      overviewRulerBorder: false,
      hideCursorInOverviewRuler: true,
      renderLineHighlight: 'gutter',
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
    });

    monacoEditorRef.current = monacoEditor;

    setTimeout(() => {
      monacoEditorRef.current?.getAction('editor.action.formatDocument')?.run();
    }, 100);

    // No cleanup - editors persist to avoid React Strict Mode double-mount issues
  }, []);

  // ==========================================
  // Initialize vanilla GrapesJS
  // ==========================================
  useEffect(() => {
    if (!editorContainerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const gjsOptions: EditorConfig = {
      container: editorContainerRef.current,
      height: '100%',
      width: '100%',
      jsInHtml: true,

      optsCss: {
        keepUnusedStyles: true,
        clearStyles: false,


      },
      plugins: [
        grapesjsBlocksBasic,
        grapesjsPresetWebpage,
        grapesjsPluginForms,
        grapesjsTailwind,
        parserPostCSS,
        customCodePlugin,
      ],
      pluginsOpts: {
        [grapesjsBlocksBasic as unknown as string]: {},
        [grapesjsPluginForms as unknown as string]: {},
        [grapesjsTailwind as unknown as string]: {},
      },
      storageManager: false,
      protectedCss: '',
      parser: {
        optionsHtml: {
          allowScripts: true,
          allowUnsafeAttr: true,
          allowUnsafeAttrValue: true,
          asDocument: true,

        }
      },
      deviceManager: {
        devices: [
          { id: 'desktop', name: 'Desktop', width: '' },
          { id: 'tablet', name: 'Tablet', width: '768px', widthMedia: '992px' },
          { id: 'mobile', name: 'Mobile', width: '320px', widthMedia: '480px' },
        ],
      },
      canvas: {
        styles: [],
        scripts: ['https://cdn.tailwindcss.com'],
        frameStyle: `
          html { background-color: transparent !important; }
        `,
      },
    };
    const editor = grapesjs.init(gjsOptions);
    editorRef.current = editor;

    editor.Commands.add('clear-canvas', {
      run(ed) {
        ed.DomComponents.clear();
        ed.CssComposer.clear();
      },
    });

    editor.Commands.add('set-device-desktop', {
      run(ed) { ed.setDevice('Desktop'); },
    });

    editor.Commands.add('set-device-tablet', {
      run(ed) { ed.setDevice('Tablet'); },
    });

    editor.Commands.add('set-device-mobile', {
      run(ed) { ed.setDevice('Mobile'); },
    });

    if (initialHtml) {
      lockGrapes();
      codeToGrapes(initialHtml);
    }
    // No cleanup - editors persist to avoid React Strict Mode double-mount issues
  }, []);

  // ==========================================
  // Sync GrapesJS to Monaco
  // ==========================================
  useEffect(() => {
    if (!editorRef.current) return;

    const handleChange = () => {

      handleGrapesChange();
    }
    const timeoutId = setTimeout(handleChange, 150);

    editorRef.current.on('change:changesCount', handleChange);

    return () => {
      clearTimeout(timeoutId);
      editorRef.current?.off('change:changesCount', handleChange);
    };
  }, [editorRef.current, handleGrapesChange]);

  // ==========================================
  // Sync currentHtml state when initialHtml prop changes (External changes)
  // ==========================================
  useEffect(() => {
    if (initialHtml && initialHtml !== currentHtml && editorRef.current) {
      handleExternalChange(initialHtml);
    }
  }, [initialHtml, handleExternalChange]);

  // ==========================================
  // Update state when config changes
  // ==========================================
  useEffect(() => {
    if (config.tenantUrl) setTenantUrl(config.tenantUrl);
    if (config.apiKey) setApiKey(config.apiKey);
  }, [config]);

  // ==========================================
  // Auto-load models when credentials are available
  // ==========================================
  useEffect(() => {
    if (hasCredentials && config.tenantUrl && config.apiKey && models.length === 0) {
      handleLoadModels();
    }
  }, [hasCredentials, config.tenantUrl, config.apiKey]);

  // ==========================================
  // Other Handlers
  // ==========================================

  const handleSetupSave = useCallback((url: string, key: string) => {
    setConfig(prev => ({ ...prev, tenantUrl: url, apiKey: key }));
    setShowSetupModal(false);
  }, []);

  const handleSaveCredentials = useCallback((url: string, key: string) => {
    setConfig(prev => ({ ...prev, tenantUrl: url, apiKey: key }));
  }, []);

  const handleLoadModels = async () => {
    const url = tenantUrl || config.tenantUrl;
    const key = apiKey || config.apiKey;
    if (!url || !key) {
      setMessage({ type: 'error', text: 'Please enter tenant URL and API key first' });
      return;
    }
    if (!validateTenantUrl(url)) {
      setMessage({ type: 'error', text: 'Please enter a valid tenant URL' });
      return;
    }
    setLoadingModels(true);
    try {
      const loadedModels = await fetchAvailableModels(url, key);
      if (loadedModels.length > 0) {
        setModels(loadedModels);
        setSelectedModel(defaultModel);
        handleSaveCredentials(url, key);
        setShowSettings(false);
      } else {
        setMessage({ type: 'error', text: 'No models found. Check your credentials.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load models' });
    } finally {
      setLoadingModels(false);
    }
  };

  const handleGenerate = async () => {
    if (!editorRef.current) {
      setMessage({ type: 'error', text: 'Editor not ready' });
      return;
    }
    
    // Validate based on AI provider
    if (aiProvider === 'intersect') {
      if (!selectedModel) {
        setMessage({ type: 'error', text: 'Please select a model' });
        return;
      }
      const finalTenantUrl = tenantUrl || config.tenantUrl;
      const finalApiKey = apiKey || config.apiKey;
      if (!finalTenantUrl || !validateTenantUrl(finalTenantUrl)) {
        setMessage({ type: 'error', text: 'Please enter a valid tenant URL' });
        return;
      }
      if (!finalApiKey) {
        setMessage({ type: 'error', text: 'Please enter an API key' });
        return;
      }
    } else {
      if (!customApiKey) {
        setMessage({ type: 'error', text: 'Please enter your API key' });
        return;
      }
      if (!customModel) {
        setMessage({ type: 'error', text: 'Please enter a model name' });
        return;
      }
    }

    const finalPrompt = prompt.trim() || 'Create a user interface for this';

    // Save credentials for intersect mode
    if (aiProvider === 'intersect') {
      const finalTenantUrl = tenantUrl || config.tenantUrl;
      const finalApiKey = apiKey || config.apiKey;
      handleSaveCredentials(finalTenantUrl!, finalApiKey!);
    }
    
    setLoading(true);
    setMessage({ type: 'info', text: 'Generating with AI...' });

    try {
      const existingHtml = `<style>${editorRef.current.getCss()}</style>${editorRef.current.getHtml()}`;

      // Construct HabitContext from habitData (can be single habit or array)
      let habitContext = undefined;
      if (habitData) {
        const habitsArray = Array.isArray(habitData) ? habitData : [habitData];
        habitContext = {
          habits: habitsArray.map((h: any) => ({
            id: h.id || 'default',
            name: h.name || 'Habit',
            description: h.description,
            nodes: h.nodes,
            output: h.output,
          }))
        };
      }
      let currentOutputFromAI = '';
      let lastValue = '';
      const interval = setInterval(() => {
        if (currentOutputFromAI && currentOutputFromAI !== lastValue) {
          handleAIChange(currentOutputFromAI, true);
        }
      }, 1000);
      try {
        const response = await generateWithAI(
          {
            prompt: finalPrompt,
            html: existingHtml,
            context: habitContext,
            onProgress: (partialHtml, isDone) => {
              if (partialHtml) {
                lastValue = currentOutputFromAI;
                currentOutputFromAI = partialHtml;
              }
              if (!isDone) {
                setMessage({ type: 'info', text: 'Generating...' });
              }
            }
          },
          aiProvider === 'intersect'
            ? { tenantUrl: tenantUrl || config.tenantUrl, apiKey: apiKey || config.apiKey, model: selectedModel, provider: 'auto' }
            : { apiKey: customApiKey, model: customModel, provider: aiProvider },
          hostingResult?.isHosted ?? false
        );
        if (response.html) {
          handleAIChange(response.html, false); // false = complete
          setMessage({ type: 'success', text: 'Generated successfully!' });
          setPrompt('');
          _onChange(response.html);

          console.log('[FrontendBuilder] 🎉 AI Generation Complete:', { htmlLength: response.html.length, html: response.html });
        } else {
          throw new Error('No HTML returned from AI');
        }
      } finally {
        clearInterval(interval);
      }

    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to generate frontend' });
    } finally {
      setLoading(false);
    }
  };


  // ==========================================
  // Render
  // ==========================================
  return (
    <div className={`flex flex-col w-full h-full font-sans relative ${className}`} style={{ height }}>
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden min-h-0" style={{ height: '100%', minHeight: '400px' }}>

        {/* AI Sidebar (Inline) */}
        <div
          ref={sidebarRef}
          id='ai-sidebar-wrapper'
          className="relative flex flex-col shrink-0 overflow-hidden"
          style={{
            width: sidebarWidth,
            backgroundColor: '#1a1b26',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* Subtle top accent */}
          <div className="absolute top-0 left-0 right-0" style={{ height: '2px', background: 'linear-gradient(to right, transparent, rgba(6, 182, 212, 0.4), transparent)' }} />

          {/* Header */}
          <div className="flex items-center h-10 px-3 border-b border-white/5" style={{ backgroundColor: '#1f2029' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white" style={{ boxShadow: '0 0 6px rgba(255,255,255,0.5)' }} />
              <span className="text-xs font-medium text-white">Code Editor</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                className="w-7 h-7 flex items-center justify-center rounded-md text-white transition-all cursor-pointer"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                onClick={() => {
                  monacoEditorRef.current?.getAction('editor.action.formatDocument')?.run()
                }}
                title="Format Code"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              {(
                <button
                  className="w-7 h-7 flex items-center justify-center rounded-md text-white transition-all cursor-pointer"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                  onClick={() => handleMonacoChange()}
                  title="Apply Changes"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Settings Modal */}
          {showSettings && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-3"
              style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
              onClick={() => setShowSettings(false)}
            >
              <div
                className="rounded-xl overflow-hidden shadow-2xl p-3"
                style={{ backgroundColor: '#1a1b26', border: '1px solid rgba(255,255,255,0.1)', width: '500px', maxWidth: '90vw' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-white" />
                    <h2 className="text-base font-semibold text-white">AI Generation Settings</h2>
                  </div>
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                    onClick={() => setShowSettings(false)}
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 space-y-4">
                  {/* Provider Selector */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-medium text-white/70 uppercase tracking-wide">AI Provider</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className={`h-10 px-4 text-sm rounded-lg font-medium transition-all cursor-pointer ${
                          aiProvider === 'intersect'
                            ? 'bg-cyan-500 text-white border-2 border-cyan-400'
                            : 'bg-gray-700/50 text-white/60 border border-white/10 hover:bg-gray-700'
                        }`}
                        onClick={() => setAiProvider('intersect')}
                      >
                        Intersect
                      </button>
                      <button
                        className={`h-10 px-4 text-sm rounded-lg font-medium transition-all cursor-pointer ${
                          aiProvider === 'openai'
                            ? 'bg-cyan-500 text-white border-2 border-cyan-400'
                            : 'bg-gray-700/50 text-white/60 border border-white/10 hover:bg-gray-700'
                        }`}
                        onClick={() => { setAiProvider('openai'); setCustomModel(customModel || 'gpt-4o'); }}
                      >
                        OpenAI
                      </button>
                      <button
                        className={`h-10 px-4 text-sm rounded-lg font-medium transition-all cursor-pointer ${
                          aiProvider === 'anthropic'
                            ? 'bg-cyan-500 text-white border-2 border-cyan-400'
                            : 'bg-gray-700/50 text-white/60 border border-white/10 hover:bg-gray-700'
                        }`}
                        onClick={() => { setAiProvider('anthropic'); setCustomModel(customModel || 'claude-opus-4-5'); }}
                      >
                        Anthropic
                      </button>
                      <button
                        className={`h-10 px-4 text-sm rounded-lg font-medium transition-all cursor-pointer ${
                          aiProvider === 'gemini'
                            ? 'bg-cyan-500 text-white border-2 border-cyan-400'
                            : 'bg-gray-700/50 text-white/60 border border-white/10 hover:bg-gray-700'
                        }`}
                        onClick={() => { setAiProvider('gemini'); setCustomModel(customModel || 'gemini-2.0-flash-exp'); }}
                      >
                        Gemini
                      </button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }} />

                  {/* API Settings Section */}
                  {aiProvider === 'intersect' ? (
                  <div className="space-y-3">
                    <h3 className="text-xs font-medium text-white/70 uppercase tracking-wide">API Configuration</h3>
                    <div>
                      <label className="block text-xs font-medium mb-2 text-white">Intersect URL</label>
                      <input
                        type="text"
                        value={tenantUrl}
                        onChange={(e) => setTenantUrl(e.target.value)}
                        placeholder="https://your-tenant.example.com"
                        className="w-full h-10 px-4 text-sm rounded-lg text-white focus:outline-none transition-all"
                        style={{ backgroundColor: '#13141c', border: '1px solid rgba(255,255,255,0.15)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-2 text-white">API Key</label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your API key"
                        className="w-full h-10 px-4 text-sm rounded-lg text-white focus:outline-none transition-all"
                        style={{ backgroundColor: '#13141c', border: '1px solid rgba(255,255,255,0.15)' }}
                      />
                    </div>
                    <button
                      className="h-9 px-4 flex items-center gap-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-40 cursor-pointer"
                      style={{ backgroundColor: '#22d3ee' }}
                      onClick={handleLoadModels}
                      disabled={loadingModels || !tenantUrl || !apiKey}
                    >
                      {loadingModels ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
                      <span>Connect & Load Models</span>
                    </button>
                  </div>
                  ) : (
                  <div className="space-y-3">
                    <h3 className="text-xs font-medium text-white/70 uppercase tracking-wide">{aiProvider === 'openai' ? 'OpenAI' : aiProvider === 'anthropic' ? 'Anthropic' : 'Gemini'} Configuration</h3>
                    <div>
                      <label className="block text-xs font-medium mb-2 text-white">API Key</label>
                      <input
                        type="password"
                        value={customApiKey}
                        onChange={(e) => setCustomApiKey(e.target.value)}
                        placeholder={aiProvider === 'anthropic' ? 'sk-ant-...' : aiProvider === 'gemini' ? 'AIza...' : 'sk-...'}
                        className="w-full h-10 px-4 text-sm rounded-lg text-white focus:outline-none transition-all"
                        style={{ backgroundColor: '#13141c', border: '1px solid rgba(255,255,255,0.15)' }}
                      />
                      <p className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {aiProvider === 'openai' && 'Get your API key from '}  
                        {aiProvider === 'anthropic' && 'Get your API key from '}
                        {aiProvider === 'gemini' && 'Get your API key from '}
                        {aiProvider === 'openai' && <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-cyan-400">platform.openai.com</a>}
                        {aiProvider === 'anthropic' && <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-cyan-400">console.anthropic.com</a>}
                        {aiProvider === 'gemini' && <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-cyan-400">aistudio.google.com</a>}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-2 text-white">Model</label>
                      <input
                        type="text"
                        value={customModel}
                        onChange={(e) => setCustomModel(e.target.value)}
                        placeholder={aiProvider === 'anthropic' ? 'claude-opus-4-5' : aiProvider === 'gemini' ? 'gemini-2.0-flash-exp' : 'gpt-4o'}
                        className="w-full h-10 px-4 text-sm rounded-lg text-white focus:outline-none transition-all"
                        style={{ backgroundColor: '#13141c', border: '1px solid rgba(255,255,255,0.15)' }}
                      />
                      <p className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {aiProvider === 'openai' && 'e.g., gpt-4o, gpt-4-turbo, o1-mini, o3-mini'}
                        {aiProvider === 'anthropic' && 'e.g., claude-opus-4-5, claude-sonnet-4-5'}
                        {aiProvider === 'gemini' && 'e.g., gemini-2.0-flash-exp, gemini-1.5-pro'}
                      </p>
                    </div>
                  </div>
                  )}

                  {/* Divider */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }} />

                  {/* Model Selection (Only for Intersect mode) */}
                  {aiProvider === 'intersect' && (
                  <div>
                    <label className="block text-xs font-medium mb-2 text-white">Model</label>
                    <div className="relative">
                      <button
                        className="w-full h-10 px-4 text-sm rounded-lg text-white text-left flex items-center justify-between transition-all cursor-pointer disabled:opacity-50"
                        style={{ backgroundColor: '#13141c', border: '1px solid rgba(255,255,255,0.15)' }}
                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                        disabled={models.length === 0}
                      >
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4" />
                          <span>{selectedModel || 'Select a model'}</span>
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>▼</span>
                      </button>

                      {showModelDropdown && models.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl overflow-hidden z-10" style={{ backgroundColor: '#1a1b26', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <div className="max-h-48 overflow-y-auto">
                            {models.map((m) => (
                              <button
                                key={m.id}
                                className="w-full px-3 py-2 text-left text-xs text-white transition-colors flex items-center gap-2 cursor-pointer"
                                style={{ backgroundColor: selectedModel === m.id ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                                onClick={() => {
                                  setSelectedModel(m.id);
                                  setShowModelDropdown(false);
                                }}
                              >
                                {selectedModel === m.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                <span className={selectedModel === m.id ? '' : 'ml-3.5'}>{m.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {models.length === 0 && (
                      <p className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Connect to load available models
                      </p>
                    )}
                  </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#16171f' }}>
                  <button
                    className="h-9 px-4 rounded-lg text-sm font-medium text-white transition-all cursor-pointer"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                    onClick={() => setShowSettings(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Vanilla Monaco Editor Container */}
          <div
            ref={monacoContainerRef}
            className="flex-1 min-h-0 relative monaco-container"
            style={{ backgroundColor: '#13141c' }}
          />

          {/* Custom Prompt Section */}
          <div className="shrink-0 border-t border-white/5 p-3 pb-0 text-white" style={{ backgroundColor: '#1f2029' }}>
            <label className="block text-xs font-medium mb-1.5 text-white/80">
              Prompt <span className="text-white/50">(optional but highly recommended)</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Company logo and navigation at the top, hero section with call to action, simple form for user submission, and footer"
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg text-white resize-none transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              style={{ backgroundColor: '#13141c', border: '1px solid rgba(255,255,255,0.15)' }}
            />
          </div>

          {/* AI Generate Button Section */}
          <div className="shrink-0 border-t border-white/5 p-3" style={{ backgroundColor: '#1f2029', borderTop: 'none' }}>
            <div className="flex items-center gap-2">
              <button
                className="flex-1 h-9 flex items-center justify-center gap-2 rounded-lg bg-white text-gray-900 hover:bg-gray-100 transition-all cursor-pointer font-medium text-sm disabled:opacity-40"
                style={{ boxShadow: '0 10px 15px -3px rgba(255,255,255,0.1)' }}
                onClick={handleGenerate}
                disabled={
                  loading ||
                  (aiProvider === 'intersect' && (!selectedModel || !(tenantUrl || config.tenantUrl) || !(apiKey || config.apiKey))) ||
                  (aiProvider !== 'intersect' && (!customApiKey || !customModel))
                }
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                <span>{loading ? 'Generating...' : 'Generate new UI'}</span>
              </button>

              <button
                className="w-9 h-9 flex items-center justify-center rounded-lg transition-all cursor-pointer"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
                onClick={() => setShowSettings(true)}
                title="AI Settings"
              >
                <Settings className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Message */}
            {message && (
              <div
                className="mt-2.5 px-3 py-2 rounded-lg text-xs text-center"
                style={{
                  backgroundColor: message.type === 'error' ? 'rgba(239,68,68,0.1)' : message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(6,182,212,0.1)',
                  color: message.type === 'error' ? '#f87171' : message.type === 'success' ? '#34d399' : '#22d3ee',
                  border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.2)' : message.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(6,182,212,0.2)'}`
                }}
              >
                {message.text}
              </div>
            )}
          </div>

          {/* Resize Handle */}
          <div
            className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize transition-colors group"
            style={{ backgroundColor: isResizing ? 'rgba(6,182,212,0.3)' : 'transparent' }}
            onMouseDown={handleMouseDown}
          >
            <div
              className="absolute top-0 right-0 w-px h-full transition-colors"
              style={{ backgroundColor: isResizing ? '#22d3ee' : 'transparent' }}
            />
          </div>
        </div>

        {/* Vanilla GrapesJS Editor Container */}
        <div
          ref={editorContainerRef}
          className="flex-1 min-w-0 gjs-editor-container"
          style={{ height: '100%' }}
        />
      </div>

      {/* Setup Modal */}
      {showSetupModal && (
        <SetupModal
          initialTenantUrl={config.tenantUrl}
          initialApiKey={config.apiKey}
          onSave={handleSetupSave}
          onClose={() => setShowSetupModal(false)}
        />
      )}
    </div>
  );
}

// ==========================================
// Setup Modal Component
// ==========================================

interface SetupModalProps {
  initialTenantUrl?: string;
  initialApiKey?: string;
  onSave: (tenantUrl: string, apiKey: string) => void;
  onClose: () => void;
}

function SetupModal({ initialTenantUrl = '', initialApiKey = '', onSave, onClose }: SetupModalProps) {
  const [tenantUrl, setTenantUrl] = useState(initialTenantUrl);
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!tenantUrl.trim()) {
      setValidationError('Tenant URL is required');
      return;
    }

    if (!validateTenantUrl(tenantUrl)) {
      setValidationError('Please enter a valid Intersect tenant URL (e.g., https://your-tenant.intersect.site)');
      return;
    }

    if (!apiKey.trim()) {
      setValidationError('API Key is required');
      return;
    }

    onSave(tenantUrl, apiKey);
  };

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-96 max-w-[90%]">
        <h2 className="text-lg font-semibold text-gray-100 mb-2">
          Connect to Intersect WebCanvas
        </h2>
        <p className="text-sm text-gray-400 mb-5">
          Enter your Intersect tenant details to enable AI-powered frontend generation.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Tenant URL
          </label>
          <input
            type="text"
            value={tenantUrl}
            onChange={(e) => {
              setTenantUrl(e.target.value);
              setValidationError(null);
            }}
            placeholder="https://your-tenant.intersect.site"
            className="w-full px-3.5 py-2.5 text-sm text-gray-100 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-500">Your Intersect workspace URL (e.g., https://your-tenant.intersect.site)</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setValidationError(null);
            }}
            placeholder="Enter your API key"
            className="w-full px-3.5 py-2.5 text-sm text-gray-100 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-500">Found in your Intersect settings</p>
        </div>

        {validationError && (
          <div className="mb-4 p-2.5 bg-red-900/50 border border-red-700 rounded-md text-sm text-red-200">
            {validationError}
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            onClick={onClose}
          >
            Skip for Now
          </button>
          <button
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            onClick={handleSubmit}
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}

export default FrontendBuilderVanilla;
