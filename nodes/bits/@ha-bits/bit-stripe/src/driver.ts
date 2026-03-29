/**
 * Stripe Driver - Core business logic for Stripe API interactions
 * 
 * This module contains reusable functions for interacting with the Stripe API.
 * Used by both triggers and actions in the bit definition.
 */

// Simple console logger
const logger = {
  info: (...args: any[]) => console.log('[stripe-driver]', ...args),
  warn: (...args: any[]) => console.warn('[stripe-driver]', ...args),
  error: (...args: any[]) => console.error('[stripe-driver]', ...args),
  debug: (...args: any[]) => console.debug('[stripe-driver]', ...args),
};

// ============================================================================
// Types
// ============================================================================

export interface FetchSuccessfulPaymentsOptions {
  /** Start date for filtering (fetches payments created >= this date) */
  createdGte?: Date;
  /** Number of days to look back (used if createdGte not provided) */
  lastNDays?: number;
  /** Maximum number of payments to fetch */
  limit?: number;
  /** Whether to expand customer data */
  expandCustomer?: boolean;
}

export interface FormattedPayment {
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  created: string;
  customer: {
    id: string | null;
    name: string;
    email: string;
    address: string;
  };
  metadata: Record<string, string>;
  receiptEmail: string;
}

// ============================================================================
// Stripe API Helper
// ============================================================================

export async function stripeRequest(
  endpoint: string,
  method: string,
  secretKey: string,
  body?: Record<string, any>,
  queryParams?: Record<string, any>
): Promise<any> {
  let url = `https://api.stripe.com/v1${endpoint}`;
  
  // Handle query parameters for GET requests
  if (queryParams && Object.keys(queryParams).length > 0) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Handle array params like expand[]
          value.forEach(v => searchParams.append(`${key}[]`, String(v)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    }
    url = `${url}?${searchParams.toString()}`;
  }
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${secretKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }
    options.body = params.toString();
  }

  logger.debug('Stripe API request', { method, url });
  const response = await fetch(url, options);
  const result = await response.json();

  if (!response.ok) {
    logger.error('Stripe API error', { error: result.error });
    throw new Error(`Stripe API Error: ${result.error?.message || 'Unknown error'}`);
  }

  return result;
}

// ============================================================================
// Payment Fetching
// ============================================================================

/**
 * Fetches successful payments from Stripe and formats them consistently.
 * This is the core reusable function used by both the polling trigger and actions.
 */
export async function fetchSuccessfulPayments(
  secretKey: string,
  options: FetchSuccessfulPaymentsOptions = {}
): Promise<FormattedPayment[]> {
  const { 
    createdGte,
    lastNDays = 7,
    limit = 100,
    expandCustomer = true
  } = options;

  // Determine start date
  let startDate: Date;
  if (createdGte) {
    startDate = createdGte;
  } else {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - lastNDays);
  }

  // Convert to Unix timestamp (seconds)
  const createdGteTimestamp = Math.floor(startDate.getTime() / 1000);

  // Build query string
  let queryString = `/payment_intents?created[gte]=${createdGteTimestamp}&limit=${limit}`;
  if (expandCustomer) {
    queryString += '&expand[]=data.customer';
  }

  logger.debug('Fetching successful payments', { createdGte: startDate.toISOString(), limit });
  const result = await stripeRequest(queryString, 'GET', secretKey);

  const payments = result.data || [];
  logger.debug('Found payment intents', { count: payments.length });

  // Filter to only succeeded payments
  const succeededPayments = payments.filter((pi: any) => pi.status === 'succeeded');
  logger.debug('Succeeded payments', { count: succeededPayments.length });

  // Format payments consistently
  return succeededPayments.map((pi: any) => formatPaymentIntent(pi));
}

/**
 * Formats a raw Stripe PaymentIntent into a consistent structure
 */
export function formatPaymentIntent(pi: any): FormattedPayment {
  const billingDetails = pi.billing_details || {};
  const billingAddress = billingDetails.address || {};

  return {
    paymentId: pi.id,
    amount: pi.amount / 100,
    currency: pi.currency.toUpperCase(),
    status: pi.status,
    description: pi.description || '',
    created: new Date(pi.created * 1000).toISOString(),
    customer: {
      id: typeof pi.customer === 'string' ? pi.customer : pi.customer?.id || null,
      name: billingDetails.name || '',
      email: billingDetails.email || pi.receipt_email || '',
      address: billingAddress
        ? [
            billingAddress.line1,
            billingAddress.line2,
            billingAddress.city,
            billingAddress.state,
            billingAddress.postal_code,
            billingAddress.country,
          ]
            .filter(Boolean)
            .join(', ')
        : '',
    },
    metadata: pi.metadata || {},
    receiptEmail: pi.receipt_email || '',
  };
}
