import { parseYamlToSpecState, specStateToSpec, resolveActiveViewId } from './uiSpecYaml';

const aiJournalYaml = `version: 1
meta:
  id: ai-journal
  title: AI Journal
layout:
  type: tabs
  nav:
    - { id: write, label: Write, icon: "✍️" }
    - { id: history, label: History, icon: "🗂️" }
    - { id: insights, label: Insights, icon: "📈" }
defaultView: write
views:
  write:
    widgets:
      - kind: card
        title: "Today's reflection"
        hideWhen: state.currentEntry
        children:
          - kind: form
            bindTo: state
            fields:
              - { name: content, type: textarea, label: "Journal entry", rows: 8, required: true, showWordCount: true }
            submit: { label: "Save and analyse", action: saveEntry }
      - kind: status-banner
        showWhen: state.error
        source: state.error
      - kind: result-panel
        showWhen: state.currentEntry
        source: state.currentEntry
        title: "Your reflection"
  history:
    onEnter: getEntries
    widgets:
      - kind: history-grid
        loadAction: getEntries
        dataPath: entries
  insights:
    widgets:
      - kind: card
        title: "Weekly insights"
`;

describe('parseYamlToSpecState views support', () => {
  it('parses minimal views yaml', () => {
    const text = `version: 1
defaultView: write
layout:
  type: tabs
  nav:
    - { id: write, label: Write }
views:
  write:
    widgets:
      - kind: card
        title: Card`;
    const state = parseYamlToSpecState(text);
    expect(state.views).toBeDefined();
    expect(state.widgets).toHaveLength(1);
  });

  it('hydrates widgets from the default view when spec uses views', () => {
    const state = parseYamlToSpecState(aiJournalYaml);
    expect(state.views).toBeDefined();
    expect(state.defaultView).toBe('write');
    expect(state.activeViewId).toBe('write');
    expect(state.widgets).toHaveLength(3);
    expect(state.widgets.map((w) => w.kind)).toEqual(['card', 'status-banner', 'result-panel']);

    const form = state.widgets[0].children?.[0];
    expect(form?.kind).toBe('form');
    expect(form?.props.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'content',
          type: 'textarea',
          rows: 8,
          showWordCount: true,
        }),
      ]),
    );
  });

  it('syncs edited widgets back into views on emit', () => {
    const state = parseYamlToSpecState(aiJournalYaml);
    state.widgets[0].props.title = 'Updated title';
    const spec = specStateToSpec(state);
    const writeView = (spec.views as Record<string, { widgets: Array<{ kind: string; title?: string }> }>).write;
    expect(writeView.widgets[0].title).toBe('Updated title');
  });

  it('resolves active view from nav when defaultView is missing', () => {
    const state = parseYamlToSpecState(aiJournalYaml);
    const withoutDefault = { ...state, defaultView: undefined, activeViewId: undefined };
    expect(resolveActiveViewId(withoutDefault)).toBe('write');
  });
});
