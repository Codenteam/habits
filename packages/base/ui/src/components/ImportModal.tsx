import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpFromLine,
  Blocks,
  Check,
  FileArchive,
  Layers,
  Loader2,
  Waypoints,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addHabit, selectHabits } from '../store/slices/workflowSlice';
import {
  clearFrontendHtml,
  clearFrontendYaml,
  setFrontendHtml,
  setFrontendYaml,
} from '../store/slices/uiSlice';
import { parseHabitFile, type ParsedHabit, type ParsedStack } from '../lib/stackParser';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'pick' | 'parsing' | 'preview' | 'result';

interface ImportResult {
  habitsAdded: number;
  uiReplaced: boolean;
  idRenames: string[];
  errors: string[];
}

function ensureUniqueHabitId(id: string, taken: Set<string>): string {
  if (!taken.has(id)) return id;
  let n = 2;
  while (taken.has(`${id}-${n}`)) n++;
  return `${id}-${n}`;
}

function describeUi(parsed: ParsedStack): string {
  const parts: string[] = [];
  if (parsed.frontendYaml) parts.push('Declarative UI (YAML)');
  if (parsed.frontendHtml) parts.push('HTML frontend');
  return parts.join(' + ') || 'No UI';
}

export default function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const dispatch = useAppDispatch();
  const existingHabits = useAppSelector(selectHabits);
  const currentFrontendYaml = useAppSelector((state) => state.ui.frontendYaml);
  const currentFrontendHtml = useAppSelector((state) => state.ui.frontendHtml);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const awaitingFileRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [mode, setMode] = useState<Mode>('pick');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedStack | null>(null);
  const [selectedHabitIds, setSelectedHabitIds] = useState<Set<string>>(new Set());
  const [importUi, setImportUi] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const hasUi = !!(parsed?.frontendYaml || parsed?.frontendHtml);
  const currentHasUi = !!(currentFrontendYaml || currentFrontendHtml);

  const existingIds = useMemo(
    () => new Set(existingHabits.map((h) => h.id)),
    [existingHabits],
  );

  const duplicateHabitIds = useMemo(() => {
    if (!parsed) return [];
    return [...selectedHabitIds].filter((id) => existingIds.has(id));
  }, [parsed, selectedHabitIds, existingIds]);

  const resetState = useCallback(() => {
    awaitingFileRef.current = false;
    setMode('pick');
    setFileName('');
    setParsed(null);
    setSelectedHabitIds(new Set());
    setImportUi(false);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onCloseRef.current();
  }, [resetState]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    awaitingFileRef.current = false;

    const file = event.target.files?.[0];
    if (!file) {
      if (awaitingFileRef.current) handleClose();
      return;
    }

    if (!file.name.toLowerCase().endsWith('.habit')) {
      setResult({
        habitsAdded: 0,
        uiReplaced: false,
        idRenames: [],
        errors: ['Please select a .habit archive file.'],
      });
      setMode('result');
      return;
    }

    setFileName(file.name);
    setMode('parsing');

    try {
      const buffer = await file.arrayBuffer();
      const stack = await parseHabitFile(buffer);
      setParsed(stack);
      setSelectedHabitIds(new Set(stack.habits.map((h) => h.id)));
      setImportUi(!!(stack.frontendYaml || stack.frontendHtml));
      setMode('preview');
    } catch (error) {
      setResult({
        habitsAdded: 0,
        uiReplaced: false,
        idRenames: [],
        errors: [error instanceof Error ? error.message : 'Failed to parse .habit file'],
      });
      setMode('result');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleClose]);

  const toggleHabit = (habitId: string) => {
    setSelectedHabitIds((prev) => {
      const next = new Set(prev);
      if (next.has(habitId)) next.delete(habitId);
      else next.add(habitId);
      return next;
    });
  };

  const toggleAllHabits = () => {
    if (!parsed) return;
    const allSelected = selectedHabitIds.size === parsed.habits.length;
    setSelectedHabitIds(
      allSelected ? new Set() : new Set(parsed.habits.map((h) => h.id)),
    );
  };

  const applyImport = () => {
    if (!parsed) return;

    const taken = new Set(existingIds);
    const idRenames: string[] = [];
    let habitsAdded = 0;

    for (const habit of parsed.habits) {
      if (!selectedHabitIds.has(habit.id)) continue;

      const uniqueId = ensureUniqueHabitId(habit.id, taken);
      if (uniqueId !== habit.id) {
        idRenames.push(`${habit.name} → id "${uniqueId}"`);
      }
      taken.add(uniqueId);

      dispatch(
        addHabit({
          id: uniqueId,
          name: uniqueId !== habit.id ? `${habit.name} (imported)` : habit.name,
          description: habit.description,
          nodes: habit.nodes,
          edges: habit.edges,
          output: habit.output,
        }),
      );
      habitsAdded++;
    }

    let uiReplaced = false;
    if (importUi && hasUi) {
      if (parsed.frontendYaml) {
        dispatch(setFrontendYaml(parsed.frontendYaml));
      }
      if (parsed.frontendHtml) {
        dispatch(setFrontendHtml(parsed.frontendHtml));
      }
      if (parsed.frontendYaml && !parsed.frontendHtml) {
        dispatch(clearFrontendHtml());
      }
      if (parsed.frontendHtml && !parsed.frontendYaml) {
        dispatch(clearFrontendYaml());
      }
      uiReplaced = true;
    }

    setResult({
      habitsAdded,
      uiReplaced,
      idRenames,
      errors: parsed.errors,
    });
    setMode('result');
  };

  const canImport = selectedHabitIds.size > 0 || (importUi && hasUi);

  useEffect(() => {
    if (!isOpen) return;

    resetState();
    awaitingFileRef.current = true;

    const input = fileInputRef.current;
    const onNativeCancel = () => {
      if (!awaitingFileRef.current) return;
      handleClose();
    };
    input?.addEventListener('cancel', onNativeCancel);

    const timer = window.setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);

    return () => {
      input?.removeEventListener('cancel', onNativeCancel);
      window.clearTimeout(timer);
    };
  }, [isOpen, handleClose, resetState]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-xl border border-slate-700 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <ArrowUpFromLine className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Import from .habit</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".habit"
            onChange={handleFileSelect}
            className="hidden"
          />

          {mode === 'pick' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-slate-300">Select a .habit file to import...</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
              >
                Choose file
              </button>
            </div>
          )}

          {mode === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-slate-300">Reading {fileName}...</p>
            </div>
          )}

          {mode === 'preview' && parsed && (
            <>
              <div className="flex items-start gap-3 p-3 bg-slate-900/60 border border-slate-600 rounded-lg">
                <FileArchive className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{fileName}</p>
                  {parsed.config.name && (
                    <p className="text-xs text-slate-400 mt-0.5">{parsed.config.name}</p>
                  )}
                  {parsed.config.description && (
                    <p className="text-xs text-slate-500 mt-1">{parsed.config.description}</p>
                  )}
                </div>
              </div>

              <p className="text-sm text-slate-300">
                Choose what to bring into your current stack. Nothing is applied until you click Import.
              </p>

              {/* Habits section */}
              <section className="border border-slate-600 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border-b border-slate-600">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-200">Habits</span>
                    <span className="text-xs text-slate-500">
                      ({parsed.habits.length} in file)
                    </span>
                  </div>
                  {parsed.habits.length > 0 && (
                    <button
                      onClick={toggleAllHabits}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      {selectedHabitIds.size === parsed.habits.length ? 'Deselect all' : 'Select all'}
                    </button>
                  )}
                </div>

                {parsed.habits.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-slate-500">No habits found in this file.</p>
                ) : (
                  <ul className="divide-y divide-slate-700 max-h-48 overflow-y-auto">
                    {parsed.habits.map((habit) => (
                      <HabitRow
                        key={habit.id}
                        habit={habit}
                        checked={selectedHabitIds.has(habit.id)}
                        idConflict={existingIds.has(habit.id)}
                        onToggle={() => toggleHabit(habit.id)}
                      />
                    ))}
                  </ul>
                )}

                {selectedHabitIds.size > 0 && (
                  <div className="px-4 py-2.5 bg-blue-950/30 border-t border-slate-600">
                    <p className="text-xs text-blue-200">
                      <strong>Add to stack:</strong> {selectedHabitIds.size} selected habit
                      {selectedHabitIds.size !== 1 ? 's' : ''} will be appended to your Habits Stack.
                      Your existing {existingHabits.length} habit
                      {existingHabits.length !== 1 ? 's' : ''} stay unchanged.
                    </p>
                    {duplicateHabitIds.length > 0 && (
                      <p className="text-xs text-amber-300 mt-1 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        {duplicateHabitIds.length} habit
                        {duplicateHabitIds.length !== 1 ? 's have' : ' has'} the same id as an existing
                        habit — imported copies will get a new id suffix.
                      </p>
                    )}
                  </div>
                )}
              </section>

              {/* UI section */}
              <section className="border border-slate-600 rounded-lg overflow-hidden">
                <label
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    hasUi ? 'hover:bg-slate-700/30' : 'opacity-60 cursor-not-allowed'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={importUi && hasUi}
                    disabled={!hasUi}
                    onChange={(e) => setImportUi(e.target.checked)}
                    className="mt-1 rounded border-slate-500 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Blocks className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium text-slate-200">UI</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{describeUi(parsed)}</p>
                    {!hasUi && (
                      <p className="text-xs text-slate-500 mt-1">This .habit file has no UI.</p>
                    )}
                  </div>
                </label>

                {importUi && hasUi && (
                  <div className="px-4 py-2.5 bg-amber-950/40 border-t border-amber-800/50">
                    <p className="text-xs text-amber-200 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        <strong>Replace current UI:</strong> importing UI will overwrite your
                        {currentHasUi ? ' existing' : ''} frontend
                       with the UI from this file.
                      </span>
                    </p>
                  </div>
                )}
              </section>

              {parsed.errors.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-yellow-200 space-y-1">
                    <p className="font-medium">Warnings while reading file:</p>
                    {parsed.errors.map((err, i) => (
                      <p key={i}>• {err}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    awaitingFileRef.current = true;
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Choose another file
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={applyImport}
                  disabled={!canImport}
                  className="flex-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                >
                  Import selected
                </button>
              </div>
            </>
          )}

          {mode === 'result' && result && (
            <div className="space-y-4">
              {result.habitsAdded > 0 || result.uiReplaced ? (
                <div className="flex items-start gap-3 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                  <Check className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-green-300 space-y-1">
                    <p className="text-green-400 font-medium">Import complete</p>
                    {result.habitsAdded > 0 && (
                      <p>
                        Added {result.habitsAdded} habit{result.habitsAdded !== 1 ? 's' : ''} to your stack.
                      </p>
                    )}
                    {result.uiReplaced && <p>Replaced your current UI.</p>}
                    {result.idRenames.length > 0 && (
                      <ul className="text-xs text-green-200/80 mt-2 space-y-0.5">
                        {result.idRenames.map((line) => (
                          <li key={line}>• Renamed {line}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}

              {result.errors.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-700 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-red-400 font-medium">
                      {result.habitsAdded === 0 && !result.uiReplaced
                        ? 'Import failed'
                        : 'Some issues occurred'}
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
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HabitRow({
  habit,
  checked,
  idConflict,
  onToggle,
}: {
  habit: ParsedHabit;
  checked: boolean;
  idConflict: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <label className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-700/30 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-1 rounded border-slate-500 text-blue-600 focus:ring-blue-500"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Waypoints className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-sm text-slate-200 truncate">{habit.name}</span>
            {idConflict && (
              <span className="text-[10px] uppercase tracking-wide text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded">
                id exists
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 pl-5">
            {habit.nodes.length} node{habit.nodes.length !== 1 ? 's' : ''}
            {habit.description ? ` · ${habit.description}` : ''}
          </p>
        </div>
      </label>
    </li>
  );
}
