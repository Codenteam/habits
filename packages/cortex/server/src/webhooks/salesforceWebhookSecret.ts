import type { WebhookValidatorParams } from './authenticateWebhook';

export async function validateSalesforceWebhookSecret(
  params: WebhookValidatorParams,
): Promise<boolean> {
  const expected = params.env.SALESFORCE_X_WEBHOOK_SECRET;
  const provided = params.signature;

  if (!expected || !provided) {
    return false;
  }

  return provided === expected;
}
