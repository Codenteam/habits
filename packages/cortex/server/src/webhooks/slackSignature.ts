import * as crypto from 'crypto';

export interface VerifySlackRequestSignatureParams {
  signingSecret: string | undefined;
  rawBody: Buffer | string | undefined;
  timestamp: string | undefined;
  signature: string | undefined;
  maxAgeSeconds?: number;
}

export interface VerifySlackRequestSignatureResult {
  valid: boolean;
  reason?: string;
}

/**
 * Verify an incoming Slack Events API request using the signing secret.
 * @see https://docs.slack.dev/authentication/verifying-requests-from-slack/
 */
export function verifySlackRequestSignature(
  params: VerifySlackRequestSignatureParams,
): VerifySlackRequestSignatureResult {
  const {
    signingSecret,
    rawBody,
    timestamp,
    signature,
    maxAgeSeconds = 60 * 5,
  } = params;

  if (!signingSecret) {
    console.log('[cortex] Slack signature — FAILED: HABITS_SLACK_SIGNING_SECRET not configured');
    return { valid: false, reason: 'HABITS_SLACK_SIGNING_SECRET not configured' };
  }

  if (!timestamp || !signature) {
    console.log('[cortex] Slack signature — FAILED: missing Slack signature headers');
    return { valid: false, reason: 'Missing X-Slack-Signature or X-Slack-Request-Timestamp' };
  }

  const requestTs = Number(timestamp);
  if (!Number.isFinite(requestTs)) {
    console.log('[cortex] Slack signature — FAILED: invalid timestamp');
    return { valid: false, reason: 'Invalid X-Slack-Request-Timestamp' };
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - requestTs);
  if (ageSeconds > maxAgeSeconds) {
    console.log('[cortex] Slack signature — FAILED: request timestamp too old');
    return { valid: false, reason: 'Request timestamp is too old' };
  }

  const body = rawBody == null
    ? ''
    : typeof rawBody === 'string'
      ? rawBody
      : rawBody.toString('utf8');

  const sigBasestring = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac('sha256', signingSecret).update(sigBasestring).digest('hex');
  const expectedSignature = `v0=${hmac}`;

  const expectedBuf = Buffer.from(expectedSignature, 'utf8');
  const receivedBuf = Buffer.from(signature, 'utf8');

  if (expectedBuf.length !== receivedBuf.length) {
    console.log('[cortex] Slack signature — INVALID: signature mismatch');
    return { valid: false, reason: 'Signature mismatch' };
  }

  const valid = crypto.timingSafeEqual(expectedBuf, receivedBuf);
  console.log(`[cortex] Slack signature — ${valid ? 'VALID' : 'INVALID: signature mismatch'}`);

  return valid
    ? { valid: true }
    : { valid: false, reason: 'Signature mismatch' };
}

export function getSlackSignatureHeaders(
  headers: Record<string, string | string[] | undefined>,
): { timestamp?: string; signature?: string } {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key.toLowerCase(),
      Array.isArray(value) ? value[0] : value,
    ]),
  );

  return {
    timestamp: normalized['x-slack-request-timestamp'],
    signature: normalized['x-slack-signature'],
  };
}
