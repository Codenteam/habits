import type { Request } from 'express';
import { validateHubSpotV3Signature } from './hubspotSignature';
import { validateSlackSignature } from './slackSignature';
import { validateWhatsAppSignature } from './whatsappSignature';

export interface WebhookValidatorParams {
  signature: string;
  rawBody: Buffer | string | undefined;
  req: Request;
  env: Record<string, string | undefined>;
}

export type WebhookValidator = (params: WebhookValidatorParams) => Promise<boolean>;

export interface AuthenticateWebhookResult {
  success: boolean;
  statusCode?: number;
  message?: string;
}

const SIGNATURE_HEADERS = [
  'x-hubspot-signature-v3', // HubSpot webhooks (v3)
  'x-hub-signature-256', // Meta (WhatsApp, etc.)
  'x-slack-signature', // Slack
] as const;

const validators: Record<string, WebhookValidator> = {
  'x-hubspot-signature-v3': validateHubSpotV3Signature,
  'x-hub-signature-256': validateWhatsAppSignature,
  'x-slack-signature': validateSlackSignature,
};

function getHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function registerWebhookValidator(headerName: string, validator: WebhookValidator): void {
  validators[headerName.toLowerCase()] = validator;
}

export function detectSignatureHeader(
  req: Request,
): { headerName: string; signature: string } | null {
  for (const headerName of SIGNATURE_HEADERS) {
    const signature = getHeader(req, headerName);
    if (signature) {
      return { headerName, signature };
    }
  }

  return null;
}

export async function authenticateWebhook(
  req: Request,
  rawBody: Buffer | string | undefined,
  env: Record<string, string | undefined>,
): Promise<AuthenticateWebhookResult> {
  const authHeader = detectSignatureHeader(req);

  if (!authHeader) {
    return { success: true };
  }

  const validator = validators[authHeader.headerName];

  if (!validator) {
    return { success: true };
  }

  const valid = await validator({
    signature: authHeader.signature,
    rawBody,
    req,
    env,
  });

  if (!valid) {
    return {
      success: false,
      statusCode: 401,
      message: 'Invalid webhook signature',
    };
  }

  return { success: true };
}
