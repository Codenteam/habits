/**
 * @ha-bits/bit-quickbooks
 *
 * QuickBooks Online integration for recording payments in your books.
 * Uses OAuth 2.0 (client id + secret) against the QBO Accounting API.
 */

import {
  createPayment,
  quickbooksOAuth,
  type CreatePaymentInput,
  type QuickBooksEnvironment,
} from './driver';

interface QuickBooksAuth {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: number;
}

interface QuickBooksContext {
  auth?: QuickBooksAuth;
  propsValue: Record<string, any>;
}

const quickbooksBit = {
  displayName: 'QuickBooks',
  description:
    'QuickBooks Online integration — record received payments via OAuth2',
  logoUrl: 'lucide:Calculator',
  runtime: 'all',

  auth: {
    type: 'OAUTH2',
    displayName: 'QuickBooks',
    description: 'Connect QuickBooks Online using OAuth2 (client id + secret)',
    required: true,
    authorizationUrl: quickbooksOAuth.authorizationUrl,
    tokenUrl: quickbooksOAuth.tokenUrl,
    scopes: ['com.intuit.quickbooks.accounting'],
    pkce: false,
  },

  actions: {
    createPayment: {
      name: 'createPayment',
      displayName: 'Create Payment',
      description:
        'Record a received payment in QuickBooks Online (QBO Payment entity)',
      props: {
        environment: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Environment',
          description: 'QuickBooks sandbox or production company',
          required: false,
          defaultValue: 'sandbox',
          options: {
            options: [
              { label: 'Sandbox', value: 'sandbox' },
              { label: 'Production', value: 'production' },
            ],
          },
        },
        realmId: {
          type: 'SHORT_TEXT',
          displayName: 'Company ID (realmId)',
          description:
            'QuickBooks company ID from the OAuth callback URL (realmId query param)',
          required: true,
        },
        customerId: {
          type: 'SHORT_TEXT',
          displayName: 'Customer ID',
          description:
            'QuickBooks CustomerRef value for the payer (create a customer in QBO sandbox first)',
          required: true,
        },
        amount: {
          type: 'SHORT_TEXT',
          displayName: 'Amount',
          description: 'Payment amount in major currency units (e.g. 10.00)',
          required: true,
        },
        currency: {
          type: 'SHORT_TEXT',
          displayName: 'Currency',
          description: 'ISO currency code (for notes; QBO uses company home currency)',
          required: false,
        },
        paymentId: {
          type: 'SHORT_TEXT',
          displayName: 'External payment ID',
          description: 'e.g. Stripe payment intent id (pi_...)',
          required: false,
        },
        description: {
          type: 'SHORT_TEXT',
          displayName: 'Description',
          required: false,
        },
        customerName: {
          type: 'SHORT_TEXT',
          displayName: 'Customer name',
          required: false,
        },
        customerEmail: {
          type: 'SHORT_TEXT',
          displayName: 'Customer email',
          required: false,
        },
        paymentDate: {
          type: 'SHORT_TEXT',
          displayName: 'Payment date',
          description: 'ISO date or datetime; defaults to today',
          required: false,
        },
        privateNote: {
          type: 'LONG_TEXT',
          displayName: 'Private note',
          description: 'Override the auto-generated private note on the payment',
          required: false,
        },
      },

      async run(context: QuickBooksContext): Promise<any> {
        const accessToken = context.auth?.accessToken;
        if (!accessToken) {
          throw new Error(
            'QuickBooks not connected. Complete OAuth authorization first.',
          );
        }

        const {
          environment = 'sandbox',
          realmId,
          customerId,
          amount,
          currency,
          paymentId,
          description,
          customerName,
          customerEmail,
          paymentDate,
          privateNote,
        } = context.propsValue;

        const input: CreatePaymentInput = {
          realmId,
          customerId,
          amount,
          currency,
          paymentId,
          description,
          customerName,
          customerEmail,
          paymentDate,
          privateNote,
        };

        const payment = await createPayment(
          accessToken,
          environment as QuickBooksEnvironment,
          input,
        );

        console.log(
          `📒 [bit-quickbooks] Recorded payment ${payment.id} for ${amount}`,
        );

        return {
          success: true,
          quickbooksPaymentId: payment.id,
          totalAmt: payment.totalAmt,
          txnDate: payment.txnDate,
          privateNote: payment.privateNote,
          customerRef: payment.customerRef,
          payment,
        };
      },
    },
  },

  triggers: {},
};

export const quickbooks = quickbooksBit;
export default quickbooksBit;
