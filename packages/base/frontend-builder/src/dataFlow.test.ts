import { describeDataFlow } from './dataFlow';
import type { SpecState } from './uiSpecYaml';

describe('describeDataFlow', () => {
  it('maps form fields to state and habits', () => {
    const spec: SpecState = {
      meta: { id: 'demo', title: 'Demo' },
      theme: { preset: 'neural' },
      layout: { type: 'single' },
      widgets: [],
      views: {
        create: {
          widgets: [
            {
              kind: 'form',
              fields: [{ name: 'topic', label: 'Topic' }],
              submit: { action: 'generate' },
            },
          ],
        },
      },
      actions: {
        generate: {
          method: 'POST',
          endpoint: '/api/generate-recipe',
          body: { topic: '{{state.topic}}' },
          onSuccess: { set: { result: '$response', error: null } },
        },
      },
      state: {},
    };

    const routes = describeDataFlow(spec);
    expect(routes.some((r) => r.trigger.includes('Form field'))).toBe(true);
    expect(
      routes.some(
        (r) =>
          r.hops.some((h) => h.from.includes('topic')) &&
          r.hops.some((h) => h.to.includes('generate-recipe')),
      ),
    ).toBe(true);
    expect(
      routes.some(
        (r) =>
          r.hops.some((h) => h.from.includes('output')) &&
          r.hops.some((h) => h.to.includes('result')),
      ),
    ).toBe(true);
  });
});
