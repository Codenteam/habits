import * as crypto from 'crypto';

export interface VerifyShopifyWebhookParams {
  clientSecret: string | undefined;
  rawBody: Buffer | string | undefined;
  hmacHeader: string | undefined;
}

export interface VerifyShopifyWebhookResult {
  valid: boolean;
  reason?: string;
}

/**
 * Verify an incoming Shopify Admin webhook using X-Shopify-Hmac-Sha256.
 * @see https://shopify.dev/docs/apps/build/webhooks/subscribe/https
 */
export function verifyShopifyWebhookHmac(
  params: VerifyShopifyWebhookParams,
): VerifyShopifyWebhookResult {
  const { clientSecret, rawBody, hmacHeader } = params;

  if (!clientSecret) {
    console.log('[cortex] Shopify HMAC — FAILED: HABITS_SHOPIFY_CLIENT_SECRET not configured');
    return { valid: false, reason: 'HABITS_SHOPIFY_CLIENT_SECRET not configured' };
  }

  if (!hmacHeader) {
    console.log('[cortex] Shopify HMAC — FAILED: missing X-Shopify-Hmac-Sha256 header');
    return { valid: false, reason: 'Missing X-Shopify-Hmac-Sha256' };
  }

  const body = rawBody == null
    ? ''
    : typeof rawBody === 'string'
      ? rawBody
      : rawBody.toString('utf8');

  const digest = crypto.createHmac('sha256', clientSecret).update(body, 'utf8').digest('base64');

  const expectedBuf = Buffer.from(digest, 'utf8');
  const receivedBuf = Buffer.from(hmacHeader, 'utf8');

  if (expectedBuf.length !== receivedBuf.length) {
    console.log('[cortex] Shopify HMAC — INVALID: signature mismatch');
    return { valid: false, reason: 'HMAC mismatch' };
  }

  const valid = crypto.timingSafeEqual(expectedBuf, receivedBuf);
  console.log(`[cortex] Shopify HMAC — ${valid ? 'VALID' : 'INVALID: signature mismatch'}`);

  return valid ? { valid: true } : { valid: false, reason: 'HMAC mismatch' };
}

export function getShopifyHmacHeader(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key.toLowerCase(),
      Array.isArray(value) ? value[0] : value,
    ]),
  );

  return normalized['x-shopify-hmac-sha256'];
}

export async function validateShopifySignature(params: {
  signature: string;
  rawBody: Buffer | string | undefined;
  req: { headers: Record<string, string | string[] | undefined> };
  env: Record<string, string | undefined>;
}): Promise<boolean> {
  const hmacHeader = getShopifyHmacHeader(params.req.headers) ?? params.signature;
  const verification = verifyShopifyWebhookHmac({
    clientSecret: params.env.HABITS_SHOPIFY_CLIENT_SECRET,
    rawBody: params.rawBody,
    hmacHeader,
  });

  return verification.valid;
}
