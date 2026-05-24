import { escapeAttr, escapeHtml, tmplText } from './helpers';
import {
  getLucideIconNames,
  getLucideIconPath,
  hasLucideIcon,
} from './lucideIcons';
import { lucideIconUrl } from './assetPaths';

export const LUCIDE_ICON_NAMES = getLucideIconNames();

const SVG_OPEN = /^\s*<svg[\s>]/i;
const URL_PREFIX = /^(https?:\/\/|\/|\.\/|\.\.\/)/i;

/** Strip dangerous SVG content before embedding inline SVG. */
export function sanitizeSvg(raw: string): string {
  let s = raw.trim();
  if (!SVG_OPEN.test(s)) return '';
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/\s(on\w+|xmlns:xlink)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  if (!/xmlns=/.test(s)) {
    s = s.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!/\bviewBox=/.test(s) && /\bwidth=/.test(s)) {
    // keep as-is
  } else if (!/\bviewBox=/.test(s)) {
    s = s.replace(/^<svg/i, '<svg viewBox="0 0 24 24"');
  }
  if (!/\bfill=/.test(s) && !/\bstroke=/.test(s)) {
    s = s.replace(/^<svg/i, '<svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"');
  }
  return s;
}

function lucideNameFromValue(value: string): string | null {
  const m = value.trim().match(/^lucide:([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  const raw = m[1];
  const pascal = raw
    .split(/[-_]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
  return hasLucideIcon(pascal) ? pascal : null;
}

const LUCIDE_VALUE_RE = /lucide:([A-Za-z0-9_-]+)/g;
const RUNTIME_HARDCODED_LUCIDE = ['Inbox', 'Image', 'File'] as const;

function renderLucideIcon(name: string, className: string): string {
  const url = escapeAttr(getLucideIconPath(name) ?? lucideIconUrl(name));
  return `<span class="${className} ha-icon--lucide" style="-webkit-mask-image:url('${url}');mask-image:url('${url}');" aria-hidden="true"></span>`;
}

/** Collect Lucide icon names referenced in a spec/HTML (for asset subsetting). */
export function collectLucideIconNamesUsed(...sources: unknown[]): string[] {
  const names = new Set<string>(RUNTIME_HARDCODED_LUCIDE);

  function walk(val: unknown) {
    if (typeof val === 'string') {
      LUCIDE_VALUE_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = LUCIDE_VALUE_RE.exec(val))) {
        const resolved = lucideNameFromValue(`lucide:${m[1]}`);
        if (resolved) names.add(resolved);
      }
    } else if (Array.isArray(val)) {
      val.forEach(walk);
    } else if (val && typeof val === 'object') {
      Object.values(val).forEach(walk);
    }
  }

  sources.forEach(walk);
  return Array.from(names);
}

/** Render a static icon value to HTML (URL, lucide:Name, inline SVG, or text). */
export function renderIcon(value: unknown, className = 'ha-icon'): string {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  if (!s) return '';

  const lucide = lucideNameFromValue(s);
  if (lucide) {
    return renderLucideIcon(lucide, className);
  }

  if (URL_PREFIX.test(s)) {
    return `<img class="${className}" src="${escapeAttr(s)}" alt="" />`;
  }

  if (SVG_OPEN.test(s)) {
    const safe = sanitizeSvg(s);
    if (safe) return `<span class="${className}" aria-hidden="true">${safe}</span>`;
  }

  return `<span class="${className} ha-icon--text">${escapeHtml(s)}</span>`;
}

/** Icon with optional {{ template }} support (header/hero). */
export function renderIconTmpl(value: unknown, className = 'ha-icon'): string {
  if (value == null || value === '') return '';
  const s = String(value);
  if (s.indexOf('{{') >= 0) {
    return `<span class="${className} ha-icon--tmpl" data-tmpl-icon="${escapeAttr(s)}">${tmplText(s)}</span>`;
  }
  return renderIcon(s, className);
}

/** Inline icon before label text in buttons/tabs. */
export function renderIconPrefix(value: unknown, className = 'ha-icon ha-icon--inline'): string {
  const html = renderIcon(value, className);
  return html ? `${html} ` : '';
}

/** Client-side icon renderer injected into RUNTIME_JS (path-based, no fs). */
export function buildRuntimeIconJs(): string {
  return `
var __HA_ASSETS = 'ha-assets';
function __lucideIconUrl(name) { return __HA_ASSETS + '/icons/lucide/' + name + '.svg'; }
function __sanitizeSvg(raw) {
  if (!raw) return '';
  var s = String(raw).trim();
  if (!/^\\s*<svg[\\s>]/i.test(s)) return '';
  s = s.replace(/<script[\\s\\S]*?<\\/script>/gi, '');
  s = s.replace(/\\s(on\\w+|xmlns:xlink)\\s*=\\s*(\"[^\"]*\"|'[^']*'|[^\\s>]+)/gi, '');
  if (!/xmlns=/.test(s)) s = s.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  if (!/\\bviewBox=/.test(s)) s = s.replace(/^<svg/i, '<svg viewBox="0 0 24 24"');
  if (!/\\bfill=/.test(s) && !/\\bstroke=/.test(s)) s = s.replace(/^<svg/i, '<svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"');
  return s;
}
function __lucideName(value) {
  var m = String(value || '').trim().match(/^lucide:([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  var parts = m[1].split(/[-_]/).filter(Boolean);
  return parts.map(function (p) { return p.charAt(0).toUpperCase() + p.slice(1); }).join('');
}
function __renderLucideIcon(name, className) {
  var url = __lucideIconUrl(name);
  return '<span class="' + className + ' ha-icon--lucide" style="-webkit-mask-image:url(\\'' + url + '\\');mask-image:url(\\'' + url + '\\');" aria-hidden="true"></span>';
}
function renderIcon(value, className) {
  className = className || 'ha-icon';
  if (value == null || value === '') return '';
  var s = String(value).trim();
  if (!s) return '';
  if (/^lucide:/i.test(s)) {
    var lucide = __lucideName(s);
    if (lucide) return __renderLucideIcon(lucide, className);
  }
  if (/^(https?:\\/\\/|\\/|\\.\\/|\\.\\.\\/)/.test(s)) {
    return '<img class="' + className + '" src="' + escapeHtml(s) + '" alt="" />';
  }
  if (/^\\s*<svg[\\s>]/i.test(s)) {
    var safe = __sanitizeSvg(s);
    if (safe) return '<span class="' + className + '" aria-hidden="true">' + safe + '</span>';
  }
  return '<span class="' + className + ' ha-icon--text">' + escapeHtml(s) + '</span>';
}
function renderIconPrefix(value, className) {
  var html = renderIcon(value, className || 'ha-icon ha-icon--inline');
  return html ? html + ' ' : '';
}
`.trim();
}
