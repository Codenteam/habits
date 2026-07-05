import { useState, useEffect } from 'react';
import { FileJson, Sparkles, X, Loader2, Wand2 } from 'lucide-react';
import { useAppDispatch } from '../store/hooks';
import { clearWorkflow } from '../store/slices/workflowSlice';
import { clearFrontendHtml, clearFrontendYaml, clearEnvContent } from '../store/slices/uiSlice';
import GenerateModal from './GenerateModal';
import Dialog from './Dialog';
import {
  fetchShowcaseIndex,
  loadShowcaseHabit,
  showcaseAssetUrl,
  type ShowcaseHabitEntry,
} from '../lib/showcaseLoader';

interface NewWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewWorkflowModal({ isOpen, onClose }: NewWorkflowModalProps) {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    message: string;
    type: 'confirm' | 'alert';
    onConfirm?: () => void;
  }>({ message: '', type: 'alert' });
  const [showcaseHabits, setShowcaseHabits] = useState<ShowcaseHabitEntry[]>([]);
  const [indexLoading, setIndexLoading] = useState(false);
  const [indexError, setIndexError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setIndexLoading(true);
    setIndexError(null);

    fetchShowcaseIndex()
      .then((habits) => {
        if (!cancelled) setShowcaseHabits(habits);
      })
      .catch((err) => {
        if (!cancelled) {
          setIndexError(err instanceof Error ? err.message : 'Failed to load showcase');
        }
      })
      .finally(() => {
        if (!cancelled) setIndexLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleStartFromScratch = () => {
    setDialogConfig({
      message: 'Are you sure you want to start a new workflow? This will clear the current workflow.',
      type: 'confirm',
      onConfirm: () => {
        dispatch(clearWorkflow());
        dispatch(clearFrontendHtml());
        dispatch(clearFrontendYaml());
        dispatch(clearEnvContent());
        onClose();
      },
    });
    setDialogOpen(true);
  };

  const handleSelectShowcase = (habit: ShowcaseHabitEntry) => {
    setDialogConfig({
      message: `Load the "${habit.name}" template? This will replace your current workflow.`,
      type: 'confirm',
      onConfirm: () => loadShowcaseTemplate(habit),
    });
    setDialogOpen(true);
  };

  const loadShowcaseTemplate = async (habit: ShowcaseHabitEntry) => {
    setLoading(habit.slug);
    setError(null);

    try {
      await loadShowcaseHabit(habit.slug, dispatch);
      onClose();
    } catch (err) {
      console.error('Failed to load showcase template:', err);
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl border border-slate-700 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <FileJson className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">New Workflow</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Start from scratch */}
          <div>
            <button
              onClick={handleStartFromScratch}
              className="w-full flex items-center gap-4 p-4 bg-slate-700/50 hover:bg-slate-700 border-2 border-slate-600 hover:border-green-500 rounded-lg transition-all group text-left"
            >
              <div className="p-3 bg-green-600/20 rounded-lg group-hover:bg-green-600/30 transition-colors">
                <FileJson className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <div className="text-white font-medium">Start from Scratch</div>
                <div className="text-slate-400 text-sm mt-1">
                  Begin with an empty workflow canvas
                </div>
              </div>
            </button>
          </div>

          {/* Generate with AI */}
          <div>
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="w-full flex items-center gap-4 p-4 bg-slate-700/50 hover:bg-slate-700 border-2 border-slate-600 hover:border-purple-500 rounded-lg transition-all group text-left"
            >
              <div className="p-3 bg-purple-600/20 rounded-lg group-hover:bg-purple-600/30 transition-colors">
                <Wand2 className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="text-white font-medium">Generate with AI</div>
                <div className="text-slate-400 text-sm mt-1">
                  Describe your workflow and let AI create it for you
                </div>
              </div>
            </button>
          </div>

          {/* Showcase templates */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
              Or choose a template
            </h3>

            {indexLoading && (
              <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading showcase templates…
              </div>
            )}

            {indexError && (
              <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-sm">
                {indexError}
              </div>
            )}

            {!indexLoading && !indexError && (
              <div className="grid grid-cols-1 gap-3">
                {showcaseHabits.map((habit) => (
                  <button
                    key={habit.slug}
                    onClick={() => handleSelectShowcase(habit)}
                    disabled={loading !== null}
                    className="w-full flex items-center gap-4 p-4 bg-slate-700/50 hover:bg-slate-700 border-2 border-slate-600 hover:border-blue-500 rounded-lg transition-all group text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-slate-600/50 flex items-center justify-center">
                      {loading === habit.slug ? (
                        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                      ) : habit.thumbnail ? (
                        <img
                          src={showcaseAssetUrl(habit.thumbnail)}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Sparkles className="w-6 h-6 text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium">{habit.name}</div>
                      <div className="text-slate-400 text-sm mt-1 line-clamp-2">
                        {habit.description}
                      </div>
                      {habit.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {habit.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-1.5 py-0.5 rounded bg-slate-600/60 text-slate-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-slate-500 pt-2 border-t border-slate-700">
            <p>
              Templates are loaded from the{' '}
              <a
                href="https://codenteam.com/intersect/habits/showcase"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Habits showcase
              </a>
              . You can also open one directly with{' '}
              <code className="bg-slate-700 px-1 rounded">?load=hello-world</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Generate Modal */}
      <GenerateModal
        isOpen={isGenerateModalOpen}
        onClose={() => {
          setIsGenerateModalOpen(false);
          onClose();
        }}
      />

      {/* Confirm Dialog */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={dialogConfig.onConfirm}
        message={dialogConfig.message}
        type={dialogConfig.type}
        confirmText="Confirm"
        cancelText="Cancel"
      />
    </div>
  );
}
