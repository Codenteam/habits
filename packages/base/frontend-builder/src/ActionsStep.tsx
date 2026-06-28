/**
 * Combined Actions wizard step — habit actions, body mapping, handlers, triggers.
 */
import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';
import type { SpecState } from './uiSpecYaml';
import type { HabitOption } from './actionLinking';
import { habitIdFromEndpoint } from './actionLinking';
import { getFormFieldNames } from './inferState';
import {
  assignActionToTrigger,
  displayBodyValue,
  ensureActionForHabit,
  findActionIdForHabit,
  findTriggersForAction,
  habitInputsFor,
  listTriggerOptions,
  objectToKvList,
  updateActionBody,
  updateActionHandlerSet,
} from './actionConfig';

const INPUT =
  'w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none';

const VALUE_INPUT =
  'w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none min-h-[36px] resize-y';

type HandlerTab = 'onSuccess' | 'onError';

export function ActionsStep({
  spec,
  linkableHabits,
  onUpdate,
}: {
  spec: SpecState;
  linkableHabits: HabitOption[];
  onUpdate: (patch: (s: SpecState) => SpecState) => void;
}) {
  const formFields = useMemo(() => getFormFieldNames(spec), [spec]);
  const triggerOptions = useMemo(() => listTriggerOptions(spec), [spec]);

  const habitActionPairs = useMemo(() => {
    const pairs: Array<{ habitId: string; actionId: string; label: string }> = [];
    for (const h of linkableHabits) {
      const actionId = findActionIdForHabit(spec, h.id) ?? h.id;
      pairs.push({
        habitId: h.id,
        actionId,
        label: h.name ? `${h.name} (${h.id})` : h.id,
      });
    }
    return pairs;
  }, [linkableHabits, spec]);

  const [selectedHabitId, setSelectedHabitId] = useState(
    () => linkableHabits[0]?.id ?? '',
  );
  const [handlerTab, setHandlerTab] = useState<HandlerTab>('onSuccess');

  useEffect(() => {
    if (!selectedHabitId || linkableHabits.length === 0) return;
    onUpdate((s) => {
      if (findActionIdForHabit(s, selectedHabitId)) return s;
      return ensureActionForHabit(s, selectedHabitId, linkableHabits).spec;
    });
  }, [selectedHabitId, linkableHabits, onUpdate]);

  const selectedPair = habitActionPairs.find((p) => p.habitId === selectedHabitId);
  const actionId = selectedPair?.actionId ?? '';
  const action = (spec.actions[actionId] ?? {}) as Record<string, unknown>;
  const habitInputs = habitInputsFor(selectedHabitId, linkableHabits);

  const bodyRows = useMemo(() => {
    const body =
      action.body && typeof action.body === 'object' && !Array.isArray(action.body)
        ? (action.body as Record<string, unknown>)
        : {};
    const keys = new Set([...habitInputs, ...Object.keys(body)]);
    return [...keys].map((key) => ({
      key,
      value: displayBodyValue(String(body[key] ?? '')),
    }));
  }, [action.body, habitInputs]);

  const onSuccess = (action.onSuccess ?? {}) as Record<string, unknown>;
  const onError = (action.onError ?? {}) as Record<string, unknown>;
  const successRows = objectToKvList(onSuccess.set as Record<string, unknown>);
  const errorRows = objectToKvList(onError.set as Record<string, unknown>);
  const wiredTriggers = actionId ? findTriggersForAction(spec, actionId) : [];

  const selectHabit = (habitId: string) => {
    setSelectedHabitId(habitId);
    onUpdate((s) => ensureActionForHabit(s, habitId, linkableHabits).spec);
  };

  const suggestionId = `action-body-suggestions-${actionId}`;

  if (linkableHabits.length === 0) {
    return (
      <p className="text-xs text-amber-400/90 border border-amber-900/40 rounded p-2 bg-amber-950/20">
        No habits with workflows yet. Open workflow YAML from the sidebar in Logic, then return here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400 leading-relaxed">
        Each habit is an action. Map form fields to the request body, configure success/error handling,
        and choose what triggers the call.
      </p>

      <label className="block text-xs text-slate-400">
        Action (habit)
        <select
          className={`${INPUT} mt-1`}
          value={selectedHabitId}
          onChange={(e) => selectHabit(e.target.value)}
        >
          {habitActionPairs.map((p) => (
            <option key={p.habitId} value={p.habitId}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      {actionId && (
        <>
          <div className="text-[10px] text-slate-500 font-mono">
            action: {actionId} → {habitIdFromEndpoint(action.endpoint) ?? selectedHabitId}
          </div>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Request body
            </h3>
            <p className="text-[11px] text-slate-500">
              Keys come from the habit workflow. Enter a form field name or a full expression on the right.
            </p>
            <div className="rounded border border-slate-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-500 text-left">
                    <th className="px-2 py-1.5 font-medium w-[38%]">Key</th>
                    <th className="px-2 py-1.5 font-medium">Value</th>
                    <th className="w-7" />
                  </tr>
                </thead>
                <tbody>
                  {bodyRows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-2 py-2 text-slate-600 italic">
                        No inputs — add a row or declare habits.input.* in Logic
                      </td>
                    </tr>
                  )}
                  {bodyRows.map((row, i) => (
                    <tr key={`${row.key}-${i}`} className="border-t border-slate-800/80">
                      <td className="px-2 py-1 align-top">
                        <input
                          className={`${INPUT} font-mono text-xs`}
                          value={row.key}
                          onChange={(e) => {
                            const next = bodyRows.map((r, idx) =>
                              idx === i ? { ...r, key: e.target.value } : r,
                            );
                            onUpdate((s) => updateActionBody(s, actionId, next));
                          }}
                        />
                      </td>
                      <td className="px-2 py-1 align-top">
                        <input
                          className={`${VALUE_INPUT} font-mono text-xs`}
                          list={suggestionId}
                          value={row.value}
                          placeholder="fieldName or {{state.field}}"
                          onChange={(e) => {
                            const next = bodyRows.map((r, idx) =>
                              idx === i ? { ...r, value: e.target.value } : r,
                            );
                            onUpdate((s) => updateActionBody(s, actionId, next));
                          }}
                        />
                      </td>
                      <td className="px-1 py-1 align-top">
                        <button
                          type="button"
                          className="text-slate-500 hover:text-red-400 p-1"
                          onClick={() => {
                            const next = bodyRows.filter((_, idx) => idx !== i);
                            onUpdate((s) => updateActionBody(s, actionId, next));
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <datalist id={suggestionId}>
              {formFields.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
            <button
              type="button"
              className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
              onClick={() => {
                const next = [...bodyRows, { key: `field${bodyRows.length + 1}`, value: '' }];
                onUpdate((s) => updateActionBody(s, actionId, next));
              }}
            >
              <Plus className="w-3 h-3" /> Add input
            </button>
          </section>

          <section className="space-y-2">
            <div className="flex gap-1 p-0.5 rounded-md bg-slate-950 border border-slate-800">
              {(['onSuccess', 'onError'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setHandlerTab(tab)}
                  className={
                    'flex-1 px-2 py-1.5 text-xs rounded transition-colors ' +
                    (handlerTab === tab
                      ? tab === 'onSuccess'
                        ? 'bg-emerald-700 text-white font-medium'
                        : 'bg-red-900/80 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800')
                  }
                >
                  {tab === 'onSuccess' ? 'On success' : 'On error'}
                </button>
              ))}
            </div>

            {handlerTab === 'onSuccess' && (
              <HandlerSetTable
                rows={successRows}
                stateKeys={Object.keys(spec.state)}
                tone="success"
                toast={String(onSuccess.toast ?? '')}
                onToastChange={(toast) =>
                  onUpdate((s) =>
                    updateActionHandlerSet(s, actionId, 'onSuccess', successRows, toast),
                  )
                }
                onChange={(rows) =>
                  onUpdate((s) =>
                    updateActionHandlerSet(
                      s,
                      actionId,
                      'onSuccess',
                      rows,
                      String(onSuccess.toast ?? ''),
                    ),
                  )
                }
              />
            )}

            {handlerTab === 'onError' && (
              <HandlerSetTable
                rows={errorRows}
                stateKeys={Object.keys(spec.state)}
                tone="error"
                onChange={(rows) =>
                  onUpdate((s) => updateActionHandlerSet(s, actionId, 'onError', rows))
                }
              />
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-300">How to call this action</h3>
            <p className="text-[11px] text-slate-500">
              Pick a submit button, form, or other widget that should run this habit.
            </p>
            {wiredTriggers.length > 0 && (
              <ul className="text-[11px] text-emerald-400/90 space-y-0.5">
                {wiredTriggers.map((t) => (
                  <li key={t.id}>✓ {t.label}</li>
                ))}
              </ul>
            )}
            <select
              className={`${INPUT} text-xs`}
              defaultValue=""
              onChange={(e) => {
                const opt = triggerOptions.find((o) => o.id === e.target.value);
                if (!opt) return;
                onUpdate((s) => assignActionToTrigger(s, actionId, opt.ref));
                e.target.value = '';
              }}
            >
              <option value="">Connect to widget…</option>
              {triggerOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                  {t.currentActionId && t.currentActionId !== actionId
                    ? ` (currently: ${t.currentActionId})`
                    : ''}
                </option>
              ))}
            </select>
          </section>
        </>
      )}
    </div>
  );
}

function HandlerSetTable({
  rows,
  stateKeys,
  tone,
  toast,
  onToastChange,
  onChange,
}: {
  rows: Array<{ key: string; value: string }>;
  stateKeys: string[];
  tone: 'success' | 'error';
  toast?: string;
  onToastChange?: (toast: string) => void;
  onChange: (rows: Array<{ key: string; value: string }>) => void;
}) {
  const suggestionId = `handler-${tone}-suggestions`;
  const presets =
    tone === 'success'
      ? ['$response', 'null', ...stateKeys]
      : ['$error.message', 'null', ...stateKeys];

  return (
    <div
      className={
        'rounded border p-2.5 space-y-2 ' +
        (tone === 'success'
          ? 'border-emerald-900/40 bg-emerald-950/20'
          : 'border-red-900/30 bg-red-950/15')
      }
    >
      <p className="text-[11px] text-slate-500">
        Update app state when the action {tone === 'success' ? 'succeeds' : 'fails'}.
      </p>
      {onToastChange && (
        <label className="block text-[11px] text-slate-400">
          Toast message
          <input
            className={`${INPUT} mt-1 text-xs`}
            value={toast ?? ''}
            placeholder="Optional notification"
            onChange={(e) => onToastChange(e.target.value)}
          />
        </label>
      )}
      <div className="rounded border border-slate-800 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-950 text-slate-500 text-left">
              <th className="px-2 py-1.5 font-medium w-[38%]">State key</th>
              <th className="px-2 py-1.5 font-medium">Set to</th>
              <th className="w-7" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-2 py-2 text-slate-600 italic">
                  No updates configured
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-slate-800/80">
                <td className="px-2 py-1">
                  <input
                    className={`${INPUT} font-mono text-xs`}
                    list={`${suggestionId}-keys`}
                    value={row.key}
                    placeholder="result"
                    onChange={(e) =>
                      onChange(rows.map((r, idx) => (idx === i ? { ...r, key: e.target.value } : r)))
                    }
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className={`${INPUT} font-mono text-xs`}
                    list={suggestionId}
                    value={row.value}
                    placeholder={tone === 'success' ? '$response' : '$error.message'}
                    onChange={(e) =>
                      onChange(rows.map((r, idx) => (idx === i ? { ...r, value: e.target.value } : r)))
                    }
                  />
                </td>
                <td className="px-1">
                  <button
                    type="button"
                    className="text-slate-500 hover:text-red-400 p-1"
                    onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <datalist id={suggestionId}>
        {presets.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <datalist id={`${suggestionId}-keys`}>
        {stateKeys.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
      <button
        type="button"
        className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
        onClick={() => onChange([...rows, { key: '', value: '' }])}
      >
        <Plus className="w-3 h-3" /> Add row
      </button>
    </div>
  );
}
