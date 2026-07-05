import type { AppDispatch } from '../store/store';
import {
  loadHabits,
  setEnvVariables,
  setWorkflowName,
} from '../store/slices/workflowSlice';
import {
  clearEnvContent,
  clearFrontendHtml,
  clearFrontendYaml,
  bumpFrontendYamlRevision,
  setFrontendYaml,
  setFrontendHtml,
} from '../store/slices/uiSlice';
import { parseHabitFile, type ParsedStack } from './stackParser';

export const SHOWCASE_ORIGIN = 'https://codenteam.com/intersect/habits';

/** Dev proxy path (see vite.config.ts) avoids CORS when running on localhost. */
function getShowcaseBaseUrl(): string {
  if (import.meta.env.DEV) {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    return `${base}/showcase-remote`;
  }
  return SHOWCASE_ORIGIN;
}

export interface ShowcaseHabitEntry {
  slug: string;
  name: string;
  description: string;
  habitUrl: string;
  thumbnail: string;
  tags: string[];
  difficulty: string;
}

let indexCache: ShowcaseHabitEntry[] | null = null;

export function showcaseAssetUrl(relativePath: string): string {
  if (relativePath.startsWith('http')) return relativePath;
  return `${SHOWCASE_ORIGIN}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
}

export async function fetchShowcaseIndex(): Promise<ShowcaseHabitEntry[]> {
  if (indexCache) return indexCache;

  const base = getShowcaseBaseUrl();
  const response = await fetch(`${base}/showcase/index.json`);
  if (!response.ok) {
    throw new Error(`Failed to load showcase index: HTTP ${response.status}`);
  }

  indexCache = await response.json();
  return indexCache!;
}

export async function downloadShowcaseHabit(slug: string): Promise<ArrayBuffer> {
  const index = await fetchShowcaseIndex();
  const entry = index.find((habit) => habit.slug === slug);
  if (!entry) {
    throw new Error(`Showcase habit "${slug}" not found`);
  }

  const base = getShowcaseBaseUrl();
  const url = `${base}${entry.habitUrl}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download "${entry.name}": HTTP ${response.status}`);
  }

  return response.arrayBuffer();
}

export async function parseShowcaseHabit(slug: string): Promise<ParsedStack> {
  const archive = await downloadShowcaseHabit(slug);
  return parseHabitFile(archive);
}

export function applyParsedStackToStore(parsed: ParsedStack, dispatch: AppDispatch): void {
  dispatch(clearFrontendHtml());
  dispatch(clearFrontendYaml());
  dispatch(clearEnvContent());

  dispatch(loadHabits(parsed.habits));

  if (parsed.config.name) {
    dispatch(setWorkflowName(parsed.config.name));
  }

  if (parsed.frontendHtml) {
    dispatch(setFrontendHtml(parsed.frontendHtml));
  }
  if (parsed.frontendYaml) {
    dispatch(setFrontendYaml(parsed.frontendYaml));
    dispatch(bumpFrontendYamlRevision());
  }
  if (parsed.envVariables && Object.keys(parsed.envVariables).length > 0) {
    dispatch(setEnvVariables(parsed.envVariables));
  }
}

export async function loadShowcaseHabit(slug: string, dispatch: AppDispatch): Promise<ParsedStack> {
  const parsed = await parseShowcaseHabit(slug);
  applyParsedStackToStore(parsed, dispatch);
  return parsed;
}
