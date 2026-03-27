/**
 * @ha-bits/bit-stripe
 * 
 * Stripe payment integration for Habits workflows.
 * Supports webhook triggers for payment events and actions for Stripe API.
 */
import { stripeRequest, fetchSuccessfulPayments } from './driver';

// Simple console logger
const logger = {
  info: (...args: any[]) => console.log('[stripe]', ...args),
  warn: (...args: any[]) => console.warn('[stripe]', ...args),
  error: (...args: any[]) => console.error('[stripe]', ...args),
  debug: (...args: any[]) => console.debug('[stripe]', ...args),
};

// ============================================================================
// Types
// ============================================================================

/**
 * Polling store interface for deduplication
 */
interface PollingStore {
  hasSeenItem: (itemId: string, itemDate?: string) => Promise<boolean>;
  markItemSeen: (itemId: string, sourceDate: string, data?: any) => Promise<void>;
  getLastPolledDate: () => Promise<string | null>;
  setLastPolledDate: (date: string) => Promise<void>;
}

interface StripeContext {
  auth?: {
    secretKey: string;
    webhookSecret?: string;
  };
  propsValue: Record<string, any>;
  payload?: any;
  store?: {
    get: <T>(key: string) => Promise<T | null>;
    put: <T>(key: string, value: T) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
  /** Polling store for deduplication (injected by cortex for POLLING triggers) */
  pollingStore?: PollingStore;
  /** Set cron schedule for polling triggers */
  setSchedule?: (options: { cronExpression: string; timezone?: string }) => void;
}

interface StripePaymentEvent {
  id: string;
  type: string;
  created: number;
  data: {
    object: {
      id: string;
      amount: number;
      currency: string;
      status: string;
      customer?: string;
      description?: string;
      invoice?: string;
      metadata?: Record<string, string>;
      receipt_email?: string;
      billing_details?: {
        name?: string;
        email?: string;
        address?: {
          line1?: string;
          line2?: string;
          city?: string;
          state?: string;
          postal_code?: string;
          country?: string;
        };
      };
    };
  };
}

// ============================================================================
// Bit Definition
// ============================================================================

const stripeBit = {
  id: 'stripe',
  displayName: 'Stripe',
  description: 'Stripe payment processing - triggers and actions',
  logoUrl: 'lucide:CreditCard',
  
  auth: {
    type: 'SECRET_TEXT',
    displayName: 'Secret Key',
    description: 'Stripe Secret Key (sk_live_... or sk_test_...)',
    required: true,
  },

  // ============================================================================
  // Triggers
  // ============================================================================
  
  triggers: {
    /**
     * Payment Succeeded Trigger
     * Fires when a payment is successfully completed
     */
    paymentSucceeded: {
      name: 'paymentSucceeded',
      displayName: 'Payment Succeeded',
      description: 'Triggers when a payment is successfully completed',
      type: 'webhook',
      props: {
        secretKey: {
          type: 'SECRET_TEXT',
          displayName: 'Secret Key',
          description: 'Stripe Secret Key',
          required: true,
        },
        webhookSecret: {
          type: 'SECRET_TEXT',
          displayName: 'Webhook Secret',
          description: 'Stripe Webhook Signing Secret (whsec_...)',
          required: false,
        },
      },
      
      async onEnable(context: StripeContext): Promise<void> {
        logger.info('Stripe paymentSucceeded trigger enabled');
        // In production, this would register a webhook endpoint with Stripe
      },
      
      async onDisable(context: StripeContext): Promise<void> {
        logger.info('Stripe paymentSucceeded trigger disabled');
      },
      
      async run(context: StripeContext): Promise<any[]> {
        const event = context.payload as StripePaymentEvent;
        
        if (!event || event.type !== 'payment_intent.succeeded') {
          return [];
        }

        const payment = event.data.object;
        const billingAddress = payment.billing_details?.address;
        
        return [{
          eventId: event.id,
          eventType: event.type,
          timestamp: new Date(event.created * 1000).toISOString(),
          payment: {
            id: payment.id,
            amount: payment.amount / 100, // Convert from cents
            currency: payment.currency.toUpperCase(),
            status: payment.status,
            description: payment.description || '',
            invoice: payment.invoice || null,
            customer: {
              name: payment.billing_details?.name || '',
              email: payment.billing_details?.email || payment.receipt_email || '',
              address: billingAddress ? 
                [billingAddress.line1, billingAddress.line2, billingAddress.city, billingAddress.state, billingAddress.postal_code, billingAddress.country]
                  .filter(Boolean).join(', ') : '',
            },
            metadata: payment.metadata || {},
          },
        }];
      },
    },

    /**
     * Payment Failed Trigger
     */
    paymentFailed: {
      name: 'paymentFailed',
      displayName: 'Payment Failed',
      description: 'Triggers when a payment fails',
      type: 'webhook',
      props: {
        secretKey: {
          type: 'SECRET_TEXT',
          displayName: 'Secret Key',
          description: 'Stripe Secret Key',
          required: true,
        },
      },
      
      async run(context: StripeContext): Promise<any[]> {
        const event = context.payload as StripePaymentEvent;
        
        if (!event || event.type !== 'payment_intent.payment_failed') {
          return [];
        }

        return [{
          eventId: event.id,
          eventType: event.type,
          timestamp: new Date(event.created * 1000).toISOString(),
          payment: event.data.object,
        }];
      },
    },

    /**
     * Invoice Paid Trigger
     */
    invoicePaid: {
      name: 'invoicePaid',
      displayName: 'Invoice Paid',
      description: 'Triggers when an invoice is paid',
      type: 'webhook',
      props: {
        secretKey: {
          type: 'SECRET_TEXT',
          displayName: 'Secret Key',
          description: 'Stripe Secret Key',
          required: true,
        },
      },
      
      async run(context: StripeContext): Promise<any[]> {
        const event = context.payload as any;
        
        if (!event || event.type !== 'invoice.paid') {
          return [];
        }

        const invoice = event.data.object;
        
        return [{
          eventId: event.id,
          eventType: event.type,
          timestamp: new Date(event.created * 1000).toISOString(),
          invoice: {
            id: invoice.id,
            number: invoice.number,
            amount: invoice.amount_paid / 100,
            currency: invoice.currency.toUpperCase(),
            customerName: invoice.customer_name || '',
            customerEmail: invoice.customer_email || '',
            description: invoice.description || '',
            status: invoice.status,
          },
        }];
      },
    },

    /**
     * Payment Succeeded Polling Trigger
     * Polls Stripe API for new successful payments on a schedule.
     * Uses polling store to deduplicate and only return new payments.
     */
    paymentSucceededPolling: {
      name: 'paymentSucceededPolling',
      displayName: 'Payment Succeeded (Polling)',
      description: 'Polls Stripe for new successful payments on a schedule. Better for high-reliability use cases where webhooks might be missed.',
      type: 'POLLING',
      props: {
        secretKey: {
          type: 'SECRET_TEXT',
          displayName: 'Secret Key',
          description: 'Stripe Secret Key (sk_live_... or sk_test_...)',
          required: true,
        },
        cronExpression: {
          type: 'SHORT_TEXT',
          displayName: 'Poll Interval',
          description: 'Cron expression for polling schedule. Examples: "*/5 * * * *" (every 5 min), "0 * * * *" (hourly)',
          required: true,
          defaultValue: '*/5 * * * *',
        },
        timezone: {
          type: 'SHORT_TEXT',
          displayName: 'Timezone',
          description: 'IANA timezone for the schedule (e.g., "UTC", "America/New_York")',
          required: false,
          defaultValue: 'UTC',
        },
        lastNDays: {
          type: 'NUMBER',
          displayName: 'Lookback Days',
          description: 'Number of days to look back for payments on first run (default: 7)',
          required: false,
          defaultValue: 7,
        },
        dedupBy: {
          type: 'DROPDOWN',
          displayName: 'Deduplication Strategy',
          description: 'How to identify unique payments: by ID (most reliable), by date (time-based), or both',
          required: false,
          defaultValue: 'id',
          options: {
            options: [
              { label: 'Payment ID', value: 'id' },
              { label: 'Timestamp', value: 'date' },
              { label: 'Both ID and Timestamp', value: 'both' },
            ],
          },
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Max Results',
          description: 'Maximum number of payments to fetch per poll (default: 100)',
          required: false,
          defaultValue: 100,
        },
      },
      
      async onEnable(context: StripeContext): Promise<void> {
        const { cronExpression = '*/5 * * * *', timezone = 'UTC' } = context.propsValue;
        context.setSchedule?.({ cronExpression, timezone });
      },
      
      async onDisable(_context: StripeContext): Promise<void> {
        // Server handles stopping cron jobs
      },
      
      async run(context: StripeContext): Promise<any[]> {
        const secretKey = context.auth?.secretKey || context.propsValue.secretKey;
        const { lastNDays = 7, limit = 100 } = context.propsValue;
        const pollingStore = context.pollingStore;
        
        if (!secretKey) {
          throw new Error('Stripe Secret Key is required');
        }

        // Determine the time range to fetch
        let startDate: Date;
        const lastPolled = pollingStore ? await pollingStore.getLastPolledDate() : null;
        
        if (lastPolled) {
          // Fetch from last polled time (with small buffer for safety)
          startDate = new Date(new Date(lastPolled).getTime() - 60000); // 1 min buffer
          logger.debug('Fetching payments since last poll', { since: startDate.toISOString() });
        } else {
          // First run: use lookback window
          startDate = new Date();
          startDate.setDate(startDate.getDate() - lastNDays);
          logger.info('First run, fetching payments', { lastNDays });
        }
        
        // Use the reusable fetch function
        const succeededPayments = await fetchSuccessfulPayments(secretKey, {
          createdGte: startDate,
          limit,
          expandCustomer: true,
        });
        
        // Deduplicate using polling store
        const newPayments: any[] = [];
        const pollTimestamp = new Date().toISOString();
        
        for (const payment of succeededPayments) {
          const paymentId = payment.paymentId;
          const paymentDate = payment.created;
          
          // Check if we've seen this payment before
          if (pollingStore) {
            const seen = await pollingStore.hasSeenItem(paymentId, paymentDate);
            if (seen) {
              logger.trace('Skipping already seen payment', { paymentId });
              continue;
            }
          }
          
          // Add polling-specific metadata
          const paymentData = {
            ...payment,
            triggerType: 'polling',
            polledAt: pollTimestamp,
          };
          
          // Mark as seen in polling store
          if (pollingStore) {
            await pollingStore.markItemSeen(paymentId, paymentDate, { amount: payment.amount, currency: payment.currency });
          }
          
          newPayments.push(paymentData);
        }
        
        // Update last polled timestamp
        if (pollingStore) {
          await pollingStore.setLastPolledDate(pollTimestamp);
        }
        
        logger.info('Polling complete', { newPaymentsCount: newPayments.length });
        return newPayments;
      },
      
      /**
       * Test method - fetches recent payments without deduplication
       */
      async test(context: StripeContext): Promise<any[]> {
        const secretKey = context.auth?.secretKey || context.propsValue.secretKey;
        
        if (!secretKey) {
          throw new Error('Stripe Secret Key is required');
        }
        
        logger.debug('Polling test: fetching last 5 succeeded payments');
        
        // Use the reusable fetch function
        const payments = await fetchSuccessfulPayments(secretKey, {
          lastNDays: 30, // Look back 30 days for test
          limit: 5,
          expandCustomer: true,
        });
        
        return payments.map((payment) => ({
          ...payment,
          triggerType: 'polling-test',
        }));
      },
    },
  },

  // ============================================================================
  // Actions
  // ============================================================================
  
  actions: {
    /**
     * Get Account Balance
     */
    getBalance: {
      name: 'getBalance',
      displayName: 'Get Balance',
      description: 'Get current Stripe account balance',
      props: {
        secretKey: {
          type: 'SECRET_TEXT',
          displayName: 'Secret Key',
          description: 'Stripe Secret Key',
          required: true,
        },
      },
      
      async run(context: StripeContext): Promise<any> {
        const secretKey = context.auth?.secretKey || context.propsValue.secretKey;
        
        if (!secretKey) {
          throw new Error('Stripe Secret Key is required');
        }

        logger.debug('Fetching account balance');
        const balance = await stripeRequest('/balance', 'GET', secretKey);
        
        return {
          available: balance.available.map((b: any) => ({
            amount: b.amount / 100,
            currency: b.currency.toUpperCase(),
          })),
          pending: balance.pending.map((b: any) => ({
            amount: b.amount / 100,
            currency: b.currency.toUpperCase(),
          })),
        };
      },
    },

    /**
     * List Recent Transactions
     */
    listTransactions: {
      name: 'listTransactions',
      displayName: 'List Transactions',
      description: 'List recent payment transactions',
      props: {
        secretKey: {
          type: 'SECRET_TEXT',
          displayName: 'Secret Key',
          description: 'Stripe Secret Key',
          required: true,
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Limit',
          description: 'Maximum number of transactions to return',
          required: false,
          defaultValue: 10,
        },
      },
      
      async run(context: StripeContext): Promise<any> {
        const secretKey = context.auth?.secretKey || context.propsValue.secretKey;
        const limit = context.propsValue.limit || 10;
        
        if (!secretKey) {
          throw new Error('Stripe Secret Key is required');
        }

        logger.debug('Listing transactions', { limit });
        const result = await stripeRequest(`/payment_intents?limit=${limit}`, 'GET', secretKey);
        
        return {
          transactions: result.data.map((pi: any) => ({
            id: pi.id,
            amount: pi.amount / 100,
            currency: pi.currency.toUpperCase(),
            status: pi.status,
            description: pi.description || '',
            created: new Date(pi.created * 1000).toISOString(),
          })),
        };
      },
    },

    /**
     * List Successful Payments
     * Uses the same reusable function as paymentSucceededPolling trigger
     */
    listSuccessfulPayments: {
      name: 'listSuccessfulPayments',
      displayName: 'List Successful Payments',
      description: 'Fetch a list of successful payments from Stripe within a specified time range',
      props: {
        secretKey: {
          type: 'SECRET_TEXT',
          displayName: 'Secret Key',
          description: 'Stripe Secret Key (sk_live_... or sk_test_...)',
          required: true,
        },
        lastNDays: {
          type: 'NUMBER',
          displayName: 'Lookback Days',
          description: 'Number of days to look back for payments (default: 7)',
          required: false,
          defaultValue: 7,
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Max Results',
          description: 'Maximum number of payments to fetch (default: 100)',
          required: false,
          defaultValue: 100,
        },
      },
      
      async run(context: StripeContext): Promise<any> {
        const secretKey = context.auth?.secretKey || context.propsValue.secretKey;
        const { lastNDays = 7, limit = 100 } = context.propsValue;
        
        if (!secretKey) {
          throw new Error('Stripe Secret Key is required');
        }

        logger.debug('Listing successful payments', { lastNDays, limit });
        
        const payments = await fetchSuccessfulPayments(secretKey, {
          lastNDays,
          limit,
          expandCustomer: true,
        });
        
        return {
          count: payments.length,
          payments,
        };
      },
    },

    /**
     * Create Payout
     */
    createPayout: {
      name: 'createPayout',
      displayName: 'Create Payout',
      description: 'Create a payout to your bank account',
      props: {
        secretKey: {
          type: 'SECRET_TEXT',
          displayName: 'Secret Key',
          description: 'Stripe Secret Key',
          required: true,
        },
        amount: {
          type: 'NUMBER',
          displayName: 'Amount',
          description: 'Amount to payout (in currency units, not cents)',
          required: true,
        },
        currency: {
          type: 'SHORT_TEXT',
          displayName: 'Currency',
          description: 'Currency code (e.g., USD, EUR, GBP)',
          required: true,
          defaultValue: 'USD',
        },
        description: {
          type: 'SHORT_TEXT',
          displayName: 'Description',
          description: 'Optional description for the payout',
          required: false,
        },
      },
      
      async run(context: StripeContext): Promise<any> {
        const secretKey = context.auth?.secretKey || context.propsValue.secretKey;
        const { amount, currency, description } = context.propsValue;
        
        if (!secretKey) {
          throw new Error('Stripe Secret Key is required');
        }

        logger.info('Creating payout', { amount, currency });
        const payout = await stripeRequest('/payouts', 'POST', secretKey, {
          amount: Math.round(amount * 100), // Convert to cents
          currency: currency.toLowerCase(),
          description,
        });
        
        return {
          id: payout.id,
          amount: payout.amount / 100,
          currency: payout.currency.toUpperCase(),
          status: payout.status,
          arrivalDate: new Date(payout.arrival_date * 1000).toISOString(),
        };
      },
    },
  },
};

export default stripeBit;
