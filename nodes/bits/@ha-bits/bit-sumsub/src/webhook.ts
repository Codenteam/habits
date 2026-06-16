/**
 * Sumsub webhook helpers — signature verification and event normalization.
 * @see https://docs.sumsub.com/docs/webhook-manager
 */

import { createHmac } from 'crypto';

export interface SumsubWebhookPayload {
  applicantId?: string;
  inspectionId?: string;
  correlationId?: string;
  externalUserId?: string;
  type?: string;
  reviewStatus?: string;
  reviewResult?: {
    reviewAnswer?: string;
    moderationComment?: string;
    clientComment?: string;
    rejectLabels?: string[];
    reviewRejectType?: string;
  };
  createdAtMs?: string;
  clientId?: string;
  [key: string]: unknown;
}

export interface WebhookFilterPayload {
  body: SumsubWebhookPayload;
  headers: Record<string, string>;
  query: Record<string, string>;
  method: string;
}

const HANDLED_WEBHOOK_TYPES = new Set([
  'applicantCreated',
  'applicantPending',
  'applicantReviewed',
  'applicantOnHold',
  'applicantWorkflowCompleted',
  'applicantWorkflowFailed',
]);

const DIGEST_ALG_MAP: Record<string, string> = {
  HMAC_SHA1_HEX: 'sha1',
  HMAC_SHA256_HEX: 'sha256',
  HMAC_SHA512_HEX: 'sha512',
};

function headerValue(headers: Record<string, string>, name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers || {})) {
    if (key.toLowerCase() === lower) {
      return value;
    }
  }
  return undefined;
}

export function verifySumsubWebhookDigest(
  payload: WebhookFilterPayload,
  secret: string,
): boolean {
  const digest = headerValue(payload.headers, 'x-payload-digest');
  const digestAlg = headerValue(payload.headers, 'x-payload-digest-alg');
  if (!digest || !digestAlg) {
    return false;
  }

  const nodeAlgo = DIGEST_ALG_MAP[digestAlg];
  if (!nodeAlgo) {
    return false;
  }

  const bodyString = JSON.stringify(payload.body ?? {});
  const calculated = createHmac(nodeAlgo, secret).update(bodyString).digest('hex');
  return calculated.toLowerCase() === digest.toLowerCase();
}

export function shouldHandleSumsubWebhook(
  payload: WebhookFilterPayload,
  webhookSecret?: string,
): boolean {
  const body = payload.body;
  if (!body?.type || !HANDLED_WEBHOOK_TYPES.has(body.type)) {
    return false;
  }

  if (webhookSecret) {
    return verifySumsubWebhookDigest(payload, webhookSecret);
  }

  return true;
}

export function normalizeSumsubWebhookEvent(body: SumsubWebhookPayload) {
  const reviewAnswer = body.reviewResult?.reviewAnswer ?? null;
  const reviewStatus = body.reviewStatus ?? null;
  const completed = reviewStatus === 'completed';
  const approved = completed && reviewAnswer === 'GREEN';
  const declined = completed && reviewAnswer === 'RED';

  return {
    applicantId: body.applicantId ?? null,
    externalUserId: body.externalUserId ?? null,
    inspectionId: body.inspectionId ?? null,
    correlationId: body.correlationId ?? null,
    webhookType: body.type ?? null,
    reviewStatus,
    reviewAnswer,
    approved,
    declined,
    allowNextSteps: approved,
    blockNextSteps: declined,
    moderationComment: body.reviewResult?.moderationComment ?? null,
    clientComment: body.reviewResult?.clientComment ?? null,
    rejectLabels: body.reviewResult?.rejectLabels ?? [],
    reviewRejectType: body.reviewResult?.reviewRejectType ?? null,
    createdAtMs: body.createdAtMs ?? null,
    raw: body,
  };
}
