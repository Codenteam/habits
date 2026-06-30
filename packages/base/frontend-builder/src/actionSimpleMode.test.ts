import { parseYamlToSpecState } from './uiSpecYaml';
import { collectWidgetsFromSpec } from './inferState';
import {
  applySimpleActionOutcome,
  autoMatchFormToHabitInputs,
  describeActionInPlainEnglish,
  ensureAutoMatchedActions,
  findUnmatchedInputsAcrossHabits,
  getFormFieldsWithLabels,
  humanizeFieldName,
  readSimpleActionOutcome,
} from './actionSimpleMode';
import { assignActionToTrigger, ensureActionForHabit, listTriggerOptions } from './actionConfig';

const habits = [
  { id: 'enrich-lead', name: 'Enrich Lead', inputs: ['email', 'company', 'missingField'] },
];

function leadFormSpec() {
  return parseYamlToSpecState(
    `version: 1
meta: { id: lead, title: Lead }
widgets:
  - kind: card
    title: Contact form
    children:
      - kind: form
        fields:
          - { name: email, type: email, label: Email Address }
          - { name: company, type: text, label: Company }
        submit: { label: Submit, action: enrichLead }
actions:
  enrichLead:
    method: POST
    endpoint: /api/enrich-lead
    body: {}
`,
    'lead',
    'Lead',
  );
}

describe('actionSimpleMode', () => {
  it('humanizeFieldName turns camelCase and snake_case into labels', () => {
    expect(humanizeFieldName('firstName')).toBe('First Name');
    expect(humanizeFieldName('email_address')).toBe('Email Address');
  });

  it('autoMatchFormToHabitInputs matches form fields by name', () => {
    const formFields = [
      { name: 'email', label: 'Email' },
      { name: 'company', label: 'Company' },
    ];
    expect(autoMatchFormToHabitInputs(['email', 'company'], formFields)).toEqual({
      email: 'email',
      company: 'company',
    });
    expect(autoMatchFormToHabitInputs(['Email'], formFields)).toEqual({ Email: 'email' });
  });

  it('getFormFieldsWithLabels collects nested form fields', () => {
    const fields = getFormFieldsWithLabels(leadFormSpec());
    expect(fields).toEqual(
      expect.arrayContaining([
        { name: 'email', label: 'Email Address' },
        { name: 'company', label: 'Company' },
      ]),
    );
  });

  it('ensureAutoMatchedActions writes state body expressions for matched inputs', () => {
    const { spec: withAction, actionId } = ensureActionForHabit(leadFormSpec(), 'enrich-lead', habits);
    const next = ensureAutoMatchedActions(withAction, habits);
    const body = (next.actions[actionId] as Record<string, unknown>).body as Record<string, string>;
    expect(body.email).toBe('{{state.email}}');
    expect(body.company).toBe('{{state.company}}');
    expect(body.missingField).toBeUndefined();
  });

  it('findUnmatchedInputsAcrossHabits reports inputs without form fields', () => {
    const { spec: withAction } = ensureActionForHabit(leadFormSpec(), 'enrich-lead', habits);
    const next = ensureAutoMatchedActions(withAction, habits);
    const unmatched = findUnmatchedInputsAcrossHabits(next, habits);
    expect(unmatched).toContain('missingField');
    expect(unmatched).not.toContain('email');
  });

  it('applySimpleActionOutcome wires toast, result, and error handlers', () => {
    const { spec: withAction, actionId } = ensureActionForHabit(leadFormSpec(), 'enrich-lead', habits);
    const next = applySimpleActionOutcome(withAction, actionId, {
      showToast: true,
      toastMessage: 'Submitted!',
      showResult: true,
      resultWidgetId: 'add',
      showErrors: true,
    });

    const action = next.actions[actionId] as Record<string, unknown>;
    const onSuccess = action.onSuccess as Record<string, unknown>;
    const onError = action.onError as Record<string, unknown>;
    expect(onSuccess.toast).toBe('Submitted!');
    expect((onSuccess.set as Record<string, unknown>).result).toBe('$response');
    expect((onError.set as Record<string, unknown>).error).toBe('$error.message');

    const widgets = collectWidgetsFromSpec(next);
    expect(widgets.some((w) => w.kind === 'result-panel' && w.source === 'state.result')).toBe(true);
    expect(
      widgets.some((w) => w.kind === 'status-banner' && String(w.source).includes('error')),
    ).toBe(true);
  });

  it('readSimpleActionOutcome reflects configured handlers and widgets', () => {
    const { spec: withAction, actionId } = ensureActionForHabit(leadFormSpec(), 'enrich-lead', habits);
    const configured = applySimpleActionOutcome(withAction, actionId, {
      showToast: true,
      toastMessage: 'Done',
      showResult: true,
      resultWidgetId: 'add',
      showErrors: true,
    });
    const outcome = readSimpleActionOutcome(configured, actionId);
    expect(outcome.showToast).toBe(true);
    expect(outcome.showResult).toBe(true);
    expect(outcome.showErrors).toBe(true);
  });

  it('describeActionInPlainEnglish summarizes trigger, fields, and outcomes', () => {
    let spec = leadFormSpec();
    const { spec: withAction, actionId } = ensureActionForHabit(spec, 'enrich-lead', habits);
    spec = ensureAutoMatchedActions(withAction, habits);
    const trigger = listTriggerOptions(spec).find((o) => o.ref.propPath === 'submit.action');
    expect(trigger).toBeDefined();
    spec = assignActionToTrigger(spec, actionId, trigger!.ref);
    spec = applySimpleActionOutcome(spec, actionId, {
      showToast: true,
      toastMessage: 'Done',
      showResult: true,
      resultWidgetId: 'add',
      showErrors: true,
    });

    const text = describeActionInPlainEnglish(
      spec,
      'enrich-lead',
      actionId,
      'Enrich Lead',
      ['email', 'company'],
      { email: 'email', company: 'company' },
      readSimpleActionOutcome(spec, actionId),
    );

    expect(text).toContain('Enrich Lead');
    expect(text).toContain('Email Address');
    expect(text).toContain('Company');
    expect(text).toMatch(/success message|response is shown|errors are shown/i);
  });
});
