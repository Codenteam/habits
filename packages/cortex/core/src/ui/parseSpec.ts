import { parse as parseYaml } from 'yaml';
import type { UiSpec } from './types';

/**
 * Parse a YAML or JSON string into a `UiSpec`.
 *
 * Performs only light structural validation — the runtime gracefully
 * tolerates missing fields. Throws when the document is empty or
 * fundamentally malformed.
 */
export function parseUiSpec(input: string): UiSpec {
  if (!input || !input.trim()) {
    throw new Error('parseUiSpec: empty document');
  }
  let raw: unknown;
  try {
    raw = parseYaml(input);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`parseUiSpec: YAML parse failed: ${msg}`);
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('parseUiSpec: root must be a mapping');
  }
  return raw as UiSpec;
}
