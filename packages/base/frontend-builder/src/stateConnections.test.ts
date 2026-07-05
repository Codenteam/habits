import { buildStateProfiles, stateKeysForAction } from './stateConnections';
import type { SpecState } from './uiSpecYaml';

const leadSpec: SpecState = {
  meta: { id: 'lead', title: 'Lead' },
  theme: { preset: 'neural' },
  layout: { type: 'single' },
  widgets: [
    {
      uid: 'w1',
      kind: 'form',
      props: {
        fields: [
          { name: 'email', label: 'Email', type: 'email' },
          { name: 'firstName', label: 'First Name', type: 'text' },
        ],
        submit: { action: 'enrich', label: 'Submit' },
      },
    },
    {
      uid: 'w2',
      kind: 'status-banner',
      props: { source: 'state.error', title: 'Error' },
    },
  ],
  actions: {
    enrich: {
      method: 'POST',
      endpoint: '/api/enrich-lead',
      body: {
        email: '{{state.email}}',
        firstName: '{{state.firstName}}',
      },
      onSuccess: { set: { result: '$response', error: null } },
      onError: { set: { error: '$error.message' } },
    },
  },
  state: { email: '', firstName: '', result: null, error: null },
};

describe('buildStateProfiles', () => {
  it('maps form → state → action → output connections', () => {
    const profiles = buildStateProfiles(leadSpec);
    const email = profiles.find((p) => p.key === 'email')!;
    expect(email.filledFrom).toHaveLength(1);
    expect(email.filledFrom[0].fieldLabel).toBe('Email');
    expect(email.sentTo[0]).toMatchObject({ actionId: 'enrich', bodyKey: 'email' });

    const result = profiles.find((p) => p.key === 'result')!;
    expect(result.updatedBy[0]).toMatchObject({ actionId: 'enrich', handler: 'onSuccess', expression: '$response' });

    const error = profiles.find((p) => p.key === 'error')!;
    expect(error.updatedBy.some((u) => u.handler === 'onError' && u.expression.includes('$error'))).toBe(true);
    expect(error.shownIn.some((s) => s.usage === 'source')).toBe(true);
  });

  it('stateKeysForAction returns body and handler keys', () => {
    const keys = stateKeysForAction(leadSpec, 'enrich');
    expect(keys.has('email')).toBe(true);
    expect(keys.has('firstName')).toBe(true);
    expect(keys.has('result')).toBe(true);
    expect(keys.has('error')).toBe(true);
  });
});
