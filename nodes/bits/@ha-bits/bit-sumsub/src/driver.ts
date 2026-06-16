/**
 * Sumsub API driver — HMAC-signed requests to the Sumsub REST API.
 * @see https://docs.sumsub.com/reference/authentication
 */

export interface SumsubAuth {
  appToken: string;
  secretKey: string;
  baseUrl?: string;
}

export interface SumsubRequestOptions {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  body?: Record<string, unknown>;
  auth: SumsubAuth;
}

const DEFAULT_BASE_URL = 'https://api.sumsub.com';

const logger = {
  info: (...args: unknown[]) => console.log('[bit-sumsub]', ...args),
  error: (...args: unknown[]) => console.error('[bit-sumsub]', ...args),
};

function normalizeBaseUrl(baseUrl?: string): string {
  const url = (baseUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  return url || DEFAULT_BASE_URL;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  if (typeof globalThis.crypto?.subtle !== 'undefined') {
    const encoder = new TextEncoder();
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(message));
    return Array.from(new Uint8Array(signature))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  const { createHmac } = await import('crypto');
  return createHmac('sha256', secret).update(message).digest('hex');
}

function buildSignaturePayload(
  timestamp: string,
  method: string,
  path: string,
  body?: string,
): string {
  return `${timestamp}${method.toUpperCase()}${path}${body ?? ''}`;
}

export async function sumsubRequest<T = Record<string, unknown>>(
  options: SumsubRequestOptions,
): Promise<T> {
  const { method, path, body, auth } = options;
  const baseUrl = normalizeBaseUrl(auth.baseUrl);
  const bodyString = body ? JSON.stringify(body) : undefined;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await hmacSha256Hex(
    auth.secretKey,
    buildSignaturePayload(timestamp, method, path, bodyString),
  );

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-App-Token': auth.appToken,
    'X-App-Access-Ts': timestamp,
    'X-App-Access-Sig': signature,
  };

  if (bodyString) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: bodyString,
  });

  const responseText = await response.text();
  let parsed: unknown = {};
  if (responseText) {
    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = { raw: responseText };
    }
  }

  if (!response.ok) {
    const error = parsed as { description?: string; errorName?: string; code?: number };
    const message =
      error.description ||
      error.errorName ||
      responseText ||
      `Sumsub API error (${response.status})`;
    logger.error('Request failed', { method, path, status: response.status, message });
    throw new Error(`Sumsub API error (${response.status}): ${message}`);
  }

  return parsed as T;
}

export function buildVerificationUrl(token: string, baseUrl?: string): string {
  const normalized = normalizeBaseUrl(baseUrl);
  const host = normalized.includes('test-api.sumsub.com')
    ? 'https://in.sumsub.com'
    : 'https://in.sumsub.com';
  return `${host}/ids/?accessToken=${encodeURIComponent(token)}`;
}

export async function getApplicantById(auth: SumsubAuth, applicantId: string) {
  return sumsubRequest<{ id: string; externalUserId: string; email?: string; phone?: string }>({
    method: 'GET',
    path: `/resources/applicants/${encodeURIComponent(applicantId)}/one`,
    auth,
  });
}

export interface ParsedImageContent {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

export function parseImageContent(
  contentBase64: string,
  mimeType?: string,
  fileName?: string,
): ParsedImageContent {
  const raw = String(contentBase64 || '').trim();
  if (!raw) {
    throw new Error('Image content is required');
  }

  if (raw.startsWith('data:')) {
    const match = raw.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error('Invalid data URL image content');
    }
    return {
      mimeType: mimeType || match[1],
      buffer: Buffer.from(match[2], 'base64'),
      fileName: fileName || 'upload.bin',
    };
  }

  return {
    mimeType: mimeType || 'image/jpeg',
    buffer: Buffer.from(raw, 'base64'),
    fileName: fileName || 'upload.jpg',
  };
}

export interface UploadDocumentMetadata {
  idDocType: string;
  country: string;
  idDocSubType?: string;
}

export interface UploadDocumentResult {
  idDocType: string;
  country: string;
  idDocSubType?: string;
  imageId?: string | null;
  warnings?: string[];
  errors?: string[];
  raw: Record<string, unknown>;
}

/**
 * Upload a verification document image via multipart/form-data.
 * Multipart requests are signed with timestamp + method + path bytes + raw body bytes.
 */
export async function sumsubUploadDocument(
  auth: SumsubAuth,
  applicantId: string,
  metadata: UploadDocumentMetadata,
  contentBase64: string,
  mimeType?: string,
  fileName?: string,
): Promise<UploadDocumentResult> {
  const FormData = (await import('form-data')).default;
  const { createHmac } = await import('crypto');

  const path = `/resources/applicants/${encodeURIComponent(applicantId)}/info/idDoc`;
  const baseUrl = normalizeBaseUrl(auth.baseUrl);
  const image = parseImageContent(contentBase64, mimeType, fileName);

  const form = new FormData();
  form.append('metadata', JSON.stringify(metadata));
  form.append('content', image.buffer, {
    filename: image.fileName,
    contentType: image.mimeType,
  });

  const bodyBuffer = form.getBuffer() as Buffer;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac('sha256', auth.secretKey)
    .update(Buffer.concat([Buffer.from(`${timestamp}POST${path}`, 'utf8'), bodyBuffer]))
    .digest('hex');

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      ...form.getHeaders(),
      Accept: 'application/json',
      'X-App-Token': auth.appToken,
      'X-App-Access-Ts': timestamp,
      'X-App-Access-Sig': signature,
      'X-Return-Doc-Warnings': 'true',
    },
    body: bodyBuffer as unknown as BodyInit,
  });

  const responseText = await response.text();
  let parsed: Record<string, unknown> = {};
  if (responseText) {
    try {
      parsed = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      parsed = { raw: responseText };
    }
  }

  if (!response.ok) {
    const error = parsed as { description?: string; errorName?: string };
    const message =
      error.description || error.errorName || responseText || `Sumsub API error (${response.status})`;
    logger.error('Document upload failed', { path, status: response.status, message });
    throw new Error(`Sumsub document upload failed (${response.status}): ${message}`);
  }

  return {
    idDocType: String(parsed.idDocType ?? metadata.idDocType),
    country: String(parsed.country ?? metadata.country),
    idDocSubType: (parsed.idDocSubType as string | undefined) ?? metadata.idDocSubType,
    imageId: response.headers.get('x-image-id'),
    warnings: Array.isArray(parsed.warnings) ? (parsed.warnings as string[]) : [],
    errors: Array.isArray(parsed.errors) ? (parsed.errors as string[]) : [],
    raw: parsed,
  };
}

export async function sumsubRequestApplicantCheck(
  auth: SumsubAuth,
  applicantId: string,
  reason?: string,
): Promise<{ ok: boolean; message?: string }> {
  const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
  const path = `/resources/applicants/${encodeURIComponent(applicantId)}/status/pending${query}`;

  try {
    const result = await sumsubRequest<{ ok?: number }>({
      method: 'POST',
      path,
      auth,
    });
    return { ok: result.ok === 1, message: 'Applicant submitted for review' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  }
}
