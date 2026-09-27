/**
 * Airtable REST API helpers.
 * @see https://airtable.com/developers/web/api/introduction
 */

export const AIRTABLE_API = 'https://api.airtable.com/v0';

export interface AirtableAuth {
  token?: string;
  personalAccessToken?: string;
}

export interface AirtableContext {
  auth?: AirtableAuth | string;
  propsValue: Record<string, unknown>;
}

export function resolveToken(context: AirtableContext): string {
  const fromProps = context.propsValue.personalAccessToken || context.propsValue.token;
  if (typeof fromProps === 'string' && fromProps.trim()) {
    return fromProps.trim();
  }

  const auth = context.auth;
  if (typeof auth === 'string' && auth.trim()) {
    return auth.trim();
  }

  if (auth && typeof auth === 'object') {
    const token = auth.token || auth.personalAccessToken;
    if (typeof token === 'string' && token.trim()) {
      return token.trim();
    }
    const props = (auth as { props?: AirtableAuth }).props;
    const nested = props?.token || props?.personalAccessToken;
    if (typeof nested === 'string' && nested.trim()) {
      return nested.trim();
    }
  }

  throw new Error(
    'Airtable personal access token is required. Set credentials or pass personalAccessToken in params.',
  );
}

export function asString(value: unknown, field: string): string {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${field} is required`);
  }
  return String(value);
}

export function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return String(value);
}

export function parseJsonValue<T>(value: unknown, field: string): T {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${field} is required`);
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      throw new Error(`${field} must be valid JSON`);
    }
  }
  return value as T;
}

export async function airtableRequest<T = unknown>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const url = path.startsWith('http') ? path : `${AIRTABLE_API}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Airtable API error (${response.status}): ${error}`);
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}
