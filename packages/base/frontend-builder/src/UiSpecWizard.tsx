/**
 * Guided wizard for building index.yaml — linear steps + live canvas for tweaks.
 */
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef, type ComponentType, type ForwardedRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Wand2,
  LayoutTemplate,
  Layers,
  Plus,
  Trash2,
  RotateCcw,
  FileText,
  LayoutGrid,
  PanelLeft,
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
  validateLayoutStep,
  validatePagesContentStep,
  stepIndex,
  type WizardStepId,
} from './wizardSteps';
import {
  applyFormFeedbackResultPattern,
  applyHistoryListPattern,
  switchSpecView,
  type FormFieldDef,
} from './wizardPatterns';
import type { HabitOption } from './actionLinking';
import { ActionsStep } from './ActionsStep';
import { OverviewStep } from './OverviewStep';
import { WIDGET_PRESETS } from './uiSpecPresets';
import {
  WIZARD_WIDGET_CATEGORIES,
  WIZARD_WIDGET_LIST,
} from './wizardWidgetList';

type PagesPhase = 'layout' | 'build';

interface BuilderBridge {
  addWidget: (kind: string, parentUid?: string | null) => void;
  addPreset: (presetId: string, parentUid?: string | null) => void;
}

function getBuilderBridge(): BuilderBridge | null {
  return (window as unknown as { __HA_BUILDER_BRIDGE__?: BuilderBridge }).__HA_BUILDER_BRIDGE__ ?? null;
}

function viewHasWidgets(spec: SpecState, viewId: string): boolean {
  if (spec.views && Object.keys(spec.views).length > 0) {
    const raw = spec.views[viewId]?.widgets;
    return Array.isArray(raw) && raw.length > 0;
  }
  return spec.widgets.length > 0;
}

function getTabLabel(spec: SpecState, viewId: string): string {
  return spec.layout.nav?.find((n) => n.id === viewId)?.label ?? viewId;
}

function clearViewWidgets(spec: SpecState, viewId: string): SpecState {
  let next = switchSpecView(spec, viewId);
  if (next.views && Object.keys(next.views).length > 0) {
    return {
      ...next,
      widgets: [],
      views: {
        ...next.views,
        [viewId]: { ...(next.views[viewId] ?? {}), widgets: [] },
      },
    };
  }
  return { ...next, widgets: [] };
}

function applyLayoutType(
  spec: SpecState,
  type: SpecState['layout']['type'],
): SpecState {
  if (type === 'single') {
    return {
      ...spec,
      layout: { ...spec.layout, type, nav: undefined },
      views: undefined,
      defaultView: undefined,
      activeViewId: undefined,
      widgets: spec.views ? [] : spec.widgets,
    };
  }
  const nav = spec.layout.nav?.length
    ? spec.layout.nav
    : [
        { id: 'main', label: 'Main', icon: 'lucide:Sparkles' },
        { id: 'history', label: 'History', icon: 'lucide:FolderOpen' },
      ];
  const views: Record<string, Record<string, unknown>> = { ...(spec.views ?? {}) };
  for (const item of nav) {
    if (!views[item.id]) views[item.id] = { widgets: [] };
  }
  return {
    ...spec,
    layout: {
      ...spec.layout,
      type,
      header: spec.layout.header ?? {
        title: spec.meta.title,
        subtitle: spec.meta.subtitle,
        icon: spec.meta.icon,
      },
      nav,
    },
    views,
    defaultView: spec.defaultView && nav.some((n) => n.id === spec.defaultView)
      ? spec.defaultView
      : nav[0]?.id,
    widgets: [],
    activeViewId: nav[0]?.id,
  };
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

function patchLayoutNav(
  spec: SpecState,
  nav: Array<{ id: string; label?: string; icon?: string }>,
): SpecState {
  const navIds = new Set(nav.map((n) => n.id).filter(Boolean));
  const views: Record<string, Record<string, unknown>> = { ...(spec.views ?? {}) };
  for (const item of nav) {
    if (!item.id) continue;
    if (!views[item.id]) views[item.id] = { widgets: [] };
  }
  for (const id of Object.keys(views)) {
    if (!navIds.has(id)) delete views[id];
  }
  const defaultView =
    spec.defaultView && navIds.has(spec.defaultView) ? spec.defaultView : nav[0]?.id;
  return {
    ...spec,
    layout: { ...spec.layout, nav },
    views,
    defaultView,
  };
}

export interface UiSpecWizardProps extends Omit<UiSpecBuilderProps, 'onChange'> {
  onChange: (yaml: string) => void;
  /** Increment when frontend YAML is loaded externally (import/open/reset). */
  loadRevision?: number;
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
  loadRevision = 0,
  height = '100%',
  defaultMetaId,
  defaultMetaTitle,
  compilePreviewHtml,
  linkableHabits = [],
  showDebugYaml = false,
}: UiSpecWizardProps) {
  const [step, setStep] = useState<WizardStepId>(() => initialWizardStep(initialYaml ?? ''));
  const [yamlText, setYamlText] = useState(initialYaml ?? '');
  const yamlTextRef = useRef(yamlText);
  yamlTextRef.current = yamlText;
  const lastLoadRevisionRef = useRef(loadRevision);
  const [builderKey, setBuilderKey] = useState(0);
  const [manualStateKeys] = useState(() => new Set<string>());
  const [selectedWidgetKind, setSelectedWidgetKind] = useState<string | null>(null);
  const [pagesWidgetsMode, setPagesWidgetsMode] = useState(false);
  const [pagesPhase, setPagesPhase] = useState<PagesPhase>('layout');
  /** Tab currently being built in PagesStep — drives the builder preview active view. */
  const [editingViewId, setEditingViewId] = useState<string | undefined>(undefined);
  const pagesStepRef = useRef<PagesStepHandle>(null);

  // Reload when a stack is opened/imported/reset — not on wizard self-edits echoed from Redux.
  useEffect(() => {
    if (loadRevision === lastLoadRevisionRef.current) return;
    lastLoadRevisionRef.current = loadRevision;
    const next = initialYaml ?? '';
    setYamlText(next);
    setStep(initialWizardStep(next));
    setSelectedWidgetKind(null);
    setPagesWidgetsMode(false);
    setPagesPhase('layout');
    setBuilderKey((k) => k + 1);
  }, [loadRevision, initialYaml]);

  useEffect(() => {
    if (step !== 'pages' || pagesPhase !== 'build') {
      setPagesWidgetsMode(false);
      setEditingViewId(undefined);
    }
  }, [step, pagesPhase]);

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

  const ctx = useMemo(
    () => ({ linkableHabitIds, linkableHabits }),
    [linkableHabitIds, linkableHabits],
  );
  const validation =
    step === 'pages'
      ? pagesPhase === 'layout'
        ? validateLayoutStep(spec)
        : validatePagesContentStep(spec)
      : canAdvanceStep(step, spec, ctx);
  const currentStepDef = WIZARD_STEPS.find((s) => s.id === step)!;
  const stepDescription =
    step === 'pages'
      ? pagesPhase === 'layout'
        ? 'Choose how your app is organized'
        : spec.layout.type === 'single'
          ? 'Choose a template or build from scratch, then add widgets'
          : 'Add tabs, then select one to build its content'
      : currentStepDef.description;
  const showCanvas = currentStepDef.showCanvas;
  const overviewMode = currentStepDef.fullBuilder === true;
  const pagesBackDisabled = step === 'pages' && pagesPhase === 'layout' && !prevStep(step);

  const goNext = () => {
    const n = nextStep(step);
    if (n && validation.ok) setStep(n);
  };
  const goBack = () => {
    if (step === 'pages' && pagesPhase === 'build') {
      if (pagesStepRef.current?.wizardBack()) return;
      setPagesPhase('layout');
      setPagesWidgetsMode(false);
      return;
    }
    const p = prevStep(step);
    if (p) {
      setStep(p);
      if (p === 'pages') setPagesPhase('build');
    }
  };

  const handleStepClick = (id: WizardStepId) => {
    const fromIndex = stepIndex(step);
    const toIndex = stepIndex(id);
    setStep(id);
    if (id === 'pages' && id !== step) {
      setPagesPhase(toIndex < fromIndex ? 'build' : 'layout');
    }
  };

  const handleResetUi = useCallback(() => {
    const alreadyFresh = !yamlText.trim() && step === 'identity';
    if (!alreadyFresh) {
      const confirmed = window.confirm(
        'Reset the UI?\n\n' +
          'This deletes all pages, widgets, actions, and layout — and returns you to the Identity step.',
      );
      if (!confirmed) return;
    }
    setYamlText('');
    onChange('');
    setStep('identity');
    setPagesPhase('layout');
    setSelectedWidgetKind(null);
    setBuilderKey((k) => k + 1);
  }, [yamlText, step, onChange]);

  const resetUiDisabled = !yamlText.trim() && step === 'identity';

  return (
    <div
      className="flex flex-col bg-slate-950 text-slate-100"
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <WizardHeader
        step={step}
        onStepClick={handleStepClick}
        onReset={handleResetUi}
        resetDisabled={resetUiDisabled}
      />

      <div className="flex flex-1 min-h-0 flex-col">
        <div className="flex flex-1 min-h-0">
        <aside
          className={
            (overviewMode || step === 'actions' ? 'w-[400px]' : 'w-[340px]') +
            ' flex-shrink-0 border-r border-slate-800 bg-slate-900 flex flex-col min-h-0'
          }
        >
          <div className="px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-100">{currentStepDef.label}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{stepDescription}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {step === 'identity' && (
              <IdentityStep spec={spec} onUpdate={updateSpec} />
            )}
            {step === 'pages' && pagesPhase === 'layout' && (
              <LayoutStep
                spec={spec}
                onUpdate={updateSpec}
                onLayoutChosen={() => setPagesPhase('build')}
              />
            )}
            {step === 'pages' && pagesPhase === 'build' && (
              <PagesStep
                ref={pagesStepRef}
                spec={spec}
                selectedWidgetKind={selectedWidgetKind}
                onUpdate={updateSpec}
                onWidgetsModeChange={setPagesWidgetsMode}
                onEditingViewChange={setEditingViewId}
                onBackToLayout={() => {
                  setPagesPhase('layout');
                  setPagesWidgetsMode(false);
                }}
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
              disabled={pagesBackDisabled}
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            {!validation.ok && (
              <span className="text-xs text-amber-400 flex-1 text-center truncate" title={validation.reason}>
                {validation.reason}
              </span>
            )}
            {step !== 'overview' && !(step === 'pages' && pagesPhase === 'layout') ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
                onClick={goNext}
                disabled={!validation.ok}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </aside>

        {/* Canvas + builder */}
        {showCanvas ? (
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            <UiSpecBuilderVanilla
              key={builderKey}
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
              showWidgetCanvas={overviewMode || (step === 'pages' && pagesPhase === 'build' && pagesWidgetsMode)}
              activeViewId={
                step === 'pages' && pagesPhase === 'build' ? editingViewId : undefined
              }
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
  onReset,
  resetDisabled,
}: {
  step: WizardStepId;
  onStepClick: (id: WizardStepId) => void;
  onReset: () => void;
  resetDisabled?: boolean;
}) {
  return (
    <div className="flex-shrink-0 border-b border-slate-800 bg-slate-900 px-4 py-2">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Sparkles className="w-4 h-4 text-amber-400" />
          UI Wizard
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={resetDisabled}
          title="Delete all UI content and start over from Identity"
          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-slate-700 text-slate-400 hover:text-red-300 hover:border-red-800/60 hover:bg-red-950/30 disabled:opacity-40 disabled:pointer-events-none"
        >
          <RotateCcw className="w-3 h-3" />
          Reset UI
        </button>
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

const LAYOUT_OPTIONS: Array<{
  type: SpecState['layout']['type'];
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    type: 'single',
    label: 'Single page',
    description: 'One screen — go straight to building content',
    icon: FileText,
  },
  {
    type: 'tabs',
    label: 'Tabs',
    description: 'Top navigation — add tabs, then build each one',
    icon: LayoutGrid,
  },
  {
    type: 'sidebar',
    label: 'Sidebar',
    description: 'Side navigation — add tabs, then build each one',
    icon: PanelLeft,
  },
];

function LayoutStep({
  spec,
  onUpdate,
  onLayoutChosen,
}: {
  spec: SpecState;
  onUpdate: (patch: (s: SpecState) => SpecState) => void;
  onLayoutChosen: () => void;
}) {
  const chooseLayout = (type: SpecState['layout']['type']) => {
    onUpdate((s) => applyLayoutType(s, type));
    onLayoutChosen();
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400 leading-relaxed">
        How should users move between sections of your app?
      </p>
      {LAYOUT_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = spec.layout.type === opt.type;
        return (
          <button
            key={opt.type}
            type="button"
            onClick={() => chooseLayout(opt.type)}
            className={
              'w-full flex items-start gap-3 px-4 py-3 rounded-lg border text-left transition-colors ' +
              (active
                ? 'border-blue-600 bg-blue-950/40 hover:bg-blue-950/60'
                : 'border-slate-700 bg-slate-950 hover:bg-slate-800 hover:border-slate-600')
            }
          >
            <Icon className={'w-5 h-5 shrink-0 mt-0.5 ' + (active ? 'text-blue-400' : 'text-slate-400')} />
            <span>
              <span className="text-sm font-medium text-slate-100 block">{opt.label}</span>
              <span className="text-xs text-slate-500 mt-0.5 block">{opt.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export interface PagesStepHandle {
  wizardBack: () => boolean;
}

const PagesStep = forwardRef(function PagesStep(
  {
    spec,
    selectedWidgetKind,
    onUpdate,
    onWidgetsModeChange,
    onEditingViewChange,
    onBackToLayout,
  }: {
    spec: SpecState;
    selectedWidgetKind: string | null;
    onUpdate: (patch: (s: SpecState) => SpecState) => void;
    onWidgetsModeChange?: (active: boolean) => void;
    /** Notify parent which tab is being edited so the live preview can switch. */
    onEditingViewChange?: (viewId: string | undefined) => void;
    onBackToLayout?: () => void;
  },
  ref: ForwardedRef<PagesStepHandle>,
) {
  const hasMultipleTabs = spec.layout.type === 'tabs' || spec.layout.type === 'sidebar';
  const nav = spec.layout.nav ?? [];
  const viewIds = hasMultipleTabs
    ? nav.map((n) => n.id)
    : (spec.views ? Object.keys(spec.views) : ['main']);

  const [selectedTabId, setSelectedTabId] = useState<string | null>(() =>
    hasMultipleTabs ? null : (viewIds[0] ?? 'main'),
  );
  const [startedBlank, setStartedBlank] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>(() =>
    Object.fromEntries([
      ['Presets', true],
      ...WIZARD_WIDGET_CATEGORIES.map((c) => [c, c === 'Layout' || c === 'Forms']),
    ]),
  );

  const effectiveViewId = selectedTabId ?? viewIds[0] ?? 'main';
  const tabHasContent = viewHasWidgets(spec, effectiveViewId);
  const showTabList = hasMultipleTabs && selectedTabId === null;
  const showTemplate = !showTabList && !tabHasContent && !startedBlank;
  const showWidgets = !showTabList && (tabHasContent || startedBlank);

  useEffect(() => {
    onWidgetsModeChange?.(showWidgets);
  }, [showWidgets, onWidgetsModeChange]);

  useEffect(() => {
    // Only drive the preview while a specific tab is open (not the tab-list screen).
    onEditingViewChange?.(selectedTabId ?? undefined);
  }, [selectedTabId, onEditingViewChange]);

  useEffect(() => {
    if (!hasMultipleTabs) {
      setSelectedTabId(viewIds[0] ?? 'main');
    }
  }, [hasMultipleTabs, viewIds]);

  const selectTab = (viewId: string) => {
    setSelectedTabId(viewId);
    setStartedBlank(false);
    onEditingViewChange?.(viewId);
    onUpdate((s) => switchSpecView(s, viewId));
  };

  const backToTabList = () => {
    setSelectedTabId(null);
    setStartedBlank(false);
    onEditingViewChange?.(undefined);
  };

  useImperativeHandle(ref, () => ({
    wizardBack() {
      if (hasMultipleTabs && selectedTabId !== null) {
        backToTabList();
        return true;
      }
      return false;
    },
  }), [hasMultipleTabs, selectedTabId]);

  const startFromScratch = () => {
    setStartedBlank(true);
    onUpdate((s) => switchSpecView(s, effectiveViewId));
  };

  const afterTemplate = (fn: () => void) => {
    fn();
    setStartedBlank(false);
  };

  const applyCreatePattern = () => {
    afterTemplate(() => {
      const fields: FormFieldDef[] = [
        { name: 'input', type: 'text', label: 'Input', required: true },
      ];
      onUpdate((s) => {
        let next = switchSpecView(s, effectiveViewId);
        next = applyFormFeedbackResultPattern(next, {
          viewId: effectiveViewId,
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

  const applyHistoryPattern = () => {
    afterTemplate(() => {
      const viewId = viewIds.includes('history') ? 'history' : effectiveViewId;
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
      if (viewId !== selectedTabId) {
        setSelectedTabId(viewId);
        setStartedBlank(false);
      }
    });
  };

  const resetTab = () => {
    const label = getTabLabel(spec, effectiveViewId);
    if (!window.confirm(`Reset "${label}"? All widgets on this tab will be removed.`)) return;
    setStartedBlank(false);
    onUpdate((s) => clearViewWidgets(s, effectiveViewId));
  };

  const addWidgetKind = (kind: string) => {
    getBuilderBridge()?.addWidget(kind);
  };

  const addPreset = (presetId: string) => {
    getBuilderBridge()?.addPreset(presetId);
  };

  return (
    <div className="space-y-3">
      {!hasMultipleTabs && (
        <button
          type="button"
          onClick={onBackToLayout}
          className="w-full flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 text-left"
        >
          <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
          Change app layout
        </button>
      )}

      {hasMultipleTabs && selectedTabId !== null && (
        <button
          type="button"
          onClick={backToTabList}
          className="w-full flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 text-left"
        >
          <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
          You are editing <span className="font-medium text-slate-200">{getTabLabel(spec, selectedTabId)}</span>
        </button>
      )}

      {showTabList && (
        <>
          <button
            type="button"
            onClick={onBackToLayout}
            className="w-full flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 text-left"
          >
            <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
            Change app layout
          </button>
          <p className="text-xs text-slate-400 leading-relaxed">
            Name your tabs, add or remove them, then select one to build its content.
          </p>
          <div className="space-y-3">
            {nav.map((item, i) => {
              const filled = viewHasWidgets(spec, item.id);
              return (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      className={`${INPUT} flex-1 text-sm`}
                      value={item.label ?? ''}
                      placeholder="Tab name"
                      onChange={(e) => {
                        const next = nav.map((n, idx) =>
                          idx === i ? { ...n, label: e.target.value } : n,
                        );
                        onUpdate((s) => patchLayoutNav(s, next));
                      }}
                    />
                    <button
                      type="button"
                      className="shrink-0 p-2 rounded-md border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-900/50 disabled:opacity-30"
                      title="Remove tab"
                      aria-label="Remove tab"
                      disabled={nav.length <= 1}
                      onClick={() => onUpdate((s) => patchLayoutNav(s, nav.filter((_, idx) => idx !== i)))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectTab(item.id)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 hover:border-slate-600 text-left transition-colors"
                  >
                    <span className="text-sm text-slate-200">
                      {filled ? 'Edit content' : 'Build this tab'}
                    </span>
                    <span
                      className={
                        'text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ' +
                        (filled
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50'
                          : 'bg-slate-800 text-slate-500 border border-slate-700')
                      }
                    >
                      {filled ? 'Has content' : 'Empty'}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md border border-dashed border-slate-600 text-slate-300 hover:bg-slate-800 hover:border-slate-500"
            onClick={() => {
              const next = [...nav, { id: `tab-${nav.length + 1}`, label: `Tab ${nav.length + 1}` }];
              onUpdate((s) => patchLayoutNav(s, next));
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add tab
          </button>
        </>
      )}

      {showTemplate && (
        <>
          <p className="text-xs text-slate-400 leading-relaxed">
            Select a template to get started, or build from scratch with individual widgets.
          </p>
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md border border-slate-700 text-sm hover:bg-slate-800 text-left"
            onClick={applyCreatePattern}
          >
            <LayoutTemplate className="w-4 h-4 text-violet-400 shrink-0" />
            Form + errors + result
          </button>
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md border border-slate-700 text-sm hover:bg-slate-800 text-left"
            onClick={applyHistoryPattern}
          >
            <LayoutTemplate className="w-4 h-4 text-violet-400 shrink-0" />
            History list
          </button>
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md border border-dashed border-slate-600 text-sm hover:bg-slate-800 text-left text-slate-300"
            onClick={startFromScratch}
          >
            <Wand2 className="w-4 h-4 text-slate-400 shrink-0" />
            Start from scratch
          </button>
        </>
      )}

      {showWidgets && (
        <>
          {tabHasContent && (
            <button
              type="button"
              onClick={resetTab}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-red-900/50 text-red-400 hover:bg-red-950/30 hover:border-red-800/60"
            >
              <RotateCcw className="w-3 h-3" />
              Reset this tab
            </button>
          )}
          <p className="text-xs text-slate-400 leading-relaxed">
            Add presets or individual widgets to the canvas. Click a widget in the preview to edit it.
          </p>
          {selectedWidgetKind && (
            <p className="text-xs text-blue-300/90 bg-blue-950/40 border border-blue-900/50 rounded px-2 py-1.5">
              Selected: <code className="text-blue-200">{selectedWidgetKind}</code> — use Settings panel →
            </p>
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
              <div className="border-t border-slate-800">
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
            <div>
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
});


export default UiSpecWizard;
