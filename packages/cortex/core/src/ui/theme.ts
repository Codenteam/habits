import { DEFAULT_THEME_PRESET, type ThemePreset, type ThemeSpec } from './types';
import { fontAssetUrl } from './assetPaths';

interface ThemeColors {
  bgBase: string;
  bgSurface: string;
  bgElevated: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textDim: string;
  primary: string;
  primaryHover: string;
  secondary: string;
  accent: string;
  success: string;
  warn: string;
  danger: string;
  info: string;
}

const DARK_BLUE: ThemeColors = {
  bgBase: '#0f172a',
  bgSurface: '#1e293b',
  bgElevated: '#334155',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  secondary: '#1e293b',
  accent: '#22d3ee',
  success: '#10b981',
  warn: '#f59e0b',
  danger: '#ef4444',
  info: '#60a5fa',
};

const PRESETS: Record<ThemePreset, ThemeColors> = {
  neural: {
    bgBase: '#050818',
    bgSurface: '#0a1028',
    bgElevated: '#121a38',
    border: 'rgba(79, 124, 255, 0.14)',
    borderStrong: 'rgba(124, 156, 255, 0.28)',
    text: '#eef4ff',
    textMuted: '#8899bb',
    textDim: '#5a6a8a',
    primary: '#4f7cff',
    primaryHover: '#3b5fdb',
    secondary: '#0f1630',
    accent: '#7c9cff',
    success: '#34d399',
    warn: '#fbbf24',
    danger: '#f87171',
    info: '#60a5fa',
  },
  'ha-bits-blue': { ...DARK_BLUE },
  'ha-bits-cyan': { ...DARK_BLUE, primary: '#22d3ee', primaryHover: '#06b6d4', accent: '#67e8f9' },
  'ha-bits-purple': { ...DARK_BLUE, primary: '#a78bfa', primaryHover: '#8b5cf6', accent: '#c084fc' },
  'ha-bits-red': { ...DARK_BLUE, primary: '#f87171', primaryHover: '#ef4444', accent: '#fb923c' },
  'ha-bits-emerald': { ...DARK_BLUE, primary: '#10b981', primaryHover: '#059669', accent: '#34d399' },
  'ha-bits-warn': { ...DARK_BLUE, primary: '#f59e0b', primaryHover: '#d97706', accent: '#fbbf24' },
  aurora: {
    ...DARK_BLUE,
    bgBase: '#020c1b',
    bgSurface: '#0a1628',
    bgElevated: '#0f2027',
    primary: '#06b6d4',
    primaryHover: '#0891b2',
    accent: '#10b981',
  },
  cyberpunk: {
    ...DARK_BLUE,
    bgBase: '#0f172a',
    bgSurface: '#1e293b',
    primary: '#22d3ee',
    accent: '#c084fc',
  },
  'mobile-blue': { ...DARK_BLUE, bgBase: '#1e293b', bgSurface: '#0f172a', primary: '#3b82f6' },
  'tailwind-dark': {
    ...DARK_BLUE,
    bgBase: '#0a0a0a',
    bgSurface: '#171717',
    bgElevated: '#262626',
    primary: '#ffffff',
    primaryHover: '#e5e5e5',
    accent: '#a3a3a3',
    text: '#fafafa',
  },
  'showcase-flat': {
    ...DARK_BLUE,
    bgBase: '#0f1117',
    bgSurface: '#1e293b',
    primary: '#38bdf8',
    accent: '#a78bfa',
  },
};

function colorsFromTheme(theme: ThemeSpec | undefined): ThemeColors {
  const base = PRESETS[theme?.preset ?? DEFAULT_THEME_PRESET] ?? PRESETS[DEFAULT_THEME_PRESET];
  const c: ThemeColors = { ...base };
  if (theme?.primary) c.primary = theme.primary;
  if (theme?.secondary) c.secondary = theme.secondary;
  if (theme?.accent) c.accent = theme.accent;
  if (theme?.background) c.bgBase = theme.background;
  return c;
}

function isNeuralPreset(theme: ThemeSpec | undefined): boolean {
  return (theme?.preset ?? DEFAULT_THEME_PRESET) === 'neural';
}

const NEURAL_FONT_FACE_CSS = `
@font-face {
  font-family: 'Orbitron';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('${fontAssetUrl('orbitron-latin-500-normal.woff2')}') format('woff2');
}
@font-face {
  font-family: 'Orbitron';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('${fontAssetUrl('orbitron-latin-700-normal.woff2')}') format('woff2');
}
@font-face {
  font-family: 'Exo 2';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('${fontAssetUrl('exo-2-latin-400-normal.woff2')}') format('woff2');
}
@font-face {
  font-family: 'Exo 2';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('${fontAssetUrl('exo-2-latin-500-normal.woff2')}') format('woff2');
}
@font-face {
  font-family: 'Exo 2';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('${fontAssetUrl('exo-2-latin-600-normal.woff2')}') format('woff2');
}
`.trim();

const NEURAL_ENHANCEMENTS_CSS = `
body {
  background: var(--ha-bg-base);
}
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath d='M48 0H0v48' fill='none' stroke='rgba(79,124,255,0.05)' stroke-width='1'/%3E%3C/svg%3E");
  background-size: 48px 48px;
  pointer-events: none;
  z-index: 0;
}
.ha-app { position: relative; z-index: 1; }

.ha-header {
  background: rgba(10, 14, 36, 0.92);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(79, 124, 255, 0.18);
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.45);
}
.ha-header__title {
  font-family: 'Orbitron', var(--ha-font-body);
  letter-spacing: 0.05em;
  color: var(--ha-primary);
}

.ha-card, .ha-metric, .ha-history__item, .ha-habit-card, .ha-mode__opt {
  background: rgba(10, 14, 36, 0.88);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(79, 124, 255, 0.14);
  box-shadow: 0 0 28px rgba(79, 124, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
.ha-card:hover, .ha-history__item:hover {
  border-color: rgba(79, 124, 255, 0.28);
  box-shadow: 0 0 36px rgba(79, 124, 255, 0.09), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.ha-btn {
  background: var(--ha-primary);
  box-shadow: 0 0 22px rgba(79, 124, 255, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.18);
}
.ha-btn:hover {
  background: var(--ha-primary-hover);
  box-shadow: 0 0 32px rgba(79, 124, 255, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.22);
}
.ha-btn--accent {
  background: var(--ha-accent);
  color: #fff;
  box-shadow: 0 0 22px rgba(124, 156, 255, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.ha-input, .ha-textarea, .ha-select {
  background: rgba(5, 8, 24, 0.65);
  border-color: rgba(79, 124, 255, 0.12);
}
.ha-input:focus, .ha-textarea:focus, .ha-select:focus {
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--ha-primary) 22%, transparent),
    0 0 18px rgba(79, 124, 255, 0.12);
}

.ha-tab--active {
  text-shadow: 0 0 14px color-mix(in srgb, var(--ha-primary) 55%, transparent);
}
.ha-pills .ha-tab--active {
  box-shadow: 0 0 16px rgba(79, 124, 255, 0.35);
}

.ha-sidebar {
  background: rgba(6, 10, 28, 0.96);
  border-right: 1px solid rgba(79, 124, 255, 0.12);
}
.ha-sidebar__item--active {
  box-shadow: inset 0 0 20px rgba(79, 124, 255, 0.06);
}

.ha-footer-status__dot {
  animation: ha-neural-pulse 2.4s ease-in-out infinite;
}
@keyframes ha-neural-pulse {
  0%, 100% { box-shadow: 0 0 8px var(--ha-success); opacity: 1; }
  50% { box-shadow: 0 0 16px var(--ha-success), 0 0 24px rgba(0, 255, 163, 0.4); opacity: 0.85; }
}

.ha-score-ring {
  filter: drop-shadow(0 0 12px color-mix(in srgb, var(--ha-primary) 40%, transparent));
}
.ha-bar-row__fill, .ha-progress__fill {
  background: var(--ha-primary);
  box-shadow: 0 0 12px rgba(79, 124, 255, 0.35);
}

.ha-bubble--user {
  background: var(--ha-primary);
  box-shadow: 0 0 16px rgba(79, 124, 255, 0.2);
}
`.trim();

/** Returns CSS variable block + reset + base widget styles. */
export function renderThemeCss(theme: ThemeSpec | undefined): string {
  const c = colorsFromTheme(theme);
  const neural = isNeuralPreset(theme);
  const radius = theme?.radius ?? (neural ? 10 : 12);
  const density = theme?.density ?? 'comfortable';
  const padBase = density === 'compact' ? 12 : density === 'mobile' ? 14 : 16;
  const bodyFont = theme?.font?.body ?? (neural ? '"Exo 2", system-ui, sans-serif' : 'system-ui, -apple-system, "Segoe UI", Inter, sans-serif');
  const monoFont = theme?.font?.mono ?? '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace';

  return `
:root {
  --ha-bg-base: ${c.bgBase};
  --ha-bg-surface: ${c.bgSurface};
  --ha-bg-elevated: ${c.bgElevated};
  --ha-border: ${c.border};
  --ha-border-strong: ${c.borderStrong};
  --ha-text: ${c.text};
  --ha-text-muted: ${c.textMuted};
  --ha-text-dim: ${c.textDim};
  --ha-primary: ${c.primary};
  --ha-primary-hover: ${c.primaryHover};
  --ha-secondary: ${c.secondary};
  --ha-accent: ${c.accent};
  --ha-success: ${c.success};
  --ha-warn: ${c.warn};
  --ha-danger: ${c.danger};
  --ha-info: ${c.info};
  --ha-radius: ${radius}px;
  --ha-radius-sm: ${Math.max(4, radius - 4)}px;
  --ha-pad: ${padBase}px;
  --ha-pad-sm: ${Math.max(8, padBase - 4)}px;
  --ha-pad-lg: ${padBase + 8}px;
  --ha-font-body: ${bodyFont};
  --ha-font-mono: ${monoFont};
  --ha-transition: 180ms cubic-bezier(.4,0,.2,1);
  --ha-shadow: 0 8px 24px rgba(0,0,0,0.25);
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--ha-bg-base);
  color: var(--ha-text);
  font-family: var(--ha-font-body);
  font-size: 15px;
  line-height: 1.5;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
a { color: var(--ha-primary); text-decoration: none; }
a:hover { text-decoration: underline; }
code, pre, .ha-mono { font-family: var(--ha-font-mono); }
button { font-family: inherit; }

.ha-app { min-height: 100vh; display: flex; flex-direction: column; }
.ha-app__main { flex: 1; padding: var(--ha-pad-lg); }
.ha-container { max-width: 1080px; margin: 0 auto; width: 100%; }
.ha-stack { display: flex; flex-direction: column; gap: var(--ha-pad); }
.ha-row { display: flex; gap: var(--ha-pad); flex-wrap: wrap; }
.ha-col { display: flex; flex-direction: column; gap: var(--ha-pad); flex: 1; }

/* Header */
.ha-header {
  display: flex; align-items: center; gap: 14px;
  padding: var(--ha-pad-lg);
  background: var(--ha-bg-surface);
  border-bottom: 1px solid var(--ha-border);
}
.ha-header--sticky { position: sticky; top: 0; z-index: 10; backdrop-filter: blur(8px); }
.ha-header__icon { font-size: 28px; display: flex; align-items: center; }
.ha-icon {
  width: 1.25em; height: 1.25em;
  display: inline-flex; align-items: center; justify-content: center;
  vertical-align: middle; color: var(--ha-primary); flex-shrink: 0;
}
.ha-icon svg { width: 100%; height: 100%; display: block; }
.ha-icon img { width: 100%; height: 100%; object-fit: contain; display: block; }
.ha-icon--inline { width: 1em; height: 1em; }
.ha-header__icon .ha-icon { width: 28px; height: 28px; }
.ha-icon--hero { width: 36px; height: 36px; }
.ha-icon.ha-empty__icon { width: 36px; height: 36px; margin: 0 auto 8px; display: flex; color: var(--ha-text-muted); }
.ha-icon--dropzone { width: 32px; height: 32px; margin: 0 auto 8px; }
.ha-icon--nav { width: 18px; height: 18px; }
.ha-icon--lucide {
  display: inline-block;
  background-color: currentColor;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-size: contain;
  mask-size: contain;
}
.ha-icon--nav-fallback { width: auto; height: auto; font-size: 18px; line-height: 1; color: var(--ha-text-muted); }
.ha-icon--metric { width: 20px; height: 20px; margin-bottom: 4px; }
.ha-mode__opt-icon.ha-icon { width: 22px; height: 22px; margin: 0 auto 6px; display: flex; }
.ha-icon--text { width: auto; height: auto; font-size: inherit; color: inherit; }
.ha-bottom-nav__item .ha-icon { width: 20px; height: 20px; margin-bottom: 2px; }
.ha-header__title { font-size: 20px; font-weight: 700; margin: 0; }
.ha-header__subtitle { color: var(--ha-text-muted); font-size: 13px; margin: 2px 0 0; }
.ha-header__actions { margin-left: auto; display: flex; gap: 8px; }

/* Card */
.ha-card {
  background: var(--ha-bg-surface);
  border: 1px solid var(--ha-border);
  border-radius: var(--ha-radius);
  padding: var(--ha-pad-lg);
  margin-bottom: var(--ha-pad);
}
.ha-card:last-child { margin-bottom: 0; }
.ha-card__title { font-size: 16px; font-weight: 600; margin: 0 0 8px; }
.ha-card__subtitle { color: var(--ha-text-muted); font-size: 13px; margin: 0 0 12px; }
.ha-text--strong { font-weight: 600; color: var(--ha-text); margin: 0; }
.ha-list { display: flex; flex-direction: column; gap: var(--ha-pad); }
.ha-list__item { padding: var(--ha-pad); border: 1px solid var(--ha-border); border-radius: var(--ha-radius-sm); background: var(--ha-bg-surface); }
.ha-markdown { font-size: 14px; color: var(--ha-text-muted); line-height: 1.6; }
.ha-markdown p { margin: 0 0 8px; }
.ha-markdown p:last-child { margin-bottom: 0; }

/* Inputs */
.ha-field { display: flex; flex-direction: column; gap: 6px; }
.ha-label { font-size: 13px; font-weight: 500; color: var(--ha-text); }
.ha-label__req { color: var(--ha-danger); margin-left: 2px; }
.ha-help { font-size: 12px; color: var(--ha-text-muted); }
.ha-input, .ha-textarea, .ha-select {
  background: var(--ha-bg-base);
  color: var(--ha-text);
  border: 1px solid var(--ha-border-strong);
  border-radius: var(--ha-radius-sm);
  padding: 10px 12px;
  font: inherit;
  width: 100%;
  transition: border-color var(--ha-transition), box-shadow var(--ha-transition);
}
.ha-input:focus, .ha-textarea:focus, .ha-select:focus {
  outline: none;
  border-color: var(--ha-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ha-primary) 25%, transparent);
}
.ha-textarea { resize: vertical; min-height: 96px; font-family: inherit; }
.ha-textarea--code { font-family: var(--ha-font-mono); font-size: 13px; }

/* Buttons */
.ha-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 16px;
  border-radius: var(--ha-radius-sm);
  border: 1px solid transparent;
  background: var(--ha-primary); color: white;
  font-weight: 600; cursor: pointer;
  transition: background var(--ha-transition), transform var(--ha-transition);
}
.ha-btn:hover { background: var(--ha-primary-hover); }
.ha-btn:active { transform: translateY(1px); }
.ha-btn:disabled { opacity: .6; cursor: not-allowed; }
.ha-btn--secondary { background: transparent; color: var(--ha-text); border-color: var(--ha-border-strong); }
.ha-btn--secondary:hover { background: var(--ha-bg-elevated); }
.ha-btn--ghost { background: transparent; color: var(--ha-text-muted); }
.ha-btn--danger { background: var(--ha-danger); }
.ha-btn--success { background: var(--ha-success); }
.ha-btn--warn { background: var(--ha-warn); color: #1a1a1a; }
.ha-btn--accent { background: var(--ha-accent); color: #0a0a0a; }
.ha-btn--sm { padding: 6px 10px; font-size: 13px; }
.ha-btn--lg { padding: 14px 22px; font-size: 16px; }
.ha-btn--block { width: 100%; }

/* Chips / chip-group / tag-input */
.ha-chip-group { display: flex; flex-wrap: wrap; gap: 8px; }
.ha-chip {
  padding: 6px 12px;
  background: var(--ha-bg-elevated);
  border: 1px solid var(--ha-border);
  border-radius: 999px;
  font-size: 13px; cursor: pointer;
  transition: all var(--ha-transition);
}
.ha-chip--active, .ha-chip[aria-pressed="true"] {
  background: color-mix(in srgb, var(--ha-primary) 18%, var(--ha-bg-elevated));
  border-color: var(--ha-primary); color: var(--ha-primary);
}
.ha-tag {
  padding: 4px 10px; border-radius: 999px;
  background: var(--ha-bg-elevated); border: 1px solid var(--ha-border);
  font-size: 12px;
}
.ha-tag--primary { color: var(--ha-primary); border-color: color-mix(in srgb, var(--ha-primary) 50%, transparent); }
.ha-tag--accent { color: var(--ha-accent); }
.ha-tag--success { color: var(--ha-success); }
.ha-tag--warn { color: var(--ha-warn); }
.ha-tag--danger { color: var(--ha-danger); }

/* Tabs / nav */
.ha-tabs-wrap { max-width: 100%; min-width: 0; }
.ha-tabs {
  display: flex; gap: 4px; border-bottom: 1px solid var(--ha-border); margin-bottom: var(--ha-pad);
  overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; max-width: 100%;
}
.ha-tabs::-webkit-scrollbar { display: none; }
.ha-tab {
  padding: 10px 16px;
  background: none; border: none;
  color: var(--ha-text-muted);
  font: inherit; cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color var(--ha-transition), border-color var(--ha-transition);
  flex-shrink: 0; white-space: nowrap;
}
.ha-tab:hover { color: var(--ha-text); }
.ha-tab--active { color: var(--ha-primary); border-bottom-color: var(--ha-primary); }
.ha-tab-panel { display: none; }
.ha-tab-panel--active { display: block; }

.ha-pills {
  display: flex; max-width: 100%;
  overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none;
  padding: 4px; background: var(--ha-bg-elevated); border-radius: var(--ha-radius); gap: 4px;
}
.ha-pills::-webkit-scrollbar { display: none; }
.ha-pills .ha-tab { padding: 6px 10px; border-radius: var(--ha-radius-sm); border: none; font-size: 13px; }
.ha-pills .ha-tab--active { background: var(--ha-primary); color: white; }

/* Sidebar */
.ha-shell { display: flex; min-height: 100vh; }
.ha-sidebar {
  width: 240px;
  background: var(--ha-bg-surface);
  border-right: 1px solid var(--ha-border);
  display: flex; flex-direction: column;
  padding: var(--ha-pad);
  gap: 4px;
}
.ha-sidebar__item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: var(--ha-radius-sm);
  cursor: pointer; color: var(--ha-text-muted);
  font: inherit; background: none; border: none; text-align: left;
}
.ha-sidebar__item:hover { background: var(--ha-bg-elevated); color: var(--ha-text); }
.ha-sidebar__item--active { background: color-mix(in srgb, var(--ha-primary) 14%, transparent); color: var(--ha-primary); }
.ha-shell__main { flex: 1; padding: var(--ha-pad-lg); overflow-y: auto; }

/* Bottom nav (mobile-shell) */
.ha-bottom-nav {
  display: flex; justify-content: space-around;
  background: var(--ha-bg-surface);
  border-top: 1px solid var(--ha-border);
  padding: 10px env(safe-area-inset-right) calc(10px + env(safe-area-inset-bottom)) env(safe-area-inset-left);
  position: sticky; bottom: 0;
}
.ha-bottom-nav__item {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  font: inherit; background: none; border: none; color: var(--ha-text-muted); cursor: pointer;
  font-size: 11px;
}
.ha-bottom-nav__item--active { color: var(--ha-primary); }

/* Status banner / toast */
.ha-status { padding: 12px 16px; border-radius: var(--ha-radius-sm); border: 1px solid var(--ha-border); display: flex; align-items: center; gap: 10px; }
.ha-status--success { background: color-mix(in srgb, var(--ha-success) 12%, transparent); border-color: var(--ha-success); color: var(--ha-success); }
.ha-status--warn { background: color-mix(in srgb, var(--ha-warn) 12%, transparent); border-color: var(--ha-warn); color: var(--ha-warn); }
.ha-status--danger { background: color-mix(in srgb, var(--ha-danger) 12%, transparent); border-color: var(--ha-danger); color: var(--ha-danger); }
.ha-status--info { background: color-mix(in srgb, var(--ha-info) 12%, transparent); border-color: var(--ha-info); color: var(--ha-info); }

.ha-toast-host { position: fixed; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 9999; }
.ha-toast { padding: 12px 16px; background: var(--ha-bg-surface); border: 1px solid var(--ha-border-strong); border-radius: var(--ha-radius-sm); box-shadow: var(--ha-shadow); max-width: 360px; }

/* Spinner */
.ha-spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: ha-spin 0.7s linear infinite; }
@keyframes ha-spin { to { transform: rotate(360deg); } }
.ha-loading-row { display: flex; align-items: center; gap: 10px; color: var(--ha-text-muted); padding: var(--ha-pad); }

/* Score ring */
.ha-score-ring {
  --val: 0;
  --tone: var(--ha-primary);
  width: 120px; height: 120px; border-radius: 50%;
  background: conic-gradient(var(--tone) calc(var(--val) * 1%), var(--ha-bg-elevated) 0);
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.ha-score-ring__inner {
  width: 96px; height: 96px; border-radius: 50%; background: var(--ha-bg-surface);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.ha-score-ring__value { font-size: 24px; font-weight: 700; }
.ha-score-ring__label { font-size: 11px; color: var(--ha-text-muted); }

/* Bar chart */
.ha-bar-chart { display: flex; flex-direction: column; gap: 10px; }
.ha-bar-row { display: grid; grid-template-columns: 1fr 2fr auto; gap: 10px; align-items: center; }
.ha-bar-row__label { font-size: 13px; color: var(--ha-text-muted); }
.ha-bar-row__track { background: var(--ha-bg-elevated); height: 8px; border-radius: 999px; overflow: hidden; }
.ha-bar-row__fill { height: 100%; background: var(--ha-primary); border-radius: 999px; transition: width 600ms cubic-bezier(.4,0,.2,1); }
.ha-bar-row__value { font-size: 12px; color: var(--ha-text); font-variant-numeric: tabular-nums; }

/* Progress bar */
.ha-progress { width: 100%; height: 8px; background: var(--ha-bg-elevated); border-radius: 999px; overflow: hidden; }
.ha-progress__fill { height: 100%; background: var(--ha-primary); transition: width 400ms ease; }

/* Metric grid / stat row */
.ha-metric-grid { display: grid; gap: var(--ha-pad); }
.ha-metric {
  background: var(--ha-bg-surface);
  border: 1px solid var(--ha-border);
  border-radius: var(--ha-radius);
  padding: var(--ha-pad);
}
.ha-metric__value { font-size: 22px; font-weight: 700; color: var(--ha-primary); }
.ha-metric__label { color: var(--ha-text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
.ha-metric__sublabel { color: var(--ha-text-dim); font-size: 11px; margin-top: 4px; }

/* Data table */
.ha-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ha-table th, .ha-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--ha-border); }
.ha-table th { color: var(--ha-text-muted); font-weight: 500; text-transform: uppercase; font-size: 11px; letter-spacing: .04em; }
.ha-table tr:hover td { background: color-mix(in srgb, var(--ha-bg-elevated) 60%, transparent); }

/* KV grid */
.ha-kv { display: grid; gap: 12px; }
.ha-kv__row { display: flex; flex-direction: column; gap: 2px; }
.ha-kv__key { font-size: 11px; color: var(--ha-text-muted); text-transform: uppercase; letter-spacing: .04em; }
.ha-kv__val { font-size: 14px; color: var(--ha-text); word-break: break-word; }

/* History grid */
.ha-history { display: grid; gap: var(--ha-pad); }
.ha-history__item {
  background: var(--ha-bg-surface);
  border: 1px solid var(--ha-border);
  border-radius: var(--ha-radius);
  padding: var(--ha-pad);
  cursor: pointer;
  transition: border-color var(--ha-transition), transform var(--ha-transition);
}
.ha-history__item:hover { border-color: var(--ha-primary); transform: translateY(-1px); }
.ha-history__title { font-weight: 600; }
.ha-history__subtitle { font-size: 12px; color: var(--ha-text-muted); margin-top: 2px; }
.ha-history__meta { font-size: 11px; color: var(--ha-text-dim); margin-top: 6px; }

/* Habit grid (showcase) */
.ha-habit-grid { display: grid; gap: var(--ha-pad); }
.ha-habit-card { background: var(--ha-bg-surface); border: 1px solid var(--ha-border); border-radius: var(--ha-radius); padding: var(--ha-pad-lg); }
.ha-habit-card__name { font-weight: 700; font-size: 16px; }
.ha-habit-card__desc { color: var(--ha-text-muted); font-size: 13px; margin-top: 4px; }
.ha-habit-card__meta { display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap; }

/* Mode selector */
.ha-mode { display: flex; gap: 8px; flex-wrap: wrap; }
.ha-mode__opt {
  flex: 1 1 160px;
  padding: var(--ha-pad);
  background: var(--ha-bg-surface);
  border: 1px solid var(--ha-border);
  border-radius: var(--ha-radius);
  cursor: pointer;
  font: inherit;
  text-align: left; color: var(--ha-text);
  transition: all var(--ha-transition);
}
.ha-mode__opt:hover { border-color: var(--ha-primary); }
.ha-mode__opt--active { border-color: var(--ha-primary); background: color-mix(in srgb, var(--ha-primary) 12%, var(--ha-bg-surface)); }
.ha-mode__opt-icon { font-size: 22px; margin-bottom: 6px; display: block; }
.ha-mode__opt-label { font-weight: 600; }
.ha-mode__opt-desc { font-size: 12px; color: var(--ha-text-muted); margin-top: 4px; }

/* Chat */
.ha-chat { display: flex; flex-direction: column; height: 100%; gap: var(--ha-pad); }
.ha-chat__thread { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding: var(--ha-pad); }
.ha-bubble { padding: 10px 14px; border-radius: var(--ha-radius); max-width: 80%; line-height: 1.5; word-wrap: break-word; }
.ha-bubble--user { background: var(--ha-primary); color: white; align-self: flex-end; }
.ha-bubble--assistant { background: var(--ha-bg-elevated); color: var(--ha-text); align-self: flex-start; }
.ha-bubble--tool { font-size: 11px; color: var(--ha-text-muted); align-self: flex-start; font-family: var(--ha-font-mono); }
.ha-chat__input { display: flex; gap: 8px; padding: var(--ha-pad); border-top: 1px solid var(--ha-border); background: var(--ha-bg-surface); }
.ha-chat__input textarea { flex: 1; resize: none; }

/* Streaming panel */
.ha-stream { display: flex; flex-direction: column; gap: 8px; }
.ha-stream__item { background: var(--ha-bg-surface); border: 1px solid var(--ha-border); border-radius: var(--ha-radius-sm); padding: 12px; }
.ha-stream__item--completed { border-left: 3px solid var(--ha-success); }
.ha-stream__item--failed { border-left: 3px solid var(--ha-danger); }
.ha-stream__item--running { border-left: 3px solid var(--ha-warn); }
.ha-stream__head { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; }
.ha-stream__body { margin-top: 8px; font-family: var(--ha-font-mono); font-size: 12px; color: var(--ha-text-muted); white-space: pre-wrap; }

/* Empty state */
.ha-empty { text-align: center; padding: 40px var(--ha-pad); color: var(--ha-text-muted); }
.ha-empty__icon { font-size: 36px; margin-bottom: 8px; }
.ha-empty__title { font-weight: 600; color: var(--ha-text); }
.ha-empty__sub { font-size: 13px; margin-top: 4px; }

/* Modal / bottom-sheet */
.ha-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: var(--ha-pad); }
.ha-modal { background: var(--ha-bg-surface); border-radius: var(--ha-radius); border: 1px solid var(--ha-border-strong); padding: var(--ha-pad-lg); max-width: 560px; width: 100%; max-height: 90vh; overflow: auto; }
.ha-sheet { position: fixed; left: 0; right: 0; bottom: 0; background: var(--ha-bg-surface); border-top-left-radius: var(--ha-radius); border-top-right-radius: var(--ha-radius); padding: var(--ha-pad-lg); z-index: 100; box-shadow: var(--ha-shadow); max-height: 80vh; overflow: auto; }

/* Footer status */
.ha-footer-status { display: flex; align-items: center; gap: 10px; padding: 8px var(--ha-pad-lg); background: var(--ha-bg-surface); border-top: 1px solid var(--ha-border); font-size: 12px; color: var(--ha-text-muted); }
.ha-footer-status__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ha-success); box-shadow: 0 0 8px var(--ha-success); }
.ha-footer-status__dot--idle { background: var(--ha-text-dim); box-shadow: none; }
.ha-footer-status__dot--warn { background: var(--ha-warn); }
.ha-footer-status__dot--error { background: var(--ha-danger); }

/* File upload */
.ha-dropzone {
  border: 2px dashed var(--ha-border-strong);
  border-radius: var(--ha-radius);
  padding: var(--ha-pad-lg);
  text-align: center;
  cursor: pointer;
  transition: all var(--ha-transition);
  background: color-mix(in srgb, var(--ha-bg-elevated) 30%, transparent);
}
.ha-dropzone:hover, .ha-dropzone--drag { border-color: var(--ha-primary); background: color-mix(in srgb, var(--ha-primary) 8%, transparent); }
.ha-dropzone__icon { font-size: 32px; margin-bottom: 8px; }
.ha-dropzone__hint { font-size: 13px; color: var(--ha-text-muted); margin-top: 4px; }
.ha-dropzone__preview { max-width: 240px; max-height: 240px; margin: 10px auto 0; border-radius: var(--ha-radius-sm); }
.ha-dropzone input[type="file"] { display: none; }

/* Repeatable */
.ha-repeat-row { display: flex; gap: 8px; align-items: flex-end; padding: 10px; background: var(--ha-bg-base); border-radius: var(--ha-radius-sm); border: 1px solid var(--ha-border); }
.ha-repeat-row .ha-field { flex: 1; }

/* Likert */
.ha-likert { display: flex; gap: 8px; justify-content: space-between; }
.ha-likert__opt { flex: 1; padding: 10px; background: var(--ha-bg-elevated); border: 1px solid var(--ha-border); border-radius: var(--ha-radius-sm); cursor: pointer; text-align: center; font: inherit; color: var(--ha-text); }
.ha-likert__opt--active { background: var(--ha-primary); color: white; border-color: var(--ha-primary); }

/* Responsive */
@media (max-width: 720px) {
  .ha-shell { flex-direction: column; }
  .ha-sidebar { width: 100%; flex-direction: row; overflow-x: auto; }
  .ha-app__main, .ha-shell__main { padding: var(--ha-pad); }
}

${neural ? NEURAL_FONT_FACE_CSS : ''}
${neural ? NEURAL_ENHANCEMENTS_CSS : ''}
${theme?.customCss ?? ''}
`.trim();
}
