/**
 * App state & data panel — see and edit how state connects across forms, actions, and displays.
 */
import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Database,
  FormInput,
  Monitor,
  Plus,
  Trash2,
  Zap,
} from 'lucide-react';
import type { SpecState } from './uiSpecYaml';
import {
  buildStateProfiles,
  formatStateValueForEdit,
  inferStateValueKind,
  parseStateValueFromEdit,
  stateKeysForAction,
  type StateKeyProfile,
} from './stateConnections';
import { syncSpecWithInferredState } from './inferState';

const INPUT =
  'w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none';

export function StateDataPanel({
  spec,
  actionId,
  onUpdate,
}: {
  spec: SpecState;
  actionId?: string;
  onUpdate: (patch: (s: SpecState) => SpecState) => void;
}) {
  const profiles = useMemo(() => buildStateProfiles(spec), [spec]);
  const actionKeys = useMemo(
    () => (actionId ? stateKeysForAction(spec, actionId) : new Set<string>()),
    [spec, actionId],
  );

  const [filter, setFilter] = useState<'all' | 'this-action'>('all');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (filter === 'this-action' && actionId) {
      return profiles.filter((p) => actionKeys.has(p.key));
    }
    return profiles;
  }, [profiles, filter, actionId, actionKeys]);

  const patchState = (key: string, value: unknown) => {
    onUpdate((s) =>
      syncSpecWithInferredState({
        ...s,
        state: { ...s.state, [key]: value },
      }),
    );
  };

  const renameStateKey = (oldKey: string, newKey: string) => {
    const trimmed = newKey.trim();
    if (!trimmed || trimmed === oldKey) return;
    onUpdate((s) => {
      const nextState = { ...s.state };
      nextState[trimmed] = nextState[oldKey];
      delete nextState[oldKey];
      return syncSpecWithInferredState({ ...s, state: nextState });
    });
  };

  const removeStateKey = (key: string) => {
    onUpdate((s) => {
      const nextState = { ...s.state };
      delete nextState[key];
      return { ...s, state: nextState };
    });
  };

  const addStateKey = () => {
    onUpdate((s) => {
      let n = 1;
      let key = 'field1';
      while (key in s.state) {
        n += 1;
        key = `field${n}`;
      }
      return syncSpecWithInferredState({ ...s, state: { ...s.state, [key]: '' } });
    });
  };

  if (profiles.length === 0) {
    return (
      <div className="rounded border border-slate-800 bg-slate-950 p-3 text-xs text-slate-500 italic">
        No app state yet. Add form fields or configure an action to create state keys automatically.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-blue-400" /> App state &amp; data
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            Each row is one value your app remembers. See what fills it, where it goes, and what writes it back.
          </p>
        </div>
      </div>

      {actionId && (
        <div className="flex gap-1 p-0.5 rounded-md bg-slate-950 border border-slate-800">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={
              'flex-1 px-2 py-1 text-[11px] rounded ' +
              (filter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200')
            }
          >
            All state
          </button>
          <button
            type="button"
            onClick={() => setFilter('this-action')}
            className={
              'flex-1 px-2 py-1 text-[11px] rounded ' +
              (filter === 'this-action' ? 'bg-blue-700 text-white' : 'text-slate-400 hover:text-slate-200')
            }
          >
            This action only
          </button>
        </div>
      )}

      <div className="space-y-2 max-h-[min(420px,55vh)] overflow-y-auto pr-0.5">
        {visible.map((profile) => (
          <StateKeyCard
            key={profile.key}
            profile={profile}
            highlighted={actionId ? actionKeys.has(profile.key) : false}
            expanded={expandedKey === profile.key}
            onToggle={() => setExpandedKey((k) => (k === profile.key ? null : profile.key))}
            onValueChange={(v) => patchState(profile.key, v)}
            onRename={(newKey) => renameStateKey(profile.key, newKey)}
            onRemove={() => removeStateKey(profile.key)}
          />
        ))}
      </div>

      <button
        type="button"
        className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
        onClick={addStateKey}
      >
        <Plus className="w-3 h-3" /> Add state key
      </button>
    </div>
  );
}

function StateKeyCard({
  profile,
  highlighted,
  expanded,
  onToggle,
  onValueChange,
  onRename,
  onRemove,
}: {
  profile: StateKeyProfile;
  highlighted: boolean;
  expanded: boolean;
  onToggle: () => void;
  onValueChange: (value: unknown) => void;
  onRename: (newKey: string) => void;
  onRemove: () => void;
}) {
  const kind = inferStateValueKind(profile.startingValue);
  const editValue = formatStateValueForEdit(profile.startingValue);

  const flowSummary = buildFlowSummary(profile);

  return (
    <div
      className={
        'rounded border overflow-hidden ' +
        (highlighted
          ? 'border-blue-800/60 bg-blue-950/20'
          : 'border-slate-800 bg-slate-950')
      }
    >
      <button
        type="button"
        className="w-full text-left px-2.5 py-2 hover:bg-slate-900/80"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <code className="text-xs text-slate-200 font-mono">{profile.key}</code>
          {highlighted && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300">
              this action
            </span>
          )}
        </div>
        {flowSummary && (
          <p className="text-[10px] text-slate-500 mt-1 leading-snug">{flowSummary}</p>
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-800 px-2.5 py-2.5 space-y-3">
          <label className="block text-[11px] text-slate-400">
            Starting value
            <div className="flex gap-2 mt-1">
              <select
                className={`${INPUT} w-24 text-xs flex-shrink-0`}
                value={kind}
                onChange={(e) => {
                  const newKind = e.target.value as typeof kind;
                  onValueChange(stateValueFromKind(newKind, profile.startingValue));
                }}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="yesno">Yes/No</option>
                <option value="empty">Empty</option>
                <option value="list">List</option>
              </select>
              {kind === 'yesno' ? (
                <select
                  className={`${INPUT} flex-1 text-xs`}
                  value={editValue}
                  onChange={(e) => onValueChange(e.target.value === 'true')}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              ) : kind === 'empty' ? (
                <span className="text-xs text-slate-600 italic self-center">null</span>
              ) : (
                <input
                  className={`${INPUT} flex-1 text-xs font-mono`}
                  value={editValue}
                  placeholder={kind === 'list' ? 'comma, separated' : 'default value'}
                  onChange={(e) => onValueChange(parseStateValueFromEdit(e.target.value, kind))}
                />
              )}
            </div>
          </label>

          <ConnectionSection
            icon={<FormInput className="w-3 h-3 text-violet-400" />}
            title="Filled from (user input)"
            empty="Not bound to a form field"
          >
            {profile.filledFrom.map((f) => (
              <FlowRow key={f.fieldName} from="User types" to={`Form: ${f.fieldLabel}`} />
            ))}
          </ConnectionSection>

          <ConnectionSection
            icon={<Zap className="w-3 h-3 text-amber-400" />}
            title="Sent to habit (action body)"
            empty="Not sent by any action"
          >
            {profile.sentTo.map((s) => (
              <FlowRow
                key={`${s.actionId}-${s.bodyKey}`}
                from={`state.${profile.key}`}
                to={`${s.actionId} → ${s.habitId ?? 'api'}.${s.bodyKey}`}
              />
            ))}
          </ConnectionSection>

          <ConnectionSection
            icon={<Database className="w-3 h-3 text-emerald-400" />}
            title="Updated by action output"
            empty="Not written by onSuccess / onError"
          >
            {profile.updatedBy.map((u) => (
              <FlowRow
                key={`${u.actionId}-${u.handler}-${u.expression}`}
                from={`${u.actionId} ${u.handler === 'onSuccess' ? '✓' : '✗'} (${u.expression})`}
                to={`state.${profile.key}`}
              />
            ))}
          </ConnectionSection>

          <ConnectionSection
            icon={<Monitor className="w-3 h-3 text-cyan-400" />}
            title="Shown on screen"
            empty="Not displayed in any widget"
          >
            {profile.shownIn.map((d) => (
              <FlowRow
                key={`${d.widgetTitle}-${d.usage}`}
                from={`state.${profile.key}`}
                to={`${d.widgetTitle} (${d.usage})`}
              />
            ))}
          </ConnectionSection>

          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
            <input
              className={`${INPUT} flex-1 text-xs font-mono`}
              defaultValue={profile.key}
              placeholder="Rename key"
              onBlur={(e) => onRename(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
            />
            <button
              type="button"
              className="text-slate-500 hover:text-red-400 p-1"
              title="Remove from starting values"
              onClick={onRemove}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectionSection({
  icon,
  title,
  empty,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = React.Children.count(children) > 0;
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1">
        {icon}
        {title}
      </div>
      {hasChildren ? (
        <div className="space-y-1">{children}</div>
      ) : (
        <p className="text-[10px] text-slate-600 italic">{empty}</p>
      )}
    </div>
  );
}

function FlowRow({ from, to }: { from: string; to: string }) {
  return (
    <div className="flex items-center gap-1 text-[10px] text-slate-400">
      <span className="text-slate-300 truncate flex-1 min-w-0">{from}</span>
      <ArrowRight className="w-3 h-3 flex-shrink-0 text-slate-600" />
      <span className="text-slate-300 truncate flex-1 min-w-0 text-right">{to}</span>
    </div>
  );
}

function buildFlowSummary(profile: StateKeyProfile): string {
  const parts: string[] = [];
  if (profile.filledFrom.length) parts.push('form input');
  if (profile.sentTo.length) parts.push(`→ ${profile.sentTo.map((s) => s.actionId).join(', ')}`);
  if (profile.updatedBy.length) {
    parts.push(`← ${profile.updatedBy.map((u) => `${u.actionId} ${u.handler}`).join(', ')}`);
  }
  if (profile.shownIn.length) parts.push('on screen');
  return parts.join(' · ');
}

function stateValueFromKind(kind: ReturnType<typeof inferStateValueKind>, raw: unknown): unknown {
  switch (kind) {
    case 'empty':
      return null;
    case 'yesno':
      return raw === true || raw === 'true';
    case 'number': {
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    }
    case 'list':
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') return raw.split(',').map((s) => s.trim()).filter(Boolean);
      return [];
    default:
      return raw == null ? '' : String(raw);
  }
}
