/**
 * QuickBooks Online driver — Accounting API helpers
 */

const QB_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

const QBO_API_BASE = {
  sandbox: 'https://sandbox-quickbooks.api.intuit.com',
  production: 'https://quickbooks.api.intuit.com',
};

const QBO_MINOR_VERSION = '65';

export type QuickBooksEnvironment = 'sandbox' | 'production';

export interface CreatePaymentInput {
  realmId: string;
  customerId: string;
  amount: number | string;
  currency?: string;
  paymentId?: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  paymentDate?: string;
  privateNote?: string;
}

export interface QuickBooksPaymentResult {
  id: string;
  syncToken?: string;
  totalAmt?: number;
  txnDate?: string;
  privateNote?: string;
  customerRef?: { value?: string; name?: string };
  raw: Record<string, unknown>;
}

function parseAmount(amount: number | string): number {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid payment amount: ${amount}`);
  }
  return Math.round(value * 100) / 100;
}

function formatTxnDate(paymentDate?: string): string {
  if (!paymentDate) {
    return new Date().toISOString().slice(0, 10);
  }
  const parsed = new Date(paymentDate);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

function buildPrivateNote(input: CreatePaymentInput): string {
  if (input.privateNote) {
    return input.privateNote;
  }

  const parts: string[] = [];
  if (input.paymentId) {
    parts.push(`Stripe payment ${input.paymentId}`);
  }
  if (input.description) {
    parts.push(input.description);
  }
  if (input.customerName || input.customerEmail) {
    const customer = [input.customerName, input.customerEmail].filter(Boolean).join(' — ');
    parts.push(`Customer: ${customer}`);
  }
  if (input.currency) {
    parts.push(`Currency: ${input.currency}`);
  }

  return parts.join(' | ') || 'Payment recorded from Habits';
}

export async function quickbooksAccountingRequest(
  accessToken: string,
  environment: QuickBooksEnvironment,
  realmId: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<any> {
  const base = QBO_API_BASE[environment];
  const separator = path.includes('?') ? '&' : '?';
  const url = `${base}/v3/company/${realmId}${path}${separator}minorversion=${QBO_MINOR_VERSION}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const detail =
      data?.Fault?.Error?.map((e: any) => e.Message || e.Detail).join('; ') ||
      JSON.stringify(data);
    throw new Error(`QuickBooks API error (${response.status}): ${detail}`);
  }

  return data;
}

export async function createPayment(
  accessToken: string,
  environment: QuickBooksEnvironment,
  input: CreatePaymentInput,
): Promise<QuickBooksPaymentResult> {
  if (!input.realmId) {
    throw new Error('QuickBooks realmId is required (company ID from OAuth callback)');
  }
  if (!input.customerId) {
    throw new Error('QuickBooks customerId is required (CustomerRef value in your QBO company)');
  }

  const totalAmt = parseAmount(input.amount);
  const payload = {
    TotalAmt: totalAmt,
    TxnDate: formatTxnDate(input.paymentDate),
    CustomerRef: {
      value: String(input.customerId),
    },
    PrivateNote: buildPrivateNote(input),
  };

  const response = await quickbooksAccountingRequest(
    accessToken,
    environment,
    input.realmId,
    'POST',
    '/payment',
    payload,
  );

  const payment = response.Payment || response;
  return {
    id: payment.Id,
    syncToken: payment.SyncToken,
    totalAmt: payment.TotalAmt,
    txnDate: payment.TxnDate,
    privateNote: payment.PrivateNote,
    customerRef: payment.CustomerRef,
    raw: payment,
  };
}

export const quickbooksOAuth = {
  authorizationUrl: QB_AUTH_URL,
  tokenUrl: QB_TOKEN_URL,
};
