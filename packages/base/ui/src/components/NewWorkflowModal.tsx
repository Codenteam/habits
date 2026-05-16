import { useState, useEffect } from 'react';
import { FileJson, X, Loader2, Wand2, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';
import yaml from 'js-yaml';
import { useAppDispatch } from '../store/hooks';
import { clearWorkflow, loadWorkflow, setEnvVariables, addHabit } from '../store/slices/workflowSlice';
import { clearFrontendHtml, setFrontendHtml, clearEnvContent, setEnvContent } from '../store/slices/uiSlice';
import GenerateModal from './GenerateModal';
import Dialog from './Dialog';
import type { Workflow } from '../types/workflow';
import { convertHabitYamlToHabit } from '../lib/stackParser';

// Helper to parse .env file content into key-value object
function parseEnvContent(content: string): Record<string, string> {
  const envVars: Record<string, string> = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex).trim();
      let value = trimmed.substring(eqIndex + 1).trim();
      
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      envVars[key] = value;
    }
  }
  
  return envVars;
}

const SHOWCASE_BASE_URL = 'https://codenteam.com/intersect/habits';

interface ShowcaseEntry {
  slug: string;
  name: string;
  description: string;
  thumbnail: string;
  tags: string[];
  difficulty: string;
  habitUrl: string;
}

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

  const [showcase, setShowcase] = useState<ShowcaseEntry[]>([]);
  const [showcaseLoading, setShowcaseLoading] = useState(false);
  const [showcaseError, setShowcaseError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setShowcaseLoading(true);
    setShowcaseError(null);
    fetch(`${SHOWCASE_BASE_URL}/showcase/index.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ShowcaseEntry[]>;
      })
      .then((data) => setShowcase(data))
      .catch(() => setShowcaseError('Failed to load showcase. Check your connection.'))
      .finally(() => setShowcaseLoading(false));
  }, [isOpen]);

  const handleStartFromScratch = () => {
    setDialogConfig({
      message: 'Are you sure you want to start a new workflow? This will clear the current workflow.',
      type: 'confirm',
      onConfirm: () => {
        dispatch(clearWorkflow());
        dispatch(clearFrontendHtml());
        dispatch(clearEnvContent());
        onClose();
      },
    });
    setDialogOpen(true);
  };

  const handleSelectShowcaseHabit = (entry: ShowcaseEntry) => {
    setDialogConfig({
      message: `Load "${entry.name}"? This will replace your current workflow.`,
      type: 'confirm',
      onConfirm: () => loadShowcaseHabit(entry),
    });
    setDialogOpen(true);
  };

  const loadShowcaseHabit = async (entry: ShowcaseEntry) => {
    setLoading(entry.slug);
    setError(null);

    try {
      const habitUrl = `${SHOWCASE_BASE_URL}${entry.habitUrl}`;
      const res = await fetch(habitUrl);
      if (!res.ok) throw new Error(`Failed to fetch habit: ${res.statusText}`);

      const arrayBuffer = await res.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      // Read stack.yaml to find workflow paths and frontend dir
      const stackYamlFile = zip.file('stack.yaml');
      if (!stackYamlFile) throw new Error('No stack.yaml in habit file');

      const stackContent = await stackYamlFile.async('text');
      const stackConfig = yaml.load(stackContent) as any;

      // Extract workflow YAMLs
      const workflows: Workflow[] = [];
      for (const wfConfig of (stackConfig?.workflows ?? []) as Array<{ path?: string; enabled?: boolean }>) {
        if (!wfConfig.path || wfConfig.enabled === false) continue;
        const relativePath = wfConfig.path.replace(/^\.\//u, '');
        const wfFile = zip.file(relativePath);
        if (!wfFile) continue;
        const parsed = yaml.load(await wfFile.async('text'));
        if (parsed) workflows.push(parsed as Workflow);
      }

      if (workflows.length === 0) throw new Error('No workflows found in this habit');

      dispatch(clearWorkflow());
      dispatch(clearFrontendHtml());
      dispatch(clearEnvContent());

      // Load all workflows as habits in the stack.
      // For the first one, use loadWorkflow to replace the placeholder habit created by
      // clearWorkflow (new-1) in place. For subsequent ones, addHabit appends to the stack.
      workflows.forEach((wf, index) => {
        if (index === 0) {
          dispatch(loadWorkflow(wf));
        } else {
          try {
            const habit = convertHabitYamlToHabit(wf as any);
            dispatch(addHabit(habit));
          } catch {
            // skip malformed workflows
          }
        }
      });

      // Extract frontend HTML (prefer -src version for editable source)
      const frontendDir = (stackConfig?.server?.frontend as string | undefined)
        ?.replace(/^\.\//u, '').replace(/\/$/u, '') ?? 'frontend';
      for (const candidate of [`${frontendDir}-src/index.html`, `${frontendDir}/index.html`, 'index.html']) {
        const htmlFile = zip.file(candidate);
        if (htmlFile) {
          dispatch(setFrontendHtml(await htmlFile.async('text')));
          break;
        }
      }

      // Extract .env
      const envFile = zip.file('.env');
      if (envFile) {
        const envContent = await envFile.async('text');
        dispatch(setEnvContent(envContent));
        const envVars = parseEnvContent(envContent);
        if (Object.keys(envVars).length > 0) dispatch(setEnvVariables(envVars));
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load habit');
    } finally {
      setLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
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
        <div className="p-6 space-y-6">
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

          {/* Showcase section */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
              Or choose from the showcase
            </h3>

            {showcaseLoading && (
              <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading showcase...</span>
              </div>
            )}

            {showcaseError && (
              <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {showcaseError}
              </div>
            )}

            {!showcaseLoading && !showcaseError && showcase.length > 0 && (
              <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto pr-1">
                {showcase.map((entry) => (
                  <button
                    key={entry.slug}
                    onClick={() => handleSelectShowcaseHabit(entry)}
                    disabled={loading !== null}
                    className="w-full flex items-center gap-3 p-3 bg-slate-700/50 hover:bg-slate-700 border-2 border-slate-600 hover:border-blue-500 rounded-lg transition-all group text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {/* Thumbnail */}
                    <div className="w-14 h-14 shrink-0 rounded overflow-hidden bg-slate-600 flex items-center justify-center">
                      {loading === entry.slug ? (
                        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                      ) : (
                        <img
                          src={`${SHOWCASE_BASE_URL}${entry.thumbnail}`}
                          alt={entry.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium text-sm">{entry.name}</span>
                        {entry.difficulty && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-600 text-slate-300">
                            {entry.difficulty}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{entry.description}</p>
                      {entry.tags?.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {entry.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-slate-600/60 text-slate-400">
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

            {!showcaseLoading && !showcaseError && showcase.length === 0 && (
              <p className="text-sm text-slate-500 py-4 text-center">No showcase habits available.</p>
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
            <p>Showcase habits are ready-to-use examples from the Habits community.</p>
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
