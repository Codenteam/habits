import {
  inferStateDefaults,
  mergeInferredState,
  describeAppMemory,
  type AppMemoryEntry,
} from './inferState';
import { parseYamlToSpecState, builderRoundTripYaml } from './uiSpecYaml';
import type { SpecState } from './uiSpecYaml';

describe('inferState', () => {
  const baseSpec = (): SpecState =>
    parseYamlToSpecState('', 'test', 'Test');

  it('infers form field defaults', () => {
    const spec = baseSpec();
    spec.views = {
      main: {
        widgets: [
          {
            kind: 'form',
            bindTo: 'state',
            fields: [
              { name: 'ingredients', type: 'tag-input', label: 'Ingredients' },
              { name: 'servings', type: 'select', label: 'Servings', default: '4' },
            ],
          },
        ],
      },
    };
    spec.defaultView = 'main';
    spec.layout = { type: 'tabs', nav: [{ id: 'main', label: 'Main' }] };

    const inferred = inferStateDefaults(spec);
    expect(inferred.ingredients).toEqual([]);
    expect(inferred.servings).toBe('4');
  });

  it('infers result and error keys from widgets', () => {
    const spec = baseSpec();
    spec.widgets = [
      { kind: 'status-banner', source: 'state.error', showWhen: 'state.error' } as unknown as SpecState['widgets'][0],
      { kind: 'result-panel', source: 'state.currentRecipe', showWhen: 'state.currentRecipe' } as unknown as SpecState['widgets'][0],
    ];
    const inferred = inferStateDefaults(spec);
    expect(inferred.error).toBe(null);
    expect(inferred.currentRecipe).toBe(null);
  });

  it('merges without clobbering manual keys', () => {
    const spec = baseSpec();
    spec.state = { customKey: 'keep' };
    spec.actions = {
      generate: {
        method: 'POST',
        endpoint: '/api/generate',
        body: { q: '{{state.q}}' },
        onSuccess: { set: { result: '$response', error: null } },
      },
    };
    const merged = mergeInferredState(spec, { manualKeys: new Set(['customKey']) });
    expect(merged.customKey).toBe('keep');
    expect(merged.q).toBe('');
    expect(merged.result).toBe(null);
    expect(merged.error).toBe(null);
  });

  it('describeAppMemory returns human entries', () => {
    const spec = baseSpec();
    spec.views = {
      create: {
        widgets: [
          {
            kind: 'form',
            fields: [{ name: 'email', type: 'email', label: 'Email' }],
          },
        ],
      },
    };
    const entries: AppMemoryEntry[] = describeAppMemory(spec);
    expect(entries.some((e) => e.key === 'email' && e.usedFor.includes('Email'))).toBe(true);
  });
});

describe('builderRoundTripYaml with inferred state', () => {
  it('round-trips minimal spec', () => {
    const yaml = builderRoundTripYaml(`version: 1
meta:
  id: demo
  title: Demo
state:
  x: ""
widgets:
  - kind: text
    text: Hello
`);
    expect(yaml).toContain('id: demo');
  });
});
