import * as crypto from 'crypto';

export interface VerifyWhatsAppRequestSignatureParams {
  appSecret: string | undefined;
  rawBody: Buffer | string | undefined;
  signature: string | undefined;
}

export interface VerifyWhatsAppRequestSignatureResult {
  valid: boolean;
  reason?: string;
}

/**
 * Verify an incoming Meta webhook (WhatsApp, etc.) using X-Hub-Signature-256.
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */
export function verifyWhatsAppRequestSignature(
  params: VerifyWhatsAppRequestSignatureParams,
): VerifyWhatsAppRequestSignatureResult {
  const { appSecret, rawBody, signature } = params;

  if (!appSecret) {
    console.log('[cortex] WhatsApp signature — FAILED: HABITS_WHATSAPP_APP_SECRET not configured');
    return { valid: false, reason: 'HABITS_WHATSAPP_APP_SECRET not configured' };
  }

  if (!signature) {
    console.log('[cortex] WhatsApp signature — FAILED: missing X-Hub-Signature-256 header');
    return { valid: false, reason: 'Missing X-Hub-Signature-256' };
  }

  if (!signature.startsWith('sha256=')) {
    console.log('[cortex] WhatsApp signature — FAILED: invalid signature format');
    return { valid: false, reason: 'Invalid X-Hub-Signature-256 format' };
  }

  const receivedHex = signature.slice('sha256='.length);
  const body = rawBody == null
    ? ''
    : typeof rawBody === 'string'
      ? rawBody
      : rawBody.toString('utf8');

  const expectedHex = crypto.createHmac('sha256', appSecret).update(body).digest('hex');

  const expectedBuf = Buffer.from(expectedHex, 'hex');
  const receivedBuf = Buffer.from(receivedHex, 'hex');

  if (expectedBuf.length !== receivedBuf.length) {
    console.log('[cortex] WhatsApp signature — INVALID: signature mismatch');
    return { valid: false, reason: 'Signature mismatch' };
  }

  const valid = crypto.timingSafeEqual(expectedBuf, receivedBuf);
  console.log(`[cortex] WhatsApp signature — ${valid ? 'VALID' : 'INVALID: signature mismatch'}`);

  return valid
    ? { valid: true }
    : { valid: false, reason: 'Signature mismatch' };
}

export async function validateWhatsAppSignature(params: {
  signature: string;
  rawBody: Buffer | string | undefined;
  env: Record<string, string | undefined>;
}): Promise<boolean> {
  const verification = verifyWhatsAppRequestSignature({
    appSecret: params.env.HABITS_WHATSAPP_APP_SECRET,
    rawBody: params.rawBody,
    signature: params.signature,
  });

  return verification.valid;
}
