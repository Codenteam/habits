import { useState, useRef, useCallback } from 'react';
import { FolderOpen, FileJson, AlertCircle, Check, X, Loader2 } from 'lucide-react';
import { useAppDispatch } from '../store/hooks';
import { addHabit, setActiveHabit, clearWorkflow, setEnvVariables } from '../store/slices/workflowSlice';
import { setFrontendHtml } from '../store/slices/uiSlice';
import {
  FileEntry,
  detectConfigFiles,
  parseStack,
  readFilesFromFileList,
  getRootFolderName,
} from '../lib/stackParser';

interface OpenFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'select-folder' | 'select-config' | 'loading' | 'result';

export default function OpenFolderModal({ isOpen, onClose }: OpenFolderModalProps) {
  const dispatch = useAppDispatch();
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<Step>('select-folder');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [configFiles, setConfigFiles] = useState<FileEntry[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string>('');
  const [result, setResult] = useState<{
    habitsLoaded: number;
    errors: string[];
    frontendLoaded: boolean;
  } | null>(null);

  const resetState = useCallback(() => {
    setStep('select-folder');
    setFiles([]);
    setConfigFiles([]);
    setSelectedConfig(null);
    setFolderName('');
    setResult(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const handleFolderSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    setStep('loading');
    
    try {
      const fileEntries = await readFilesFromFileList(fileList);
      setFiles(fileEntries);
      setFolderName(getRootFolderName(fileEntries));
      
      const configs = detectConfigFiles(fileEntries);
      setConfigFiles(configs);
      
      if (configs.length === 0) {
        setResult({
          habitsLoaded: 0,
          errors: ['No configuration files found. Please ensure your folder contains a stack.yaml, config.json, or habits.json file.'],
          frontendLoaded: false,
        });
        setStep('result');
      } else if (configs.length === 1) {
        // Auto-select if only one config file
        await loadStackFromConfig(fileEntries, configs[0].path);
      } else {
        // Let user choose
        setSelectedConfig(configs[0].path);
        setStep('select-config');
      }
    } catch (error) {
      setResult({
        habitsLoaded: 0,
        errors: [error instanceof Error ? error.message : 'Failed to read folder'],
        frontendLoaded: false,
      });
      setStep('result');
    }
    
    // Reset input
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  }, []);

  const loadStackFromConfig = useCallback(async (fileEntries: FileEntry[], configPath: string) => {
    setStep('loading');
    
    try {
      const parsed = await parseStack(fileEntries, configPath);
      
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
      
      // Load environment variables if available
      if (parsed.envVariables && Object.keys(parsed.envVariables).length > 0) {
        dispatch(setEnvVariables(parsed.envVariables));
      }
      
      setResult({
        habitsLoaded: parsed.habits.length,
        errors: parsed.errors,
        frontendLoaded: !!parsed.frontendHtml,
      });
      setStep('result');
    } catch (error) {
      setResult({
        habitsLoaded: 0,
        errors: [error instanceof Error ? error.message : 'Failed to parse stack'],
        frontendLoaded: false,
      });
      setStep('result');
    }
  }, [dispatch]);

  const handleConfigSelect = useCallback(() => {
    if (selectedConfig) {
      loadStackFromConfig(files, selectedConfig);
    }
  }, [selectedConfig, files, loadStackFromConfig]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-lg border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Open Habits Stack</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'select-folder' && (
            <div className="space-y-4">
              <p className="text-slate-300">
                Select a folder containing your habits stack configuration (stack.yaml or config.json).
              </p>
              
              <input
                ref={folderInputRef}
                type="file"
                // @ts-ignore - webkitdirectory is not in the type definition
                webkitdirectory=""
                directory=""
                multiple
                onChange={handleFolderSelect}
                className="hidden"
              />
              
              <button
                onClick={() => folderInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <FolderOpen className="w-5 h-5" />
                Select Folder
              </button>
              
              <div className="text-xs text-slate-500 space-y-1">
                <p>Supported configuration files:</p>
                <ul className="list-disc list-inside ml-2">
                  <li>stack.yaml / stack.yml</li>
                  <li>config.json / habits.json / stack.json</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'select-config' && (
            <div className="space-y-4">
              <p className="text-slate-300">
                Multiple configuration files found in <span className="text-blue-400 font-mono">{folderName}</span>.
                Please select which one to use:
              </p>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {configFiles.map((file) => (
                  <label
                    key={file.path}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                      ${selectedConfig === file.path 
                        ? 'bg-blue-600/20 border-2 border-blue-500' 
                        : 'bg-slate-700/50 border-2 border-transparent hover:bg-slate-700'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="configFile"
                      value={file.path}
                      checked={selectedConfig === file.path}
                      onChange={(e) => setSelectedConfig(e.target.value)}
                      className="sr-only"
                    />
                    <FileJson className={`w-5 h-5 ${selectedConfig === file.path ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className={`font-mono text-sm ${selectedConfig === file.path ? 'text-white' : 'text-slate-300'}`}>
                      {file.path}
                    </span>
                    {selectedConfig === file.path && (
                      <Check className="w-4 h-4 text-blue-400 ml-auto" />
                    )}
                  </label>
                ))}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={resetState}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConfigSelect}
                  disabled={!selectedConfig}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Load Stack
                </button>
              </div>
            </div>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-slate-300">Loading habits stack...</p>
            </div>
          )}

          {step === 'result' && result && (
            <div className="space-y-4">
              {result.habitsLoaded > 0 ? (
                <div className="flex items-start gap-3 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                  <Check className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-green-400 font-medium">Successfully loaded!</p>
                    <p className="text-green-300 text-sm mt-1">
                      {result.habitsLoaded} habit{result.habitsLoaded !== 1 ? 's' : ''} loaded
                      {result.frontendLoaded && ' • Frontend HTML loaded'}
                    </p>
                  </div>
                </div>
              ) : null}
              
              {result.errors.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-700 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-red-400 font-medium">
                      {result.habitsLoaded === 0 ? 'Failed to load' : 'Some issues occurred'}
                    </p>
                    <ul className="text-red-300 text-sm mt-1 space-y-1">
                      {result.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleClose}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {result.habitsLoaded > 0 ? 'Done' : 'Close'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
