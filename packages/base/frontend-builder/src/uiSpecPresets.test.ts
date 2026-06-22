import { objectToWidgetNode } from './uiSpecYaml';
import {
  WIDGET_PRESETS,
  WIDGET_PRESETS_BY_ID,
  UI_SPEC_TEMPLATES,
  UI_SPEC_TEMPLATES_BY_ID,
} from './uiSpecPresets';
import { parseYamlToSpecState } from './uiSpecYaml';

describe('uiSpecPresets', () => {
  it('defines five widget presets', () => {
    expect(WIDGET_PRESETS).toHaveLength(5);
    for (const preset of WIDGET_PRESETS) {
      expect(WIDGET_PRESETS_BY_ID.get(preset.id)).toBe(preset);
      expect(preset.widgets.length).toBeGreaterThan(0);
      for (const w of preset.widgets) {
        expect(w.kind).toBeTruthy();
      }
    }
  });

  it('unfurls presets into widget nodes with uids', () => {
    const preset = WIDGET_PRESETS_BY_ID.get('form-with-result')!;
    const nodes = preset.widgets.map((w) => objectToWidgetNode(w));
    expect(nodes).toHaveLength(2);
    expect(nodes[0].kind).toBe('card');
    expect(nodes[1].kind).toBe('result-panel');
    expect(nodes[0].uid).toBeTruthy();
    expect(nodes[1].uid).not.toBe(nodes[0].uid);
  });

  it('defines full templates that parse into valid spec state', () => {
    expect(UI_SPEC_TEMPLATES.length).toBeGreaterThanOrEqual(5);
    for (const template of UI_SPEC_TEMPLATES) {
      expect(UI_SPEC_TEMPLATES_BY_ID.get(template.id)).toBe(template);
      const state = parseYamlToSpecState(template.yaml);
      expect(state.meta.title).toBeTruthy();
      expect(
        state.widgets.length > 0 || (state.views && Object.keys(state.views).length > 0),
      ).toBe(true);
    }
  });

  it('chat template includes messages state and sendMessage action', () => {
    const state = parseYamlToSpecState(UI_SPEC_TEMPLATES_BY_ID.get('chat-interface')!.yaml);
    expect(state.state).toHaveProperty('messages');
    expect(state.state).toHaveProperty('message');
    expect(state.actions).toHaveProperty('sendMessage');
    const kinds = state.widgets.map((w) => w.kind);
    expect(kinds).toContain('chat-panel');
  });
});
