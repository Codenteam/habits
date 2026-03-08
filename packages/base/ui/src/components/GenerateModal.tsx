import { useState, useCallback, useRef } from 'react';
import { X, Wand2, Loader2, Check, AlertCircle, AlertTriangle, Sparkles, Code2, Repeat, CheckCircle2 } from 'lucide-react';
import JSZip from 'jszip';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addHabit, setActiveHabit, clearWorkflow, selectHabits } from '../store/slices/workflowSlice';
import { setFrontendHtml, clearFrontendHtml } from '../store/slices/uiSlice';
import { api } from '../lib/api';
import {
  FileEntry,
  detectConfigFiles,
  parseStack,
} from '../lib/stackParser';

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'input' | 'generating' | 'loading' | 'result';
type GenerationType = 'habit' | 'bit';

export default function GenerateModal({ isOpen, onClose }: GenerateModalProps) {
  const dispatch = useAppDispatch();
  const existingHabits = useAppSelector(selectHabits);
  
  const [mode, setMode] = useState<Mode>('input');
  const [prompt, setPrompt] = useState('');
  const [generationType, setGenerationType] = useState<GenerationType>('habit');
  const [progressSteps, setProgressSteps] = useState<string[]>([]);
  const progressRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<{
    habitsLoaded: number;
    errors: string[];
    frontendLoaded: boolean;
    bitFilesCount?: number;
  } | null>(null);

  const resetState = useCallback(() => {
    setMode('input');
    setPrompt('');
    setGenerationType('habit');
    setProgressSteps([]);
    setResult(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  /**
   * Extract files from a ZIP blob and convert to FileEntry array
   */
  const extractZipFiles = async (zipBlob: Blob): Promise<FileEntry[]> => {
    const zip = await JSZip.loadAsync(zipBlob);
    const files: FileEntry[] = [];
    
    // Get all files from the ZIP
    const filePromises: Promise<void>[] = [];
    
    zip.forEach((relativePath, zipEntry) => {
      // Skip directories
      if (zipEntry.dir) return;
      
      filePromises.push(
        zipEntry.async('text').then((content) => {
          files.push({
            name: relativePath.split('/').pop() || relativePath,
            path: relativePath,
            content,
          });
        }).catch((err) => {
          console.warn(`Failed to extract ${relativePath}:`, err);
        })
      );
    });
    
    await Promise.all(filePromises);
    return files;
  };

  /**
   * Load habits from extracted files (similar to OpenModal folder loading)
   */
  const loadFromFiles = async (files: FileEntry[]): Promise<void> => {
    // Detect config files
    const configFiles = detectConfigFiles(files);
    
    if (configFiles.length === 0) {
      throw new Error('No configuration file (stack.yaml or config.json) found in generated output');
    }
    
    // Use the first config file found
    const configFile = configFiles[0];
    
    // Parse the stack
    const parsed = await parseStack(files, configFile.path);
    
    if (parsed.habits.length === 0 && parsed.errors.length > 0) {
      throw new Error(parsed.errors.join('; '));
    }
    
    // Replace entire state with generated content
    dispatch(clearWorkflow());
    dispatch(clearFrontendHtml());

    if (parsed.habits.length > 0) {
      // Add each habit to the store
      parsed.habits.forEach((habit, index) => {
        dispatch(addHabit(habit));
        
        // Set the first habit as active
        if (index === 0) {
          dispatch(setActiveHabit(habit.id));
        }
      });
    }
    
    // Load frontend HTML if available
    if (parsed.frontendHtml) {
      dispatch(setFrontendHtml(parsed.frontendHtml));
    }
    
    setResult({
      habitsLoaded: parsed.habits.length,
      errors: parsed.errors,
      frontendLoaded: !!parsed.frontendHtml,
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setMode('generating');
    setProgressSteps([]);
    
    try {
      const onProgress = (step: string) => {
        setProgressSteps((prev) => {
          // Deduplicate consecutive identical steps
          if (prev.length > 0 && prev[prev.length - 1] === step) return prev;
          const next = [...prev, step];
          // Auto-scroll the progress list
          setTimeout(() => {
            progressRef.current?.scrollTo({ top: progressRef.current.scrollHeight, behavior: 'smooth' });
          }, 50);
          return next;
        });
      };

      // Call the streaming API endpoint
      const zipBlob = generationType === 'habit'
        ? await api.generateHabit(prompt, onProgress)
        : await api.generateBit(prompt, onProgress);
      
      setMode('loading');
      
      // Extract files from the ZIP
      const files = await extractZipFiles(zipBlob);
      
      if (files.length === 0) {
        throw new Error('Generated ZIP file is empty');
      }

      if (generationType === 'bit') {
        setResult({
          habitsLoaded: 0,
          errors: [],
          frontendLoaded: false,
          bitFilesCount: files.length,
        });
      } else {
        await loadFromFiles(files);
      }
      
      setMode('result');
    } catch (error) {
      setResult({
        habitsLoaded: 0,
        errors: [error instanceof Error ? error.message : 'Failed to generate'],
        frontendLoaded: false,
      });
      setMode('result');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-lg border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
            <Wand2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <h2 className="text-lg font-semibold text-white truncate">Generate with AI</h2>
            <span className="ml-2 px-2 py-0.5 rounded bg-purple-700 text-xs text-white font-semibold uppercase tracking-wide">
              Beta
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors ml-4"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {mode === 'input' && (
            <div className="space-y-4">
              {/* Generation type toggle */}
              <div className="flex rounded-lg bg-slate-700 p-1">
                <button
                  onClick={() => setGenerationType('habit')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    generationType === 'habit'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Repeat className="w-4 h-4" />
                  Create Habit
                </button>
                <button
                  onClick={() => setGenerationType('bit')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    generationType === 'bit'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Code2 className="w-4 h-4" />
                  Create Bit
                </button>
              </div>

              <p className="text-slate-300 text-sm">
                {generationType === 'habit'
                  ? 'Describe the habit you want to create. AI will generate the backend workflow and UI for you.'
                  : 'Describe the bit (node module) you want to create. AI will generate the bit files for you.'}
              </p>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  What do you want to build?
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={generationType === 'habit'
                    ? 'Examples: <Build a habit tracker that lets users add daily habits, mark them as complete, and view a weekly progress chart> Or <Create a complete restaurant ordering website with a menu, shopping cart, and checkout system>'
                    : 'Examples: <A Slack notification bit that sends messages to a channel> Or <A CSV parser bit that reads and transforms CSV data>'}
                  className="w-full h-32 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              
              {existingHabits.length > 0 && generationType === 'habit' && (
                <div className="flex items-start gap-2 p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-300">
                    This will replace your current stack ({existingHabits.length} habit{existingHabits.length !== 1 ? 's' : ''}) with the newly generated content.
                  </p>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                <p className="text-xs text-purple-300">
                  Be specific about the features, logic, and UI layout you want. The more detail, the better the result.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Wand2 className="w-4 h-4" />
                  Generate
                </button>
              </div>
            </div>
          )}

          {mode === 'generating' && (
            <div className="flex flex-col py-6 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                </div>
                <div>
                  <p className="text-white font-medium">Generating your {generationType}…</p>
                  <p className="text-slate-400 text-xs">This may take a few minutes</p>
                </div>
              </div>

              {/* Progress list */}
              <div
                ref={progressRef}
                className="max-h-56 overflow-y-auto rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-600"
              >
                {progressSteps.length === 0 && (
                  <p className="text-slate-500 text-xs italic">Waiting for agent…</p>
                )}
                {progressSteps.map((step, i) => {
                  const isLast = i === progressSteps.length - 1;
                  return (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      {isLast ? (
                        <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin mt-0.5 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                      )}
                      <span className={isLast ? 'text-slate-200' : 'text-slate-400'}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {mode === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-slate-300">Loading generated {generationType}...</p>
            </div>
          )}

          {mode === 'result' && result && (
            <div className="space-y-4">
              {/* Success: habit loaded */}
              {result.habitsLoaded > 0 && (
                <div className="flex items-start gap-3 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                  <Check className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-green-400 font-medium">Successfully generated!</p>
                    <p className="text-green-300 text-sm mt-1">
                      {result.habitsLoaded} habit{result.habitsLoaded !== 1 ? 's' : ''} created
                      {result.frontendLoaded && ' • Frontend UI included'}
                    </p>
                  </div>
                </div>
              )}

              {/* Success: bit files created */}
              {result.bitFilesCount && result.bitFilesCount > 0 && result.errors.length === 0 && (
                <div className="flex items-start gap-3 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                  <Check className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-green-400 font-medium">Bit generated successfully!</p>
                    <p className="text-green-300 text-sm mt-1">
                      {result.bitFilesCount} file{result.bitFilesCount !== 1 ? 's' : ''} created
                    </p>
                  </div>
                </div>
              )}
              
              {result.errors.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-700 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-red-400 font-medium">
                      {result.habitsLoaded === 0 && !result.bitFilesCount ? 'Generation failed' : 'Some issues occurred'}
                    </p>
                    <ul className="text-red-300 text-sm mt-1 space-y-1">
                      {result.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                {result.habitsLoaded === 0 && !result.bitFilesCount && (
                  <button
                    onClick={resetState}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className={`${result.habitsLoaded === 0 && !result.bitFilesCount ? 'flex-1' : 'w-full'} px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors`}
                >
                  {result.habitsLoaded > 0 || result.bitFilesCount ? 'Done' : 'Close'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
