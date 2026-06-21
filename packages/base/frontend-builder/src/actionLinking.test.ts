import { parseYamlToSpecState } from './uiSpecYaml';
import {
  defaultActionIdForHabit,
  habitIdFromEndpoint,
  missingActionReferences,
  linkHabitToAction,
} from './actionLinking';

describe('actionLinking', () => {
  const spec = () =>
    parseYamlToSpecState(
      `version: 1
meta: { id: x, title: X }
actions:
  generate:
    method: POST
    endpoint: /api/generate-recipe
views:
  main:
    widgets:
      - kind: form
        submit: { action: generate, label: Go }
`,
      'x',
      'X',
    );

  it('defaultActionIdForHabit camelCases habit id', () => {
    expect(defaultActionIdForHabit('generate-recipe')).toBe('generateRecipe');
    expect(defaultActionIdForHabit('list-recipes')).toBe('listRecipes');
  });

  it('habitIdFromEndpoint parses api path', () => {
    expect(habitIdFromEndpoint('/api/generate-recipe')).toBe('generate-recipe');
  });

  it('missingActionReferences finds unlinked actions', () => {
    const s = spec();
    delete s.actions.generate;
    const missing = missingActionReferences(s, ['generate-recipe']);
    expect(missing.some((m) => m.actionId === 'generate')).toBe(true);
  });

  it('linkHabitToAction adds action', () => {
    const s = spec();
    delete s.actions.generate;
    const next = linkHabitToAction(s, 'generate', 'generate-recipe', 'form-submit');
    expect(habitIdFromEndpoint((next.actions.generate as Record<string, unknown>).endpoint)).toBe(
      'generate-recipe',
    );
  });
});
