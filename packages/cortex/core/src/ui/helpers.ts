/**
 * Server-side helpers for emitting safe HTML strings.
 *
 * The compiler emits *templates* (with literal `{{ }}` markers) into the
 * HTML — the browser runtime evaluates them. Helpers here are only for
 * generating well-formed HTML/attribute strings.
 */

export function escapeHtml(value: unknown): string {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escape a string for placement inside a double-quoted HTML attribute. */
export function escapeAttr(value: unknown): string {
  if (value == null) return '';
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Build an attribute string, skipping `null`/`undefined` values. */
export function attrs(map: Record<string, string | number | boolean | undefined | null>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(map)) {
    if (val == null || val === false) continue;
    if (val === true) {
      parts.push(key);
    } else {
      parts.push(`${key}="${escapeAttr(val)}"`);
    }
  }
  return parts.length ? ' ' + parts.join(' ') : '';
}

/** Join children HTMLs with newlines. */
export function joinHtml(parts: Array<string | undefined | null | false>): string {
  return parts.filter(Boolean).join('\n');
}

/** Class name joiner: strings, arrays, and {name: cond} objects. */
export function cls(...args: Array<string | undefined | null | false | Record<string, unknown>>): string {
  const out: string[] = [];
  for (const a of args) {
    if (!a) continue;
    if (typeof a === 'string') out.push(a);
    else if (typeof a === 'object') {
      for (const [k, v] of Object.entries(a)) if (v) out.push(k);
    }
  }
  return out.join(' ');
}

/**
 * Render a possibly-templated text fragment.
 * If `value` contains `{{ ... }}` placeholders, wraps it in a span that the
 * browser runtime will live-update; otherwise returns plain escaped text.
 */
export function tmplText(value: unknown): string {
  if (value == null) return '';
  const s = String(value);
  if (s.indexOf('{{') < 0) return escapeHtml(s);
  // Strip {{ }} for the expression body so the runtime evaluates it once.
  // We still set the original text as fallback content.
  const exprMatches = s.match(/\{\{([^}]+)\}\}/g);
  if (exprMatches && exprMatches.length === 1 && s.trim() === exprMatches[0].trim()) {
    const expr = exprMatches[0].replace(/^\{\{\s*|\s*\}\}$/g, '');
    return `<span data-tmpl="${escapeAttr(expr)}"></span>`;
  }
  // Mixed text + expressions: data-tmpl wants a single expression, so emit a span
  // whose text content the runtime resolves via attribute reflecting the whole
  // string. Encode as a no-op filter expression using `concat` template form.
  return `<span data-tmpl-text="${escapeAttr(s)}">${escapeHtml(s)}</span>`;
}

/** Generate a short deterministic id from a label. */
let _idCounter = 0;
export function uniqueId(prefix = 'w'): string {
  _idCounter += 1;
  return `${prefix}-${_idCounter.toString(36)}`;
}

/** Reset the unique-id counter — used by compileUiSpec to make output deterministic. */
export function resetIdCounter(): void {
  _idCounter = 0;
}

/**
 * Serialize an arbitrary JS value to a safe inline JSON string suitable for
 * embedding inside `<script>` blocks. Escapes `<` to avoid `</script>` injection.
 */
export function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/-->/g, '--\\>')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
