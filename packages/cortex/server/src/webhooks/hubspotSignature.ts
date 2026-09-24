import * as crypto from 'crypto';
import type { Request } from 'express';

const MAX_ALLOWED_TIMESTAMP_MS = 5 * 60 * 1000;

const HUBSPOT_URI_DECODE_MAP: ReadonlyArray<[string, string]> = [
  ['%3A', ':'],
  ['%2F', '/'],
  ['%3F', '?'],
  ['%40', '@'],
  ['%21', '!'],
  ['%24', '$'],
  ['%27', "'"],
  ['%28', '('],
  ['%29', ')'],
  ['%2A', '*'],
  ['%2C', ','],
  ['%3B', ';'],
];

export interface VerifyHubSpotV3RequestSignatureParams {
  clientSecret: string | undefined;
  method: string;
  requestUri: string;
  rawBody: Buffer | string | undefined;
  timestamp: string | undefined;
  signature: string | undefined;
  maxAgeMs?: number;
}

export interface VerifyHubSpotRequestSignatureResult {
  valid: boolean;
  reason?: string;
}

function normalizeHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key.toLowerCase(),
      Array.isArray(value) ? value[0] : (value ?? ''),
    ]),
  );
}

function rawBodyToString(rawBody: Buffer | string | undefined): string {
  if (rawBody == null) {
    return '';
  }
  return typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
}

/**
 * Decode URL-encoded characters HubSpot expects before v3 signature validation.
 * @see https://developers.hubspot.com/docs/apps/legacy-apps/authentication/validating-requests#validate-the-v3-request-signature
 */
export function decodeHubSpotRequestUri(uri: string): string {
  let decoded = uri;
  for (const [encoded, value] of HUBSPOT_URI_DECODE_MAP) {
    decoded = decoded.split(encoded).join(value);
  }
  return decoded;
}

/**
 * Build the full request URI used in HubSpot v3 signature validation.
 */
export function buildHubSpotRequestUri(req: Request): string {
  const headers = normalizeHeaders(req.headers);
  const protocol = (headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
  const host = (headers['x-forwarded-host'] || headers.host || '').split(',')[0].trim();
  const path = req.originalUrl || req.url || '';
  return decodeHubSpotRequestUri(`${protocol}://${host}${path}`);
}

/**
 * Verify an incoming HubSpot webhook using X-HubSpot-Signature-v3.
 * @see https://developers.hubspot.com/docs/apps/legacy-apps/authentication/validating-requests#validate-the-v3-request-signature
 */
export function verifyHubSpotV3RequestSignature(
  params: VerifyHubSpotV3RequestSignatureParams,
): VerifyHubSpotRequestSignatureResult {
  const {
    clientSecret,
    method,
    requestUri,
    rawBody,
    timestamp,
    signature,
    maxAgeMs = MAX_ALLOWED_TIMESTAMP_MS,
  } = params;

  if (!clientSecret) {
    console.log('[cortex] HubSpot v3 signature — FAILED: HABITS_HUBSPOT_CLIENT_SECRET not configured');
    return { valid: false, reason: 'HABITS_HUBSPOT_CLIENT_SECRET not configured' };
  }

  if (!timestamp || !signature) {
    console.log('[cortex] HubSpot v3 signature — FAILED: missing signature headers');
    return { valid: false, reason: 'Missing X-HubSpot-Signature-v3 or X-HubSpot-Request-Timestamp' };
  }

  const requestTimestamp = Number(timestamp);
  if (!Number.isFinite(requestTimestamp)) {
    console.log('[cortex] HubSpot v3 signature — FAILED: invalid timestamp');
    return { valid: false, reason: 'Invalid X-HubSpot-Request-Timestamp' };
  }

  const ageMs = Date.now() - requestTimestamp;
  if (ageMs > maxAgeMs) {
    console.log('[cortex] HubSpot v3 signature — FAILED: request timestamp too old');
    return { valid: false, reason: 'Request timestamp is too old' };
  }

  const body = rawBodyToString(rawBody);
  const rawString = `${method.toUpperCase()}${requestUri}${body}${timestamp}`;
  const expectedSignature = crypto
    .createHmac('sha256', clientSecret)
    .update(rawString, 'utf8')
    .digest('base64');

  const expectedBuf = Buffer.from(expectedSignature, 'utf8');
  const receivedBuf = Buffer.from(signature, 'utf8');

  if (expectedBuf.length !== receivedBuf.length) {
    console.log('[cortex] HubSpot v3 signature — INVALID: signature mismatch');
    return { valid: false, reason: 'Signature mismatch' };
  }

  const valid = crypto.timingSafeEqual(expectedBuf, receivedBuf);
  console.log(`[cortex] HubSpot v3 signature — ${valid ? 'VALID' : 'INVALID: signature mismatch'}`);

  return valid
    ? { valid: true }
    : { valid: false, reason: 'Signature mismatch' };
}

export function getHubSpotSignatureHeaders(
  headers: Record<string, string | string[] | undefined>,
): { signatureV3?: string; timestamp?: string } {
  const normalized = normalizeHeaders(headers);

  return {
    signatureV3: normalized['x-hubspot-signature-v3'] || undefined,
    timestamp: normalized['x-hubspot-request-timestamp'] || undefined,
  };
}

export async function validateHubSpotV3Signature(params: {
  signature: string;
  rawBody: Buffer | string | undefined;
  req: Request;
  env: Record<string, string | undefined>;
}): Promise<boolean> {
  const { signatureV3, timestamp } = getHubSpotSignatureHeaders(params.req.headers);
  const verification = verifyHubSpotV3RequestSignature({
    clientSecret: params.env.HABITS_HUBSPOT_CLIENT_SECRET,
    method: params.req.method,
    requestUri: buildHubSpotRequestUri(params.req),
    rawBody: params.rawBody,
    timestamp,
    signature: signatureV3 ?? params.signature,
  });

  return verification.valid;
}
