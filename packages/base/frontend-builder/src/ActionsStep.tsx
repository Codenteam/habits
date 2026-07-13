/**
 * Simplified Actions wizard step — guided flow for non-technical users.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { SpecState } from './uiSpecYaml';
import type { HabitOption } from './actionLinking';
import {
  assignActionToTrigger,
  ensureActionForHabit,
  findActionIdForHabit,
  listTriggerOptions,
} from './actionConfig';
import {
  applyBodyMapping,
  applySimpleActionOutcome,
  describeActionInPlainEnglish,
  ensureAutoMatchedActions,
  friendlyTriggerLabel,
  getBodyMappingFromAction,
  getFormFieldsWithLabels,
  humanizeFieldName,
  listDisplayWidgets,
  readSimpleActionOutcome,
  resolveBodyMapping,
  unmatchedHabitInputs,
  type SimpleActionOutcome,
} from './actionSimpleMode';
import { ActionsAdvanced } from './ActionsAdvanced';

const INPUT =
  'w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none';

export function ActionsStep({
  spec,
  linkableHabits,
  onUpdate,
}: {
  spec: SpecState;
  linkableHabits: HabitOption[];
  onUpdate: (patch: (s: SpecState) => SpecState) => void;
}) {
  // Only re-ensure actions when the habit catalog changes — not when the builder
  // emits YAML (which used to recreate `onUpdate` and clear widget selection).
  // Form↔habit mapping is resolved live in HabitActionCard via resolveBodyMapping.
  const habitsKey = linkableHabits
    .map((h) => `${h.id}:${(h.inputs ?? []).join(',')}`)
    .join('|');
  const linkableHabitsRef = useRef(linkableHabits);
  linkableHabitsRef.current = linkableHabits;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const habits = linkableHabitsRef.current;
    if (habits.length === 0) return;
    onUpdateRef.current((s) => {
      let next = s;
      for (const h of habits) {
        if (!findActionIdForHabit(next, h.id)) {
          next = ensureActionForHabit(next, h.id, habits).spec;
        }
      }
      next = ensureAutoMatchedActions(next, habits);
      return next === s ? s : next;
    });
  }, [habitsKey]);

  if (linkableHabits.length === 0) {
    return (
      <p className="text-xs text-amber-400/90 border border-amber-900/40 rounded p-2 bg-amber-950/20">
        Add a workflow in the Logic tab first, then come back here to connect your form.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400 leading-relaxed">
        Connect each workflow to your page: what starts it, what data it receives, and what users see
        afterwards.
      </p>

      {linkableHabits.map((habit) => (
        <HabitActionCard key={habit.id} spec={spec} habit={habit} onUpdate={onUpdate} />
      ))}

      <ActionsAdvanced spec={spec} linkableHabits={linkableHabits} onUpdate={onUpdate} />
    </div>
  );
}

function HabitActionCard({
  spec,
  habit,
  onUpdate,
}: {
  spec: SpecState;
  habit: HabitOption;
  onUpdate: (patch: (s: SpecState) => SpecState) => void;
}) {
  const actionId = findActionIdForHabit(spec, habit.id) ?? '';
  const habitInputs = habit.inputs ?? [];
  const formFields = useMemo(() => getFormFieldsWithLabels(spec), [spec]);
  const friendlyTriggers = useMemo(
    () =>
      listTriggerOptions(spec)
        .filter(
          (o) =>
            o.ref.propPath === 'submit.action' ||
            o.ref.propPath === 'action' ||
            o.ref.propPath === 'onEnter',
        )
        .map((o) => ({ ...o, friendly: friendlyTriggerLabel(o, spec) })),
    [spec],
  );
  const displayWidgets = useMemo(() => listDisplayWidgets(spec), [spec]);
  // Resolve from the same list the <select> renders so value always matches an option id.
  const selectedTrigger = useMemo(() => {
    if (!actionId) return null;
    return friendlyTriggers.find((t) => t.currentActionId === actionId) ?? null;
  }, [friendlyTriggers, actionId]);

  const mapping = useMemo(() => {
    const existing = getBodyMappingFromAction(spec, actionId, habitInputs);
    return resolveBodyMapping(habitInputs, formFields, existing);
  }, [spec, actionId, habitInputs, formFields]);

  const unmatched = unmatchedHabitInputs(habitInputs, mapping, formFields);
  const outcome = actionId ? readSimpleActionOutcome(spec, actionId) : null;

  const [localOutcome, setLocalOutcome] = useState<SimpleActionOutcome | null>(null);
  const effectiveOutcome = localOutcome ?? outcome;

  const summary =
    actionId && effectiveOutcome
      ? describeActionInPlainEnglish(
          spec,
          habit.id,
          actionId,
          habit.name,
          habitInputs,
          mapping,
          effectiveOutcome,
        )
      : '';

  const setMapping = (input: string, formFieldName: string) => {
    if (!actionId) return;
    const next = { ...mapping, [input]: formFieldName };
    onUpdate((s) => applyBodyMapping(s, actionId, habitInputs, next));
  };

  const setOutcome = (patch: Partial<SimpleActionOutcome>) => {
    if (!actionId || !effectiveOutcome) return;
    const next = { ...effectiveOutcome, ...patch };
    setLocalOutcome(next);
    onUpdate((s) =>
      applySimpleActionOutcome(s, actionId, {
        showToast: next.showToast,
        toastMessage: next.toastMessage,
        showResult: next.showResult,
        resultWidgetId: next.resultWidgetId === 'add' ? 'add' : next.resultWidgetId,
        showErrors: next.showErrors,
      }),
    );
  };

  const wireTrigger = (optionId: string) => {
    if (!actionId) return;
    const opt = friendlyTriggers.find((o) => o.id === optionId);
    if (!opt) return;
    onUpdate((s) => assignActionToTrigger(s, actionId, opt.ref));
  };

  const workflowTitle = habit.name ?? humanizeFieldName(habit.id);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-4">
      <h3 className="text-sm font-semibold text-slate-100">{workflowTitle}</h3>

      {/* 1. When */}
      <section className="space-y-1.5">
        <label className="block text-xs text-slate-300">When should this run?</label>
        <p className="text-[11px] text-slate-500">
          Pick a button, submit control, or tab that starts this workflow.
        </p>
        {selectedTrigger && (
          <p className="text-[11px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Connected: {selectedTrigger.friendly}
          </p>
        )}
        <select
          className={`${INPUT} text-xs`}
          value={selectedTrigger?.id ?? ''}
          onChange={(e) => wireTrigger(e.target.value)}
        >
          <option value="">Choose a trigger…</option>
          {friendlyTriggers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.friendly}
            </option>
          ))}
        </select>
      </section>

      {/* 2. What data */}
      <section className="space-y-1.5">
        <label className="block text-xs text-slate-300">What information gets sent?</label>
        <p className="text-[11px] text-slate-500">
          Match each workflow field to a form field from your page.
        </p>
        {unmatched.length > 0 && (
          <p className="text-[11px] text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            {unmatched.length} field{unmatched.length === 1 ? '' : 's'} still need a form field
          </p>
        )}
        {habitInputs.length === 0 ? (
          <p className="text-[11px] text-slate-600 italic">
            This workflow has no input fields yet (add habits.input.* in Logic).
          </p>
        ) : (
          <div className="space-y-2">
            {habitInputs.map((input) => (
              <div key={input} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-[42%] flex-shrink-0 truncate" title={input}>
                  {humanizeFieldName(input)}
                </span>
                <span className="text-slate-600 text-xs">→</span>
                <select
                  className={`${INPUT} flex-1 text-xs`}
                  value={mapping[input] ?? ''}
                  onChange={(e) => setMapping(input, e.target.value)}
                >
                  <option value="">Choose form field…</option>
                  {formFields.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. What happens after */}
      {effectiveOutcome && (
        <section className="space-y-2">
          <label className="block text-xs text-slate-300">What happens after?</label>

          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={effectiveOutcome.showToast}
              onChange={(e) => setOutcome({ showToast: e.target.checked })}
            />
            Show a success message
          </label>
          {effectiveOutcome.showToast && (
            <input
              className={`${INPUT} text-xs`}
              value={effectiveOutcome.toastMessage}
              placeholder="e.g. Submitted successfully"
              onChange={(e) => setOutcome({ toastMessage: e.target.value, showToast: true })}
            />
          )}

          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={effectiveOutcome.showResult}
              onChange={(e) =>
                setOutcome({
                  showResult: e.target.checked,
                  resultWidgetId: e.target.checked ? effectiveOutcome.resultWidgetId : 'add',
                })
              }
            />
            Show the workflow result on screen
          </label>
          {effectiveOutcome.showResult && (
            <select
              className={`${INPUT} text-xs`}
              value={effectiveOutcome.resultWidgetId}
              onChange={(e) => setOutcome({ showResult: true, resultWidgetId: e.target.value })}
            >
              <option value="add">Add a result area (recommended)</option>
              {displayWidgets
                .filter((d) => d.kind === 'result-panel' || d.source?.includes('result'))
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
            </select>
          )}

          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={effectiveOutcome.showErrors}
              onChange={(e) => setOutcome({ showErrors: e.target.checked })}
            />
            Show an error message if something fails
          </label>
        </section>
      )}

      {/* 4. Summary */}
      {summary && (
        <div className="rounded border border-blue-900/40 bg-blue-950/20 px-3 py-2.5">
          <p className="text-[11px] font-medium text-blue-200/90 mb-1">Here&apos;s what happens</p>
          <p className="text-xs text-slate-300 leading-relaxed">
            <PlainSummary text={summary} />
          </p>
        </div>
      )}
    </div>
  );
}

/** Render **bold** markers from describeActionInPlainEnglish as styled spans. */
function PlainSummary({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="text-slate-100 font-medium">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
