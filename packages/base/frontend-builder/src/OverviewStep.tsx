/**
 * Overview wizard step — summary of everything the user configured.
 */
import { ArrowRight, Database, Layers, Zap } from 'lucide-react';
import type { SpecState } from './uiSpecYaml';
import type { HabitOption } from './actionLinking';
import { habitIdFromEndpoint } from './actionLinking';
import { describeDataFlow } from './dataFlow';
import { describeAppMemory, getFormFieldNames } from './inferState';
import { findTriggersForAction } from './actionConfig';

export function OverviewStep({
  spec,
  linkableHabits,
}: {
  spec: SpecState;
  linkableHabits: HabitOption[];
  showDebugYaml?: boolean;
}) {
  const routes = describeDataFlow(spec);
  const memory = describeAppMemory(spec);
  const formFields = getFormFieldNames(spec);
  const actions = Object.entries(spec.actions ?? {});

  return (
    <div className="space-y-4 max-h-[min(520px,70vh)] overflow-y-auto pr-1">
      <p className="text-xs text-slate-400 leading-relaxed">
        Summary of your app — pages, actions, data flow, and state.
      </p>

      <section className="rounded border border-slate-800 bg-slate-950 p-3 space-y-2">
        <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-violet-400" /> Pages &amp; forms
        </h3>
        {formFields.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">No form fields yet</p>
        ) : (
          <p className="text-[11px] text-slate-300">
            Form fields: <span className="font-mono text-slate-400">{formFields.join(', ')}</span>
          </p>
        )}
        <p className="text-[11px] text-slate-500">
          Layout: {spec.layout.type}
          {spec.layout.nav?.length ? ` · ${spec.layout.nav.length} tabs` : ''}
        </p>
      </section>

      <section className="rounded border border-slate-800 bg-slate-950 p-3 space-y-2">
        <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" /> Actions
        </h3>
        {actions.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">No actions configured</p>
        ) : (
          <ul className="space-y-2">
            {actions.map(([id, raw]) => {
              const a = raw as Record<string, unknown>;
              const habitId = habitIdFromEndpoint(a.endpoint);
              const triggers = findTriggersForAction(spec, id);
              const body =
                a.body && typeof a.body === 'object' && !Array.isArray(a.body)
                  ? Object.keys(a.body as Record<string, unknown>)
                  : [];
              return (
                <li key={id} className="text-[11px] border border-slate-800 rounded p-2">
                  <div className="font-mono text-slate-200">{id}</div>
                  {habitId && (
                    <div className="text-slate-500">
                      → habit <span className="text-slate-400">{habitId}</span>
                    </div>
                  )}
                  {body.length > 0 && (
                    <div className="text-slate-500">body: {body.join(', ')}</div>
                  )}
                  {triggers.length > 0 && (
                    <div className="text-emerald-400/80 mt-0.5">
                      triggered by: {triggers.map((t) => t.label).join('; ')}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {linkableHabits.length > 0 && (
          <p className="text-[10px] text-slate-600">
            {linkableHabits.length} habit{linkableHabits.length === 1 ? '' : 's'} in stack
          </p>
        )}
      </section>

      <section className="rounded border border-slate-800 bg-slate-950 p-3 space-y-2">
        <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-blue-400" /> App state
        </h3>
        {memory.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">No state keys</p>
        ) : (
          <ul className="space-y-1">
            {memory.map((entry) => (
              <li key={entry.key} className="text-[11px] flex justify-between gap-2">
                <span className="font-mono text-slate-300">{entry.key}</span>
                <span className="text-slate-500 truncate">{entry.usedFor}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded border border-slate-800 bg-slate-950 p-3 space-y-2">
        <h3 className="text-xs font-semibold text-slate-200">Data flow</h3>
        {routes.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">No connections yet</p>
        ) : (
          <ul className="space-y-2">
            {routes.map((route) => (
              <li key={route.trigger} className="text-[11px] border border-slate-800/80 rounded p-2">
                <div className="font-medium text-slate-300 mb-1">{route.trigger}</div>
                {route.hops.map((hop, i) => (
                  <div key={i} className="flex items-center gap-1 text-slate-500">
                    <span className="text-slate-400 flex-1 truncate">{hop.from}</span>
                    <ArrowRight className="w-3 h-3 flex-shrink-0" />
                    <span className="text-slate-400 flex-1 truncate text-right">{hop.to}</span>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
