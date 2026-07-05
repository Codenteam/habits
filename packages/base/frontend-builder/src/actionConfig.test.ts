import { parseYamlToSpecState } from './uiSpecYaml';
import {
  displayBodyValue,
  storeBodyValue,
  ensureActionForHabit,
  findActionIdForHabit,
} from './actionConfig';

describe('actionConfig', () => {
  it('round-trips body values through display/store', () => {
    expect(displayBodyValue('{{state.email}}')).toBe('email');
    expect(storeBodyValue('email')).toBe('{{state.email}}');
    expect(storeBodyValue('{{state.custom}}')).toBe('{{state.custom}}');
  });

  it('creates action with habit input keys', () => {
    const spec = parseYamlToSpecState('version: 1\nmeta: { id: x, title: X }', 'x', 'X');
    const habits = [{ id: 'enrich-lead', name: 'Enrich', inputs: ['email', 'firstName'] }];
    const { spec: next, actionId } = ensureActionForHabit(spec, 'enrich-lead', habits);
    expect(actionId).toBe('enrichLead');
    expect(findActionIdForHabit(next, 'enrich-lead')).toBe('enrichLead');
    const body = (next.actions.enrichLead as Record<string, unknown>).body as Record<string, string>;
    expect(body.email).toBe('{{state.email}}');
    expect(body.firstName).toBe('{{state.firstName}}');
    expect(next.state.email).toBe('');
    expect(next.state.firstName).toBe('');
  });
});
