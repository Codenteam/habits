import { useState, useCallback } from 'react';
import { X, Wand2, Loader2, Check, AlertCircle, Sparkles } from 'lucide-react';
import JSZip from 'jszip';
import { useAppDispatch } from '../store/hooks';
import { addHabit, setActiveHabit, clearWorkflow } from '../store/slices/workflowSlice';
import { setFrontendHtml } from '../store/slices/uiSlice';
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

export default function GenerateModal({ isOpen, onClose }: GenerateModalProps) {
  const dispatch = useAppDispatch();
  
  const [mode, setMode] = useState<Mode>('input');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<{
    habitsLoaded: number;
    errors: string[];
    frontendLoaded: boolean;
  } | null>(null);

  const resetState = useCallback(() => {
    setMode('input');
    setPrompt('');
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
    
    // Clear existing workflow and load habits
    if (parsed.habits.length > 0) {
      dispatch(clearWorkflow());
      
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
    
    try {
      // Call the API to generate the habit
      const zipBlob = await api.generateFromPrompt(prompt);
      
      setMode('loading');
      
      // Extract files from the ZIP
      const files = await extractZipFiles(zipBlob);
      
      if (files.length === 0) {
        throw new Error('Generated ZIP file is empty');
      }
      
      // Load the habits from extracted files
      await loadFromFiles(files);
      
      setMode('result');
    } catch (error) {
      setResult({
        habitsLoaded: 0,
        errors: [error instanceof Error ? error.message : 'Failed to generate habit'],
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
            <h2 className="text-lg font-semibold text-white truncate">Generate Habit with AI</h2>
            <span className="ml-2 px-2 py-0.5 rounded bg-purple-700 text-xs text-white font-semibold uppercase tracking-wide">
              Beta
            </span>
            <span className="ml-2 text-xs text-slate-400 whitespace-nowrap">
              Available with Intersect Cloud or Intersect Self-hosted only
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
              <p className="text-slate-300 text-sm">
                Describe the habit you want to create. AI will generate the backend workflow and UI for you.
              </p>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  What do you want to build?
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Examples: <Build a habit tracker that lets users add daily habits, mark them as complete, and view a weekly progress chart> Or <Create a complete restaurant ordering website with a menu, shopping cart, and checkout system>"
                  className="w-full h-32 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              
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
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                <Sparkles className="w-5 h-5 text-purple-300 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium">Generating your habit...</p>
                <p className="text-slate-400 text-sm mt-1">This may take a moment</p>
              </div>
            </div>
          )}

          {mode === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-slate-300">Loading generated habit...</p>
            </div>
          )}

          {mode === 'result' && result && (
            <div className="space-y-4">
              {result.habitsLoaded > 0 ? (
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
              ) : null}
              
              {result.errors.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-700 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-red-400 font-medium">
                      {result.habitsLoaded === 0 ? 'Generation failed' : 'Some issues occurred'}
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
                {result.habitsLoaded === 0 && (
                  <button
                    onClick={resetState}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className={`${result.habitsLoaded === 0 ? 'flex-1' : 'w-full'} px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors`}
                >
                  {result.habitsLoaded > 0 ? 'Done' : 'Close'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
