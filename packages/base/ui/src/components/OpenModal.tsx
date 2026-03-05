import { useState, useRef, useCallback } from 'react';
import { FolderOpen, FileJson, AlertCircle, Check, X, Loader2, Upload } from 'lucide-react';
import { useAppDispatch } from '../store/hooks';
import { addHabit, setActiveHabit, clearWorkflow } from '../store/slices/workflowSlice';
import { setFrontendHtml } from '../store/slices/uiSlice';
import {
  FileEntry,
  detectConfigFiles,
  parseStack,
  readFilesFromFileList,
  getRootFolderName,
  parseHabitYaml,
  convertHabitYamlToHabit,
} from '../lib/stackParser';

interface OpenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'choose' | 'loading' | 'select-config' | 'result';

export default function OpenModal({ isOpen, onClose }: OpenModalProps) {
  const dispatch = useAppDispatch();
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [mode, setMode] = useState<Mode>('choose');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [configFiles, setConfigFiles] = useState<FileEntry[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string>('');
  const [result, setResult] = useState<{
    type: 'file' | 'folder';
    habitsLoaded: number;
    errors: string[];
    frontendLoaded: boolean;
  } | null>(null);

  const resetState = useCallback(() => {
    setMode('choose');
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

  // Handle single file selection (JSON or YAML workflow)
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMode('loading');

    try {
      const content = await file.text();
      // Parse YAML habit file and convert to workflow format
      const habitYaml = parseHabitYaml(content, file.name);
      const parsedHabit = convertHabitYamlToHabit(habitYaml);
      
      // Clear existing workflow and add the parsed habit
      dispatch(clearWorkflow());
      dispatch(addHabit(parsedHabit));
      dispatch(setActiveHabit(parsedHabit.id));
      
      setResult({
        type: 'file',
        habitsLoaded: 1,
        errors: [],
        frontendLoaded: false,
      });
      setMode('result');
    } catch (error) {
      setResult({
        type: 'file',
        habitsLoaded: 0,
        errors: [error instanceof Error ? error.message : 'Failed to parse workflow file'],
        frontendLoaded: false,
      });
      setMode('result');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [dispatch]);

  // Handle folder selection
  const handleFolderSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    setMode('loading');
    
    try {
      const fileEntries = await readFilesFromFileList(fileList);
      setFiles(fileEntries);
      setFolderName(getRootFolderName(fileEntries));
      
      const configs = detectConfigFiles(fileEntries);
      setConfigFiles(configs);
      
      if (configs.length === 0) {
        setResult({
          type: 'folder',
          habitsLoaded: 0,
          errors: ['No configuration files found. Please ensure your folder contains a stack.yaml, config.json, or habits.json file.'],
          frontendLoaded: false,
        });
        setMode('result');
      } else if (configs.length === 1) {
        // Auto-select if only one config file
        await loadStackFromConfig(fileEntries, configs[0].path);
      } else {
        // Let user choose
        setSelectedConfig(configs[0].path);
        setMode('select-config');
      }
    } catch (error) {
      setResult({
        type: 'folder',
        habitsLoaded: 0,
        errors: [error instanceof Error ? error.message : 'Failed to read folder'],
        frontendLoaded: false,
      });
      setMode('result');
    }
    
    // Reset input
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  }, []);

  const loadStackFromConfig = useCallback(async (fileEntries: FileEntry[], configPath: string) => {
    setMode('loading');
    
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
      
      setResult({
        type: 'folder',
        habitsLoaded: parsed.habits.length,
        errors: parsed.errors,
        frontendLoaded: !!parsed.frontendHtml,
      });
      setMode('result');
    } catch (error) {
      setResult({
        type: 'folder',
        habitsLoaded: 0,
        errors: [error instanceof Error ? error.message : 'Failed to parse stack'],
        frontendLoaded: false,
      });
      setMode('result');
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
            <Upload className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Open</h2>
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
          {mode === 'choose' && (
            <div className="space-y-4">
              <p className="text-slate-300 text-sm mb-6">
                Choose how you want to open your habits:
              </p>
              
              {/* Hidden inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.yaml,.yml"
                onChange={handleFileSelect}
                className="hidden"
              />
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
              
              {/* Options */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 p-6 bg-slate-700/50 hover:bg-slate-700 border-2 border-slate-600 hover:border-blue-500 rounded-lg transition-all group"
                >
                  <FileJson className="w-10 h-10 text-slate-400 group-hover:text-blue-400 transition-colors" />
                  <div className="text-center">
                    <div className="text-white font-medium">Single File</div>
                    <div className="text-slate-400 text-xs mt-1">JSON or YAML workflow</div>
                  </div>
                </button>
                
                <button
                  onClick={() => folderInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 p-6 bg-slate-700/50 hover:bg-slate-700 border-2 border-slate-600 hover:border-purple-500 rounded-lg transition-all group"
                >
                  <FolderOpen className="w-10 h-10 text-slate-400 group-hover:text-purple-400 transition-colors" />
                  <div className="text-center">
                    <div className="text-white font-medium">Folder</div>
                    <div className="text-slate-400 text-xs mt-1">Stack with multiple habits</div>
                  </div>
                </button>
              </div>
              
              <div className="text-xs text-slate-500 mt-4 space-y-1">
                <p><strong>Single File:</strong> Load a .json or .yaml workflow file directly</p>
                <p><strong>Folder:</strong> Open a habits stack with stack.yaml/config.json and multiple habit files</p>
              </div>
            </div>
          )}

          {mode === 'select-config' && (
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

          {mode === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-slate-300">Loading...</p>
            </div>
          )}

          {mode === 'result' && result && (
            <div className="space-y-4">
              {result.habitsLoaded > 0 ? (
                <div className="flex items-start gap-3 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                  <Check className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-green-400 font-medium">Successfully loaded!</p>
                    <p className="text-green-300 text-sm mt-1">
                      {result.type === 'file' ? 'Workflow' : `${result.habitsLoaded} habit${result.habitsLoaded !== 1 ? 's' : ''}`} loaded
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
