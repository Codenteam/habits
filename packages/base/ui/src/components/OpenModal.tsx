import { useState, useRef, useCallback, useEffect } from 'react';
import { AlertCircle, Check, X, Loader2, Upload } from 'lucide-react';
import { useAppDispatch } from '../store/hooks';
import { addHabit, setActiveHabit, clearWorkflow, setEnvVariables } from '../store/slices/workflowSlice';
import {
  setFrontendHtml,
  setFrontendYaml,
  clearFrontendHtml,
  clearFrontendYaml,
  clearEnvContent,
} from '../store/slices/uiSlice';
import {
  ParsedStack,
  parseHabitFile,
  isHabitArchiveFile,
  parseHabitYaml,
  convertHabitYamlToHabit,
} from '../lib/stackParser';

interface OpenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'loading' | 'result';

let pendingOpenTrigger: number | null = null;

export default function OpenModal({ isOpen, onClose }: OpenModalProps) {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const awaitingFileRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [mode, setMode] = useState<Mode>('loading');
  const [result, setResult] = useState<{
    type: 'file' | 'habit';
    habitsLoaded: number;
    errors: string[];
    frontendLoaded: boolean;
  } | null>(null);

  const handleClose = useCallback(() => {
    awaitingFileRef.current = false;
    setMode('loading');
    setResult(null);
    onCloseRef.current();
  }, []);

  const applyParsedStack = useCallback((parsed: ParsedStack) => {
    dispatch(clearWorkflow());
    dispatch(clearFrontendHtml());
    dispatch(clearFrontendYaml());
    dispatch(clearEnvContent());

    if (parsed.habits.length > 0) {
      parsed.habits.forEach((habit) => {
        dispatch(addHabit(habit));
      });
      dispatch(setActiveHabit(parsed.habits[0].id));
    }

    if (parsed.frontendHtml) {
      dispatch(setFrontendHtml(parsed.frontendHtml));
    }
    if (parsed.frontendYaml) {
      dispatch(setFrontendYaml(parsed.frontendYaml));
    }

    if (parsed.envVariables && Object.keys(parsed.envVariables).length > 0) {
      dispatch(setEnvVariables(parsed.envVariables));
    }

    setResult({
      type: 'habit',
      habitsLoaded: parsed.habits.length,
      errors: parsed.errors,
      frontendLoaded: !!(parsed.frontendHtml || parsed.frontendYaml),
    });
    setMode('result');
  }, [dispatch]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    awaitingFileRef.current = false;

    const file = event.target.files?.[0];
    if (!file) {
      handleClose();
      return;
    }

    setMode('loading');

    try {
      if (isHabitArchiveFile(file.name)) {
        const buffer = await file.arrayBuffer();
        const parsed = await parseHabitFile(buffer);
        applyParsedStack(parsed);
      } else {
        const content = await file.text();
        const habitYaml = parseHabitYaml(content, file.name);
        const parsedHabit = convertHabitYamlToHabit(habitYaml);

        dispatch(clearWorkflow());
        dispatch(clearFrontendHtml());
        dispatch(clearFrontendYaml());
        dispatch(clearEnvContent());
        dispatch(addHabit(parsedHabit));
        dispatch(setActiveHabit(parsedHabit.id));

        setResult({
          type: 'file',
          habitsLoaded: 1,
          errors: [],
          frontendLoaded: false,
        });
        setMode('result');
      }
    } catch (error) {
      setResult({
        type: isHabitArchiveFile(file.name) ? 'habit' : 'file',
        habitsLoaded: 0,
        errors: [error instanceof Error ? error.message : 'Failed to parse workflow file'],
        frontendLoaded: false,
      });
      setMode('result');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [dispatch, applyParsedStack, handleClose]);

  useEffect(() => {
    if (!isOpen) {
      if (pendingOpenTrigger !== null) {
        window.clearTimeout(pendingOpenTrigger);
        pendingOpenTrigger = null;
      }
      return;
    }

    setMode('loading');
    setResult(null);
    awaitingFileRef.current = true;

    const input = fileInputRef.current;
    const onNativeCancel = () => {
      if (!awaitingFileRef.current) return;
      handleClose();
    };
    input?.addEventListener('cancel', onNativeCancel);

    if (pendingOpenTrigger !== null) {
      return () => input?.removeEventListener('cancel', onNativeCancel);
    }

    pendingOpenTrigger = window.setTimeout(() => {
      pendingOpenTrigger = null;
      fileInputRef.current?.click();
    }, 0);

    return () => {
      input?.removeEventListener('cancel', onNativeCancel);
      if (pendingOpenTrigger !== null) {
        window.clearTimeout(pendingOpenTrigger);
        pendingOpenTrigger = null;
      }
    };
  }, [isOpen, handleClose]);

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
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.yaml,.yml,.habit"
            onChange={handleFileSelect}
            className="hidden"
          />

          {mode === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-slate-300">Select a file to open...</p>
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
                      {result.type === 'file'
                        ? 'Workflow'
                        : `${result.habitsLoaded} habit${result.habitsLoaded !== 1 ? 's' : ''} from .habit`} loaded
                      {result.frontendLoaded && ' • UI (New) frontend loaded'}
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
