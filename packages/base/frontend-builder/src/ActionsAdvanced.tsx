/**
 * Advanced action wiring — technical tables and state editor (collapsed by default).
 */
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, Zap } from 'lucide-react';
import type { SpecState } from './uiSpecYaml';
import type { HabitOption } from './actionLinking';
import { habitIdFromEndpoint } from './actionLinking';
import { getFormFieldNames } from './inferState';
import { StateDataPanel } from './StateDataPanel';
import {
  assignActionToTrigger,
  displayBodyValue,
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

const ADVANCED_OPEN_KEY = 'ha-wizard-actions-advanced-open';

type HandlerTab = 'onSuccess' | 'onError';

export function ActionsAdvanced({
  spec,
  linkableHabits,
  onUpdate,
}: {
  spec: SpecState;
  linkableHabits: HabitOption[];
  onUpdate: (patch: (s: SpecState) => SpecState) => void;
}) {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(ADVANCED_OPEN_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem(ADVANCED_OPEN_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const formFields = useMemo(() => getFormFieldNames(spec), [spec]);
  const triggerOptions = useMemo(() => listTriggerOptions(spec), [spec]);

  return (
    <div className="border-t border-slate-800 pt-3">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 py-1"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        Advanced wiring
        <span className="text-slate-600 font-normal">(expressions, state keys, raw tables)</span>
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          {linkableHabits.map((habit) => {
            const actionId = findActionIdForHabit(spec, habit.id);
            if (!actionId) return null;
            return (
              <AdvancedHabitBlock
                key={habit.id}
                spec={spec}
                habit={habit}
                actionId={actionId}
                formFields={formFields}
                triggerOptions={triggerOptions}
                onUpdate={onUpdate}
              />
            );
          })}
          <StateDataPanel spec={spec} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}

function AdvancedHabitBlock({
  spec,
  habit,
  actionId,
  formFields,
  triggerOptions,
  onUpdate,
}: {
  spec: SpecState;
  habit: HabitOption;
  actionId: string;
  formFields: string[];
  triggerOptions: ReturnType<typeof listTriggerOptions>;
  onUpdate: (patch: (s: SpecState) => SpecState) => void;
}) {
  const [handlerTab, setHandlerTab] = useState<HandlerTab>('onSuccess');
  const action = (spec.actions[actionId] ?? {}) as Record<string, unknown>;
  const habitInputs = habitInputsFor(habit.id, [habit]);
  const body =
    action.body && typeof action.body === 'object' && !Array.isArray(action.body)
      ? (action.body as Record<string, unknown>)
      : {};
  const keys = new Set([...habitInputs, ...Object.keys(body)]);
  const bodyRows = [...keys].map((key) => ({
    key,
    value: displayBodyValue(String(body[key] ?? '')),
  }));
  const onSuccess = (action.onSuccess ?? {}) as Record<string, unknown>;
  const onError = (action.onError ?? {}) as Record<string, unknown>;
  const successRows = objectToKvList(onSuccess.set as Record<string, unknown>);
  const errorRows = objectToKvList(onError.set as Record<string, unknown>);
  const wiredTriggers = findTriggersForAction(spec, actionId);
  const suggestionId = `action-body-suggestions-${actionId}`;

  return (
    <div className="rounded border border-slate-800 bg-slate-950/80 p-3 space-y-3">
      <div className="text-xs font-medium text-slate-300">
        {habit.name ?? habit.id}
        <span className="text-slate-600 font-mono text-[10px] ml-2">
          {actionId} → {habitIdFromEndpoint(action.endpoint) ?? habit.id}
        </span>
      </div>

      <section className="space-y-2">
        <h4 className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
          <Zap className="w-3 h-3" /> Request body
        </h4>
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
              {bodyRows.map((row, i) => (
                <tr key={`${row.key}-${i}`} className="border-t border-slate-800/80">
                  <td className="px-2 py-1">
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
                  <td className="px-2 py-1">
                    <input
                      className={`${VALUE_INPUT} font-mono text-xs`}
                      list={suggestionId}
                      value={row.value}
                      onChange={(e) => {
                        const next = bodyRows.map((r, idx) =>
                          idx === i ? { ...r, value: e.target.value } : r,
                        );
                        onUpdate((s) => updateActionBody(s, actionId, next));
                      }}
                    />
                  </td>
                  <td className="px-1">
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
                'flex-1 px-2 py-1 text-[11px] rounded ' +
                (handlerTab === tab
                  ? tab === 'onSuccess'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-red-900/80 text-white'
                  : 'text-slate-400')
              }
            >
              {tab === 'onSuccess' ? 'On success' : 'On error'}
            </button>
          ))}
        </div>
        {handlerTab === 'onSuccess' ? (
          <HandlerSetTable
            rows={successRows}
            stateKeys={Object.keys(spec.state)}
            tone="success"
            toast={String(onSuccess.toast ?? '')}
            onToastChange={(toast) =>
              onUpdate((s) => updateActionHandlerSet(s, actionId, 'onSuccess', successRows, toast))
            }
            onChange={(rows) =>
              onUpdate((s) =>
                updateActionHandlerSet(s, actionId, 'onSuccess', rows, String(onSuccess.toast ?? '')),
              )
            }
          />
        ) : (
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

      <section className="space-y-1">
        <h4 className="text-[11px] font-semibold text-slate-400">Trigger</h4>
        {wiredTriggers.length > 0 && (
          <ul className="text-[10px] text-emerald-400/90">
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
            </option>
          ))}
        </select>
      </section>
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
        'rounded border p-2 space-y-2 ' +
        (tone === 'success' ? 'border-emerald-900/40 bg-emerald-950/20' : 'border-red-900/30 bg-red-950/15')
      }
    >
      {onToastChange && (
        <input
          className={`${INPUT} text-xs`}
          value={toast ?? ''}
          placeholder="Toast message"
          onChange={(e) => onToastChange(e.target.value)}
        />
      )}
      <div className="rounded border border-slate-800 overflow-hidden">
        <table className="w-full text-xs">
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-slate-800/80 first:border-t-0">
                <td className="px-2 py-1">
                  <input
                    className={`${INPUT} font-mono text-xs`}
                    value={row.key}
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
      <button
        type="button"
        className="text-xs text-blue-400 inline-flex items-center gap-1"
        onClick={() => onChange([...rows, { key: '', value: '' }])}
      >
        <Plus className="w-3 h-3" /> Add row
      </button>
    </div>
  );
}
