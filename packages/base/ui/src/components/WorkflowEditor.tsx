import { lazy, Suspense, useCallback, useEffect, useMemo } from 'react';
import { extractInputFields } from '@ha-bits/core';
import { Waypoints, AlertTriangle } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectActiveHabit, selectHabits } from '../store/slices/workflowSlice';
import { setFrontendYaml, setViewMode, clearFrontendHtml } from '../store/slices/uiSlice';
import { selectUiEditorAccess } from '../store/selectors/validationSelectors';
import Toolbar from './Toolbar';
import { compilePreviewHtml } from '@/lib/uiPreviewCompile';

const BackendWorkflowEditor = lazy(() => import('./BackendWorkflowEditor'));
const UiSpecWizard = lazy(() =>
  import('@ha-bits/frontend-builder/ui-spec').then((m) => ({ default: m.UiSpecWizard }))
);

const showDebugYaml = import.meta.env.DEV;

export default function WorkflowEditor() {
  const dispatch = useAppDispatch();
  const viewMode = useAppSelector((state) => state.ui.viewMode);
  const frontendYaml = useAppSelector((state) => state.ui.frontendYaml);
  const frontendYamlRevision = useAppSelector((state) => state.ui.frontendYamlRevision);
  const activeHabit = useAppSelector(selectActiveHabit);
  const habits = useAppSelector(selectHabits);
  const uiEditorAccess = useAppSelector(selectUiEditorAccess);

  const linkableHabits = useMemo(
    () =>
      habits
        .filter((h) => h.nodes.length > 0)
        .map((h) => ({
          id: h.id,
          name: h.name,
          inputs: extractInputFields({ nodes: h.nodes, output: h.output }),
        })),
    [habits],
  );

  useEffect(() => {
    if (viewMode === 'frontend-yaml' && !uiEditorAccess.allowed) {
      dispatch(setViewMode('backend'));
    }
  }, [viewMode, uiEditorAccess.allowed, dispatch]);

  const handleSaveFrontendYaml = useCallback(
    (yamlText: string) => {
      dispatch(setFrontendYaml(yamlText));
      if (!yamlText.trim()) {
        dispatch(clearFrontendHtml());
      }
    },
    [dispatch],
  );

  return (
    <div className="flex flex-col h-screen">
      <Toolbar />

      {viewMode === 'backend' ? (
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center bg-slate-900 text-slate-400 text-sm">
              Loading workflow editor…
            </div>
          }
        >
          <BackendWorkflowEditor />
        </Suspense>
      ) : !uiEditorAccess.allowed ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-slate-900 px-6 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400" />
          <div className="max-w-md space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">Logic must be ready first</h2>
            <p className="text-sm text-slate-400">{uiEditorAccess.reason}</p>
          </div>
          {uiEditorAccess.issues.length > 0 && (
            <ul className="max-w-lg w-full text-left text-xs text-slate-400 space-y-1 border border-slate-800 rounded-md p-3 bg-slate-950">
              {uiEditorAccess.issues.slice(0, 6).map((issue, i) => (
                <li key={`${issue.code}-${i}`}>• {issue.message}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => dispatch(setViewMode('backend'))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-500"
          >
            <Waypoints className="w-4 h-4" />
            Go to Logic
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
          <div className="flex-1 overflow-hidden">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-slate-400 text-sm">
                  Loading UI wizard…
                </div>
              }
            >
              <UiSpecWizard
                initialYaml={frontendYaml}
                loadRevision={frontendYamlRevision}
                onChange={handleSaveFrontendYaml}
                height="100%"
                compilePreviewHtml={compilePreviewHtml}
                defaultMetaId={
                  activeHabit?.name ? activeHabit.name.toLowerCase().replace(/\s+/g, '-') : undefined
                }
                defaultMetaTitle={activeHabit?.name}
                linkableHabits={linkableHabits}
                showDebugYaml={showDebugYaml}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
