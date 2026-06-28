/**
 * Guided wizard for building index.yaml — linear steps + live canvas for tweaks.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Wand2,
  LayoutTemplate,
  Layers,
  Plus,
} from 'lucide-react';
import { UiSpecBuilderVanilla, type UiSpecBuilderProps } from './UiSpecBuilder.vanilla';
import {
  parseYamlToSpecState,
  specStateToSpec,
  emitYaml,
} from './uiSpecYaml';
import type { SpecState } from './uiSpecYaml';
import { syncSpecWithInferredState, getFormFieldNames } from './inferState';
import {
  WIZARD_STEPS,
  canAdvanceStep,
  nextStep,
  prevStep,
  initialWizardStep,
  type WizardStepId,
} from './wizardSteps';
import {
  applyFormFeedbackResultPattern,
  applyHistoryListPattern,
  applyCookbookActions,
  applyCookbookLayout,
  switchSpecView,
  type FormFieldDef,
} from './wizardPatterns';
import {
  defaultActionIdForHabit,
  habitIdFromEndpoint,
  linkHabitToAction,
  type HabitOption,
} from './actionLinking';
import { ActionsStep } from './ActionsStep';
import { OverviewStep } from './OverviewStep';
import { WIDGET_PRESETS } from './uiSpecPresets';
import {
  WIZARD_WIDGET_CATEGORIES,
  WIZARD_WIDGET_LIST,
} from './wizardWidgetList';

type PagesSubStep = 'template' | 'widgets';

interface BuilderBridge {
  addWidget: (kind: string, parentUid?: string | null) => void;
  addPreset: (presetId: string, parentUid?: string | null) => void;
}

function getBuilderBridge(): BuilderBridge | null {
  return (window as unknown as { __HA_BUILDER_BRIDGE__?: BuilderBridge }).__HA_BUILDER_BRIDGE__ ?? null;
}

function specHasPageWidgets(spec: SpecState): boolean {
  return (
    spec.widgets.length > 0 ||
    Boolean(spec.views &&
      Object.values(spec.views).some(
        (v) => Array.isArray(v?.widgets) && (v.widgets as unknown[]).length > 0,
      ))
  );
}

const YAML_HEAD = '# yaml-language-server: $schema=../../../schemas/ui-spec.schema.yaml\n';

function specToYaml(spec: SpecState): string {
  return YAML_HEAD + emitYaml(specStateToSpec(spec));
}

function slugify(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'habit';
}

export interface UiSpecWizardProps extends Omit<UiSpecBuilderProps, 'onChange'> {
  onChange: (yaml: string) => void;
  /** Habits with workflow nodes (from Logic tab) — used for in-place action linking */
  linkableHabits?: HabitOption[];
  /** Show raw YAML tab in the builder preview panel (dev only). */
  showDebugYaml?: boolean;
}

const THEME_PRESETS = [
  'neural',
  'ha-bits-blue', 'ha-bits-cyan', 'ha-bits-purple', 'ha-bits-red',
  'ha-bits-emerald', 'ha-bits-warn', 'aurora', 'cyberpunk',
  'mobile-blue', 'tailwind-dark', 'showcase-flat',
];

const INPUT =
  'w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none';

export function UiSpecWizard({
  initialYaml,
  onChange,
  height = '100%',
  defaultMetaId,
  defaultMetaTitle,
  compilePreviewHtml,
  linkableHabits = [],
  showDebugYaml = false,
}: UiSpecWizardProps) {
  const [step, setStep] = useState<WizardStepId>(() => initialWizardStep(initialYaml ?? ''));
  const [yamlText, setYamlText] = useState(initialYaml ?? '');
  const [manualStateKeys] = useState(() => new Set<string>());
  const [selectedWidgetKind, setSelectedWidgetKind] = useState<string | null>(null);
  const [pagesSubStep, setPagesSubStep] = useState<PagesSubStep>('template');

  const linkableHabitIds = useMemo(
    () => linkableHabits.map((h) => h.id),
    [linkableHabits],
  );

  const spec = useMemo(
    () => syncSpecWithInferredState(
      parseYamlToSpecState(yamlText, defaultMetaId, defaultMetaTitle),
      manualStateKeys,
    ),
    [yamlText, defaultMetaId, defaultMetaTitle, manualStateKeys],
  );

  const commitSpec = useCallback(
    (next: SpecState) => {
      const synced = syncSpecWithInferredState(next, manualStateKeys);
      const y = specToYaml(synced);
      setYamlText(y);
      onChange(y);
    },
    [manualStateKeys, onChange],
  );

  const updateSpec = useCallback(
    (patch: (s: SpecState) => SpecState) => {
      commitSpec(patch(spec));
    },
    [commitSpec, spec],
  );

  const handleBuilderChange = useCallback(
    (y: string) => {
      setYamlText(y);
      onChange(y);
    },
    [onChange],
  );

  const ctx = useMemo(() => ({ linkableHabitIds }), [linkableHabitIds]);
  const validation = canAdvanceStep(step, spec, ctx);
  const currentStepDef = WIZARD_STEPS.find((s) => s.id === step)!;
  const showCanvas = currentStepDef.showCanvas;
  const overviewMode = currentStepDef.fullBuilder === true;

  useEffect(() => {
    if (step !== 'pages') return;
    setPagesSubStep(specHasPageWidgets(spec) ? 'widgets' : 'template');
  }, [step]);

  const goNext = () => {
    if (step === 'pages' && pagesSubStep === 'template') {
      setPagesSubStep('widgets');
      return;
    }
    const n = nextStep(step);
    if (n && validation.ok) setStep(n);
  };
  const goBack = () => {
    if (step === 'pages' && pagesSubStep === 'widgets') {
      setPagesSubStep('template');
      return;
    }
    const p = prevStep(step);
    if (p) setStep(p);
  };

  const pagesNextDisabled =
    step === 'pages' && pagesSubStep === 'template' && !specHasPageWidgets(spec);
  const pagesNextLabel =
    step === 'pages' && pagesSubStep === 'template' ? 'Add widgets' : 'Next';

  return (
    <div
      className="flex flex-col bg-slate-950 text-slate-100"
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <WizardHeader step={step} onStepClick={setStep} />

      <div className="flex flex-1 min-h-0 flex-col">
        <div className="flex flex-1 min-h-0">
        <aside
          className={
            (overviewMode ? 'w-[380px]' : 'w-[340px]') +
            ' flex-shrink-0 border-r border-slate-800 bg-slate-900 flex flex-col min-h-0'
          }
        >
          <div className="px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-100">{currentStepDef.label}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{currentStepDef.description}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {step === 'identity' && (
              <IdentityStep spec={spec} onUpdate={updateSpec} />
            )}
            {step === 'layout' && (
              <LayoutStep spec={spec} onUpdate={updateSpec} />
            )}
            {step === 'pages' && (
              <PagesStep
                spec={spec}
                linkableHabits={linkableHabits}
                selectedWidgetKind={selectedWidgetKind}
                subStep={pagesSubStep}
                onSubStepChange={setPagesSubStep}
                onTemplateApplied={() => setPagesSubStep('widgets')}
                onUpdate={updateSpec}
              />
            )}
            {step === 'actions' && (
              <ActionsStep
                spec={spec}
                linkableHabits={linkableHabits}
                onUpdate={updateSpec}
              />
            )}
            {step === 'overview' && (
              <OverviewStep spec={spec} linkableHabits={linkableHabits} showDebugYaml={showDebugYaml} />
            )}
          </div>

          <div className="flex-shrink-0 border-t border-slate-800 p-3 flex items-center justify-between gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              onClick={goBack}
              disabled={!prevStep(step)}
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            {!validation.ok && (
              <span className="text-xs text-amber-400 flex-1 text-center truncate" title={validation.reason}>
                {validation.reason}
              </span>
            )}
            {step !== 'overview' ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
                onClick={goNext}
                disabled={!validation.ok || pagesNextDisabled}
              >
                {pagesNextLabel} <ChevronRight className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </aside>

        {/* Canvas + builder */}
        {showCanvas ? (
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            <UiSpecBuilderVanilla
              initialYaml={yamlText}
              onChange={handleBuilderChange}
              height="100%"
              compilePreviewHtml={compilePreviewHtml}
              defaultMetaId={defaultMetaId}
              defaultMetaTitle={defaultMetaTitle}
              chrome={overviewMode ? 'full' : 'embedded'}
              hideTemplates={!overviewMode}
              hideAppSettings={!overviewMode}
              linkableHabits={linkableHabits}
              onSelectedNodeChange={(node) => setSelectedWidgetKind(node?.kind ?? null)}
              hideYamlTab={!showDebugYaml}
              defaultRightTab={overviewMode ? 'app-settings' : 'settings'}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm p-8 text-center">
            <div>
              <Wand2 className="w-10 h-10 mx-auto mb-3 text-slate-600" />
              <p>Complete this step, then continue — the live canvas appears in the next steps.</p>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function WizardHeader({
  step,
  onStepClick,
}: {
  step: WizardStepId;
  onStepClick: (id: WizardStepId) => void;
}) {
  return (
    <div className="flex-shrink-0 border-b border-slate-800 bg-slate-900 px-4 py-2">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-200 mb-2">
        <Sparkles className="w-4 h-4 text-amber-400" />
        UI Wizard
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Wizard steps">
        {WIZARD_STEPS.map((s, i) => {
          const active = s.id === step;
          const done = WIZARD_STEPS.findIndex((x) => x.id === step) > i;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-current={active ? 'step' : undefined}
              title={`Go to ${s.label}`}
              onClick={() => onStepClick(s.id)}
              className={
                'flex-shrink-0 px-2 py-1 rounded text-xs cursor-pointer transition-colors ' +
                (active
                  ? 'bg-blue-600 text-white'
                  : done
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-950 text-slate-500 border border-slate-800 hover:border-slate-600 hover:text-slate-300')
              }
            >
              {i + 1}. {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IdentityStep({
  spec,
  onUpdate,
}: {
  spec: SpecState;
  onUpdate: (patch: (s: SpecState) => SpecState) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block text-xs text-slate-400">
        App title
        <input
          className={`${INPUT} mt-1`}
          value={spec.meta.title}
          onChange={(e) => {
            const title = e.target.value;
            onUpdate((s) => ({
              ...s,
              meta: {
                ...s.meta,
                title,
                id: s.meta.id && s.meta.id !== 'my-habit' ? s.meta.id : slugify(title),
              },
            }));
          }}
        />
      </label>
      <label className="block text-xs text-slate-400">
        Subtitle
        <input
          className={`${INPUT} mt-1`}
          value={spec.meta.subtitle ?? ''}
          onChange={(e) =>
            onUpdate((s) => ({ ...s, meta: { ...s.meta, subtitle: e.target.value || undefined } }))
          }
        />
      </label>
      <label className="block text-xs text-slate-400">
        App ID
        <input
          className={`${INPUT} mt-1 font-mono`}
          value={spec.meta.id}
          onChange={(e) =>
            onUpdate((s) => ({ ...s, meta: { ...s.meta, id: slugify(e.target.value) } }))
          }
        />
      </label>
      <label className="block text-xs text-slate-400">
        Icon (lucide name)
        <input
          className={`${INPUT} mt-1 font-mono`}
          value={spec.meta.icon ?? ''}
          placeholder="lucide:ChefHat"
          onChange={(e) =>
            onUpdate((s) => ({ ...s, meta: { ...s.meta, icon: e.target.value || undefined } }))
          }
        />
      </label>
      <label className="block text-xs text-slate-400">
        Color theme
        <select
          className={`${INPUT} mt-1`}
          value={spec.theme.preset ?? 'neural'}
          onChange={(e) =>
            onUpdate((s) => ({ ...s, theme: { ...s.theme, preset: e.target.value } }))
          }
        >
          {THEME_PRESETS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-slate-400">
        Mode
        <select
          className={`${INPUT} mt-1`}
          value={spec.theme.mode ?? 'dark'}
          onChange={(e) =>
            onUpdate((s) => ({
              ...s,
              theme: { ...s.theme, mode: e.target.value as 'dark' | 'light' },
            }))
          }
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </label>
    </div>
  );
}

function LayoutStep({
  spec,
  onUpdate,
}: {
  spec: SpecState;
  onUpdate: (patch: (s: SpecState) => SpecState) => void;
}) {
  const nav = spec.layout.nav ?? [];

  const setLayoutType = (type: SpecState['layout']['type']) => {
    onUpdate((s) => {
      if (type === 'single') {
        return {
          ...s,
          layout: { ...s.layout, type, nav: undefined },
          views: undefined,
          defaultView: undefined,
        };
      }
      const defaultNav =
        nav.length > 0
          ? nav
          : [
              { id: 'main', label: 'Main', icon: 'lucide:Sparkles' },
              { id: 'history', label: 'History', icon: 'lucide:FolderOpen' },
            ];
      const views: Record<string, Record<string, unknown>> = { ...(s.views ?? {}) };
      for (const item of defaultNav) {
        if (!views[item.id]) views[item.id] = { widgets: [] };
      }
      return {
        ...s,
        layout: {
          ...s.layout,
          type,
          header: s.layout.header ?? {
            title: s.meta.title,
            subtitle: s.meta.subtitle,
            icon: s.meta.icon,
          },
          nav: defaultNav,
        },
        views,
        defaultView: s.defaultView ?? defaultNav[0]?.id,
      };
    });
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs text-slate-400">
        Page layout
        <select
          className={`${INPUT} mt-1`}
          value={spec.layout.type}
          onChange={(e) => setLayoutType(e.target.value as SpecState['layout']['type'])}
        >
          <option value="single">Single page</option>
          <option value="tabs">Tabs</option>
          <option value="sidebar">Sidebar</option>
        </select>
      </label>

      {(spec.layout.type === 'tabs' || spec.layout.type === 'sidebar') && (
        <>
          <p className="text-xs text-slate-500">Navigation tabs</p>
          {nav.map((row, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={`${INPUT} w-20 font-mono text-xs`}
                value={row.id}
                placeholder="id"
                onChange={(e) => {
                  const id = slugify(e.target.value);
                  const next = nav.map((n, idx) => (idx === i ? { ...n, id } : n));
                  onUpdate((s) => ({ ...s, layout: { ...s.layout, nav: next } }));
                }}
              />
              <input
                className={`${INPUT} flex-1`}
                value={row.label ?? ''}
                placeholder="Label"
                onChange={(e) => {
                  const next = nav.map((n, idx) =>
                    idx === i ? { ...n, label: e.target.value } : n,
                  );
                  onUpdate((s) => ({ ...s, layout: { ...s.layout, nav: next } }));
                }}
              />
            </div>
          ))}
          <button
            type="button"
            className="text-xs text-blue-400 hover:text-blue-300"
            onClick={() => {
              const next = [...nav, { id: `tab-${nav.length + 1}`, label: `Tab ${nav.length + 1}` }];
              onUpdate((s) => ({ ...s, layout: { ...s.layout, nav: next } }));
            }}
          >
            + Add tab
          </button>
          <label className="block text-xs text-slate-400 mt-2">
            Default tab
            <select
              className={`${INPUT} mt-1`}
              value={spec.defaultView ?? nav[0]?.id ?? ''}
              onChange={(e) => onUpdate((s) => ({ ...s, defaultView: e.target.value }))}
            >
              {nav.map((n) => (
                <option key={n.id} value={n.id}>{n.label ?? n.id}</option>
              ))}
            </select>
          </label>
        </>
      )}
    </div>
  );
}


function PagesStep({
  spec,
  linkableHabits,
  selectedWidgetKind,
  subStep,
  onSubStepChange,
  onTemplateApplied,
  onUpdate,
}: {
  spec: SpecState;
  linkableHabits: HabitOption[];
  selectedWidgetKind: string | null;
  subStep: PagesSubStep;
  onSubStepChange: (s: PagesSubStep) => void;
  onTemplateApplied: () => void;
  onUpdate: (patch: (s: SpecState) => SpecState) => void;
}) {
  const viewIds =
    spec.layout.nav?.map((n) => n.id) ??
    (spec.views ? Object.keys(spec.views) : ['main']);
  const [activeView, setActiveView] = useState(viewIds[0] ?? 'main');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>(() =>
    Object.fromEntries([
      ['Presets', true],
      ...WIZARD_WIDGET_CATEGORIES.map((c) => [c, c === 'Layout' || c === 'Forms']),
    ]),
  );

  const afterTemplate = (fn: () => void) => {
    fn();
    onTemplateApplied();
  };

  const applyCreatePattern = () => {
    afterTemplate(() => {
      const fields: FormFieldDef[] = [
        { name: 'input', type: 'text', label: 'Input', required: true },
      ];
      onUpdate((s) => {
        let next = switchSpecView(s, activeView);
        next = applyFormFeedbackResultPattern(next, {
          viewId: activeView,
          cardTitle: 'Get started',
          fields,
          submitAction: Object.keys(next.actions)[0] ?? 'submit',
          submitLabel: 'Submit',
          errorStateKey: 'error',
          resultStateKey: 'result',
          resultTitle: 'Result',
        });
        return next;
      });
    });
  };

  const applyCookbookAll = () => {
    afterTemplate(() => {
      onUpdate((s) => {
        let next = applyCookbookLayout(s);
        next = applyCookbookActions(next);
        next = switchSpecView(next, 'create');
        next = applyFormFeedbackResultPattern(next, {
          viewId: 'create',
          cardTitle: 'Generate a recipe',
          hideFormWhen: 'state.currentRecipe',
          fields: [
            { name: 'ingredients', type: 'tag-input', label: 'Available ingredients', placeholder: 'Type and press Enter', required: true },
            { name: 'mealType', type: 'select', label: 'Meal type', options: ['', 'breakfast', 'lunch', 'dinner', 'snack', 'dessert'] },
            { name: 'cuisine', type: 'select', label: 'Cuisine', options: ['', 'Italian', 'Mexican', 'Asian', 'Indian', 'Mediterranean', 'American', 'French'] },
            { name: 'restrictions', type: 'text', label: 'Dietary restrictions', placeholder: 'vegetarian, gluten-free...' },
            { name: 'servings', type: 'select', label: 'Servings', default: '4', options: ['1', '2', '4', '6', '8'] },
          ],
          submitAction: 'generate',
          submitLabel: 'Generate recipe',
          loadingLabel: 'Cooking up something...',
          errorStateKey: 'error',
          resultStateKey: 'currentRecipe',
          resultTitle: 'Your recipe',
          resultSections: 'recipe',
          clearAction: 'clearRecipe',
        });
        next = switchSpecView(next, 'history');
        next = applyHistoryListPattern(next, {
          viewId: 'history',
          loadAction: 'listHistory',
          dataPath: 'recipes',
          onEnter: 'listHistory',
          onClickAction: 'reopenRecipe',
          columns: 2,
          empty: 'No recipes yet.',
          reloadAfter: ['generate'],
        });
        return switchSpecView(next, 'create');
      });
      setActiveView('create');
    });
  };

  const applyHistoryPattern = () => {
    afterTemplate(() => {
      const viewId = viewIds.includes('history') ? 'history' : activeView;
      onUpdate((s) => {
        let next = switchSpecView(s, viewId);
        next = applyHistoryListPattern(next, {
          viewId,
          loadAction: 'listHistory',
          dataPath: 'recipes',
          onEnter: 'listHistory',
          onClickAction: 'reopenRecipe',
          columns: 2,
          empty: 'No recipes yet.',
          reloadAfter: ['generate'],
        });
        return next;
      });
    });
  };

  const addWidgetKind = (kind: string) => {
    getBuilderBridge()?.addWidget(kind);
  };

  const addPreset = (presetId: string) => {
    getBuilderBridge()?.addPreset(presetId);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 p-0.5 rounded-md bg-slate-950 border border-slate-800">
        <button
          type="button"
          onClick={() => onSubStepChange('template')}
          className={
            'flex-1 px-2 py-1.5 text-xs rounded transition-colors ' +
            (subStep === 'template'
              ? 'bg-violet-600 text-white font-medium'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800')
          }
        >
          1. Template
        </button>
        <button
          type="button"
          onClick={() => onSubStepChange('widgets')}
          disabled={!specHasPageWidgets(spec)}
          title={!specHasPageWidgets(spec) ? 'Pick a template first' : undefined}
          className={
            'flex-1 px-2 py-1.5 text-xs rounded transition-colors disabled:opacity-40 ' +
            (subStep === 'widgets'
              ? 'bg-blue-600 text-white font-medium'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800')
          }
        >
          2. Widgets
        </button>
      </div>

      {subStep === 'template' ? (
        <>
          <p className="text-xs text-slate-400 leading-relaxed">
            Choose a starting layout for the active tab. You can add more widgets in the next step.
          </p>
          {viewIds.length > 1 && (
            <>
              <label className="block text-xs text-slate-400">
                Active tab
                <select
                  className={`${INPUT} mt-1`}
                  value={activeView}
                  onChange={(e) => {
                    setActiveView(e.target.value);
                    onUpdate((s) => switchSpecView(s, e.target.value));
                  }}
                >
                  {viewIds.map((id) => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-slate-700 text-sm hover:bg-slate-800 text-left"
            onClick={applyCreatePattern}
          >
            <LayoutTemplate className="w-4 h-4 text-violet-400" />
            Form + errors + result
          </button>
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-amber-700/50 text-sm hover:bg-slate-800 text-left"
            onClick={applyCookbookAll}
          >
            <LayoutTemplate className="w-4 h-4 text-amber-400" />
            AI Cookbook — full Create + History
          </button>
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-slate-700 text-sm hover:bg-slate-800 text-left"
            onClick={applyHistoryPattern}
          >
            <LayoutTemplate className="w-4 h-4 text-violet-400" />
            History list
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-slate-400 leading-relaxed">
            Add presets or individual widgets to the canvas. Click a widget in the preview to edit it and link habits.
          </p>
          {selectedWidgetKind && (
            <p className="text-xs text-blue-300/90 bg-blue-950/40 border border-blue-900/50 rounded px-2 py-1.5">
              Selected: <code className="text-blue-200">{selectedWidgetKind}</code> — use Settings panel →
            </p>
          )}
          {viewIds.length > 1 && (
            <>
              <label className="block text-xs text-slate-400">
                Active tab
                <select
                  className={`${INPUT} mt-1`}
                  value={activeView}
                  onChange={(e) => {
                    setActiveView(e.target.value);
                    onUpdate((s) => switchSpecView(s, e.target.value));
                  }}
                >
                  {viewIds.map((id) => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-slate-400">
                On enter (when tab opens)
                <select
                  className={`${INPUT} mt-1`}
                  value={(() => {
                    const onEnter = spec.views?.[activeView]?.onEnter as string | undefined;
                    if (!onEnter) return '';
                    const action = spec.actions?.[onEnter] as Record<string, unknown> | undefined;
                    return habitIdFromEndpoint(action?.endpoint) ?? '';
                  })()}
                  onChange={(e) => {
                    const habitId = e.target.value;
                    if (!habitId) {
                      onUpdate((s) => {
                        const views = { ...s.views };
                        if (views[activeView]) {
                          const { onEnter: _, ...rest } = views[activeView] as Record<string, unknown>;
                          views[activeView] = rest;
                        }
                        return { ...s, views };
                      });
                      return;
                    }
                    const actionId = defaultActionIdForHabit(habitId);
                    onUpdate((s) => {
                      let next = linkHabitToAction(s, actionId, habitId, 'load');
                      const views = { ...(next.views ?? {}) };
                      views[activeView] = { ...(views[activeView] ?? {}), onEnter: actionId };
                      return { ...next, views };
                    });
                  }}
                >
                  <option value="">— none —</option>
                  {linkableHabits.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name ? `${h.name} (${h.id})` : h.id}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <div className="border border-slate-800 rounded-md overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 bg-slate-950"
              onClick={() => setExpandedCats((s) => ({ ...s, Presets: !s.Presets }))}
            >
              {expandedCats.Presets ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <LayoutTemplate className="w-3.5 h-3.5 text-violet-400" />
              Presets
            </button>
            {expandedCats.Presets && (
              <div className="max-h-36 overflow-y-auto border-t border-slate-800">
                {WIDGET_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => addPreset(preset.id)}
                    className="w-full flex items-start gap-2 px-3 py-2 text-left text-xs hover:bg-slate-800 border-b border-slate-800/60 last:border-b-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <span className="text-slate-200 block">{preset.label}</span>
                      <span className="text-slate-500">{preset.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border border-slate-800 rounded-md overflow-hidden">
            <div className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-slate-300 bg-slate-950 border-b border-slate-800">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              Widgets
            </div>
            <div className="max-h-52 overflow-y-auto">
              {WIZARD_WIDGET_CATEGORIES.map((cat) => {
                const items = WIZARD_WIDGET_LIST.filter((w) => w.category === cat);
                const open = expandedCats[cat];
                return (
                  <div key={cat} className="border-b border-slate-800/60 last:border-b-0">
                    <button
                      type="button"
                      className="w-full flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-slate-400 hover:bg-slate-800"
                      onClick={() => setExpandedCats((s) => ({ ...s, [cat]: !s[cat] }))}
                    >
                      {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      {cat}
                    </button>
                    {open &&
                      items.map((w) => (
                        <button
                          key={w.kind}
                          type="button"
                          onClick={() => addWidgetKind(w.kind)}
                          className="w-full flex items-center gap-2 pl-6 pr-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 text-left"
                        >
                          <Plus className="w-3 h-3 text-slate-500" />
                          {w.label}
                        </button>
                      ))}
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-slate-500 pt-1">
            Form fields: {getFormFieldNames(spec).join(', ') || 'none yet'}
          </p>
        </>
      )}
    </div>
  );
}


export default UiSpecWizard;
