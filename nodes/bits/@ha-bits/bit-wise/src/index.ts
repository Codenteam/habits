/**
 * @ha-bits/bit-wise
 * 
 * Wise (TransferWise) integration for Habits workflows.
 * Supports webhook triggers for transfers and actions for currency operations.
 */

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

interface WiseContext {
  auth?: {
    apiToken: string;
    profileId?: string;
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

interface WiseTransferEvent {
  data: {
    resource: {
      id: number;
      profile_id: number;
      type: string;
    };
    current_state: string;
    previous_state: string;
    occurred_at: string;
  };
  subscription_id: string;
  event_type: string;
  schema_version: string;
  sent_at: string;
}

interface WiseExchangeRate {
  rate: number;
  source: string;
  target: string;
  time: string;
}

// ============================================================================
// Wise API Helper
// ============================================================================

const WISE_API_URL = 'https://api.wise.com';
const WISE_SANDBOX_URL = 'https://api.sandbox.transferwise.tech';

/**
 * SCA Response type for when 403 is returned with OTT
 */
interface ScaResponse {
  requiresSca: true;
  ott: string;
  approvalResult: string;
}

/**
 * Extended Wise request that can return SCA info or response headers
 */
async function wiseRequestWithSca(
  endpoint: string,
  method: string,
  apiToken: string,
  body?: Record<string, any>,
  extraHeaders?: Record<string, string>,
  useSandbox: boolean = false
): Promise<{ data: any; headers: Headers; status: number }> {
  const baseUrl = useSandbox ? WISE_SANDBOX_URL : WISE_API_URL;
  const url = `${baseUrl}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  
  return { data, headers: response.headers, status: response.status };
}

async function wiseRequest(
  endpoint: string,
  method: string,
  apiToken: string,
  body?: Record<string, any>,
  useSandbox: boolean = false
): Promise<any> {
  const baseUrl = useSandbox ? WISE_SANDBOX_URL : WISE_API_URL;
  const url = `${baseUrl}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Wise API Error: ${response.status} - ${error}`);
  }

  // Handle empty responses
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

// ============================================================================
// Bit Definition
// ============================================================================

const wiseBit = {
  displayName: 'Wise',
  description: 'Wise (TransferWise) money transfers and currency conversion',
  logoUrl: 'lucide:Wallet',
  
  auth: {
    type: 'SECRET_TEXT',
    displayName: 'API Token',
    description: 'Wise API Token',
    required: true,
  },

  // ============================================================================
  // Triggers
  // ============================================================================
  
  triggers: {
    /**
     * Transfer Completed Trigger
     * Fires when a transfer is completed
     */
    transferCompleted: {
      name: 'transferCompleted',
      displayName: 'Transfer Completed',
      description: 'Triggers when a transfer is completed',
      type: 'webhook',
      props: {
        apiToken: {
          type: 'SECRET_TEXT',
          displayName: 'API Token',
          description: 'Wise API Token',
          required: true,
        },
        profileId: {
          type: 'SHORT_TEXT',
          displayName: 'Profile ID',
          description: 'Wise Profile ID (personal or business)',
          required: true,
        },
      },
      
      async onEnable(context: WiseContext): Promise<void> {
        console.log('🔔 Wise transferCompleted trigger enabled');
        // In production, this would register a webhook subscription with Wise
      },
      
      async onDisable(context: WiseContext): Promise<void> {
        console.log('🔕 Wise transferCompleted trigger disabled');
      },
      
      async run(context: WiseContext): Promise<any[]> {
        const event = context.payload as WiseTransferEvent;
        
        if (!event || event.event_type !== 'transfers#state-change') {
          return [];
        }

        if (event.data.current_state !== 'outgoing_payment_sent') {
          return [];
        }

        // Fetch transfer details
        const apiToken = context.auth?.apiToken || context.propsValue.apiToken;
        const transferId = event.data.resource.id;
        
        try {
          const transfer = await wiseRequest(
            `/v1/transfers/${transferId}`,
            'GET',
            apiToken
          );
          
          return [{
            eventId: event.subscription_id,
            eventType: 'transferCompleted',
            timestamp: event.data.occurred_at,
            transfer: {
              id: transfer.id,
              reference: transfer.reference || `WISE-${transfer.id}`,
              sourceValue: transfer.sourceValue,
              sourceCurrency: transfer.sourceCurrency,
              targetValue: transfer.targetValue,
              targetCurrency: transfer.targetCurrency,
              rate: transfer.rate,
              created: transfer.created,
              status: transfer.status,
              sourceName: transfer.details?.sourceAccountHolderName || '',
              details: {
                description: transfer.details?.reference || '',
                reference: transfer.customerTransactionId || '',
              },
            },
          }];
        } catch (error) {
          console.error('Error fetching transfer details:', error);
          return [{
            eventId: event.subscription_id,
            eventType: 'transferCompleted',
            timestamp: event.data.occurred_at,
            transferId,
            error: String(error),
          }];
        }
      },
    },

    /**
     * Balance Changed Trigger
     */
    balanceChanged: {
      name: 'balanceChanged',
      displayName: 'Balance Changed',
      description: 'Triggers when account balance changes',
      type: 'webhook',
      props: {
        apiToken: {
          type: 'SECRET_TEXT',
          displayName: 'API Token',
          description: 'Wise API Token',
          required: true,
        },
        profileId: {
          type: 'SHORT_TEXT',
          displayName: 'Profile ID',
          description: 'Wise Profile ID',
          required: true,
        },
      },
      
      async run(context: WiseContext): Promise<any[]> {
        const event = context.payload as any;
        
        if (!event || event.event_type !== 'balances#credit') {
          return [];
        }

        return [{
          eventId: event.subscription_id,
          eventType: 'balanceChanged',
          timestamp: event.data.occurred_at,
          balance: event.data,
        }];
      },
    },

    /**
     * Incoming Payment Polling Trigger
     * Polls Wise Business account for incoming payments (credits to balance)
     */
    incomingPaymentPolling: {
      name: 'incomingPaymentPolling',
      displayName: 'Incoming Payment (Polling)',
      description: 'Polls Wise Business account for new incoming payments. Uses balance statement API to detect credits.',
      type: 'POLLING',
      props: {
        apiToken: {
          type: 'SECRET_TEXT',
          displayName: 'API Token',
          description: 'Wise API Token (Full Access for Business accounts)',
          required: true,
        },
        profileId: {
          type: 'SHORT_TEXT',
          displayName: 'Profile ID',
          description: 'Wise Business Profile ID',
          required: true,
        },
        currency: {
          type: 'SHORT_TEXT',
          displayName: 'Currency',
          description: 'Currency to monitor (e.g., GBP, USD, EUR)',
          required: true,
        },
        cronExpression: {
          type: 'SHORT_TEXT',
          displayName: 'Poll Schedule',
          description: 'Cron expression for polling (default: every 5 seconds)',
          required: false,
          defaultValue: '*/5 * * * * *',
        },
      },

      async onEnable(context: WiseContext): Promise<void> {
        console.log('🔔 Wise incomingPaymentPolling trigger enabled');
        const cronExpression = context.propsValue.cronExpression || '*/5 * * * *';
        if ((context as any).setSchedule) {
          (context as any).setSchedule({ cronExpression, timezone: 'UTC' });
        }
      },

      async onDisable(context: WiseContext): Promise<void> {
        console.log('🔕 Wise incomingPaymentPolling trigger disabled');
      },

      async run(context: WiseContext): Promise<any[]> {
        const apiToken = context.auth?.apiToken || context.propsValue.apiToken;
        const profileId = context.propsValue.profileId;
        const currency = context.propsValue.currency;
        const pollingStore = (context as any).pollingStore;

        if (!apiToken || !profileId || !currency) {
          throw new Error('API Token, Profile ID, and Currency are required');
        }

        console.log(`💰 Wise: Polling for incoming ${currency} payments...`);

        try {
          // Get balance accounts for the profile
          const balances = await wiseRequest(
            `/v4/profiles/${profileId}/balances?types=STANDARD`,
            'GET',
            apiToken
          );

          // Find the balance account for the specified currency
          const balanceAccount = balances.find((b: any) => b.currency === currency);
          if (!balanceAccount) {
            console.log(`No ${currency} balance account found`);
            return [];
          }

          const balanceId = balanceAccount.id;

          // Get statement for the last 24 hours to catch recent incoming payments
          const now = new Date();
          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          
          const intervalStart = yesterday.toISOString();
          const intervalEnd = now.toISOString();

          // Use balance statement endpoint for business accounts
          const statement = await wiseRequest(
            `/v1/profiles/${profileId}/balance-statements/${balanceId}/statement.json?currency=${currency}&intervalStart=${encodeURIComponent(intervalStart)}&intervalEnd=${encodeURIComponent(intervalEnd)}&type=COMPACT`,
            'GET',
            apiToken
          );

          const incomingPayments: any[] = [];

          // Filter for credit transactions (incoming payments)
          for (const transaction of statement.transactions || []) {
            // Only process credits (incoming payments)
            if (transaction.type !== 'CREDIT') continue;

            const transactionId = String(transaction.referenceNumber || transaction.details?.paymentReference || `wise-${transaction.date}-${transaction.amount?.value}`);
            
            // Check if we've already processed this transaction
            if (pollingStore) {
              const seen = await pollingStore.hasSeenItem(transactionId, transaction.date);
              if (seen) continue;
              await pollingStore.markItemSeen(transactionId, transaction.date, transaction);
            }

            const payment = {
              id: transactionId,
              type: 'incoming',
              amount: Math.abs(transaction.amount?.value || 0),
              currency: transaction.amount?.currency || currency,
              runningBalance: transaction.runningBalance?.value,
              date: transaction.date,
              description: transaction.details?.description || 'Wise Incoming Payment',
              senderName: transaction.details?.senderName || transaction.details?.paymentReference || '',
              senderAccount: transaction.details?.senderAccount || '',
              reference: transaction.details?.paymentReference || transactionId,
              transactionType: transaction.details?.type || 'UNKNOWN',
            };

            incomingPayments.push({
              eventId: transactionId,
              eventType: 'incomingPayment',
              timestamp: transaction.date,
              payment,
            });
          }

          console.log(`Found ${incomingPayments.length} new incoming payments`);
          return incomingPayments;

        } catch (error) {
          console.error('Error polling Wise for incoming payments:', error);
          throw error;
        }
      },
    },
  },

  // ============================================================================
  // Actions
  // ============================================================================
  
  actions: {
    /**
     * Get All Balances
     */
    getBalances: {
      name: 'getBalances',
      displayName: 'Get All Balances',
      description: 'Get balances for all currencies in your account',
      props: {
        apiToken: {
          type: 'SECRET_TEXT',
          displayName: 'API Token',
          description: 'Wise API Token',
          required: true,
        },
        profileId: {
          type: 'SHORT_TEXT',
          displayName: 'Profile ID',
          description: 'Wise Profile ID',
          required: true,
        },
      },
      
      async run(context: WiseContext): Promise<any> {
        const apiToken = context.auth?.apiToken || context.propsValue.apiToken;
        const profileId = context.propsValue.profileId;
        
        if (!apiToken || !profileId) {
          throw new Error('API Token and Profile ID are required');
        }

        console.log('💰 Wise: Fetching all balances...');
        const balances = await wiseRequest(
          `/v4/profiles/${profileId}/balances?types=STANDARD`,
          'GET',
          apiToken
        );
        
        return {
          balances: balances.map((b: any) => ({
            id: b.id,
            currency: b.currency,
            amount: b.amount.value,
            reservedAmount: b.reservedAmount?.value || 0,
          })),
        };
      },
    },

    /**
     * Get Exchange Rate
     */
    getExchangeRate: {
      name: 'getExchangeRate',
      displayName: 'Get Exchange Rate',
      description: 'Get current exchange rate between two currencies',
      props: {
        apiToken: {
          type: 'SECRET_TEXT',
          displayName: 'API Token',
          description: 'Wise API Token',
          required: true,
        },
        source: {
          type: 'SHORT_TEXT',
          displayName: 'Source Currency',
          description: 'Source currency code (e.g., USD)',
          required: true,
        },
        target: {
          type: 'SHORT_TEXT',
          displayName: 'Target Currency',
          description: 'Target currency code (e.g., EUR)',
          required: true,
        },
        time: {
          type: 'SHORT_TEXT',
          displayName: 'Time',
          description: 'ISO timestamp for historical rate (optional)',
          required: false,
        },
      },
      
      async run(context: WiseContext): Promise<WiseExchangeRate> {
        const apiToken = context.auth?.apiToken || context.propsValue.apiToken;
        const { source, target, time } = context.propsValue;
        
        if (!apiToken || !source || !target) {
          throw new Error('API Token, source and target currencies are required');
        }

        console.log(`💱 Wise: Getting ${source}→${target} exchange rate...`);
        
        let endpoint = `/v1/rates?source=${source}&target=${target}`;
        if (time) {
          endpoint += `&time=${encodeURIComponent(time)}`;
        }
        
        const rates = await wiseRequest(endpoint, 'GET', apiToken);
        const rate = rates[0];
        
        return {
          rate: rate.rate,
          source: rate.source,
          target: rate.target,
          time: rate.time,
        };
      },
    },

    /**
     * Get Historical Exchange Rates
     */
    getHistoricalRates: {
      name: 'getHistoricalRates',
      displayName: 'Get Historical Rates',
      description: 'Get exchange rates for the past N days',
      props: {
        apiToken: {
          type: 'SECRET_TEXT',
          displayName: 'API Token',
          description: 'Wise API Token',
          required: true,
        },
        source: {
          type: 'SHORT_TEXT',
          displayName: 'Source Currency',
          description: 'Source currency code (e.g., USD)',
          required: true,
        },
        target: {
          type: 'SHORT_TEXT',
          displayName: 'Target Currency',
          description: 'Target currency code (e.g., EUR)',
          required: true,
        },
        days: {
          type: 'NUMBER',
          displayName: 'Days',
          description: 'Number of days to look back',
          required: false,
          defaultValue: 7,
        },
      },
      
      async run(context: WiseContext): Promise<any> {
        const apiToken = context.auth?.apiToken || context.propsValue.apiToken;
        const { source, target, days = 7 } = context.propsValue;
        
        if (!apiToken || !source || !target) {
          throw new Error('API Token, source and target currencies are required');
        }

        console.log(`💱 Wise: Getting ${days}-day historical rates for ${source}→${target}...`);
        
        const rates: WiseExchangeRate[] = [];
        const now = new Date();
        
        for (let i = 0; i < days; i++) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const time = date.toISOString();
          
          const endpoint = `/v1/rates?source=${source}&target=${target}&time=${encodeURIComponent(time)}`;
          const dayRates = await wiseRequest(endpoint, 'GET', apiToken);
          
          if (dayRates[0]) {
            rates.push({
              rate: dayRates[0].rate,
              source: dayRates[0].source,
              target: dayRates[0].target,
              time: dayRates[0].time,
            });
          }
        }
        
        const average = rates.reduce((sum, r) => sum + r.rate, 0) / rates.length;
        
        return {
          rates,
          average,
          source,
          target,
          days,
        };
      },
    },

    /**
     * Convert Currency
     */
    convertCurrency: {
      name: 'convertCurrency',
      displayName: 'Convert Currency',
      description: 'Convert between currencies in your Wise account',
      props: {
        apiToken: {
          type: 'SECRET_TEXT',
          displayName: 'API Token',
          description: 'Wise API Token',
          required: true,
        },
        profileId: {
          type: 'SHORT_TEXT',
          displayName: 'Profile ID',
          description: 'Wise Profile ID',
          required: true,
        },
        sourceCurrency: {
          type: 'SHORT_TEXT',
          displayName: 'Source Currency',
          description: 'Currency to convert from',
          required: true,
        },
        targetCurrency: {
          type: 'SHORT_TEXT',
          displayName: 'Target Currency',
          description: 'Currency to convert to',
          required: true,
        },
        amount: {
          type: 'NUMBER',
          displayName: 'Amount',
          description: 'Amount to convert',
          required: true,
        },
      },
      
      async run(context: WiseContext): Promise<any> {
        const apiToken = context.auth?.apiToken || context.propsValue.apiToken;
        const { profileId, sourceCurrency, targetCurrency, amount } = context.propsValue;
        
        if (!apiToken || !profileId || !sourceCurrency || !targetCurrency || !amount) {
          throw new Error('All parameters are required');
        }

        console.log(`💱 Wise: Converting ${amount} ${sourceCurrency} to ${targetCurrency}...`);
        
        // Step 1: Create a quote
        const quote = await wiseRequest('/v3/profiles/' + profileId + '/quotes', 'POST', apiToken, {
          sourceCurrency,
          targetCurrency,
          sourceAmount: amount,
          payOut: 'BALANCE',
        });
        
        // Step 2: Create the conversion
        const conversion = await wiseRequest(
          `/v1/profiles/${profileId}/balance-movements`,
          'POST',
          apiToken,
          {
            quoteId: quote.id,
          }
        );
        
        return {
          conversionId: conversion.id,
          quoteId: quote.id,
          sourceAmount: amount,
          sourceCurrency,
          targetAmount: quote.targetAmount,
          targetCurrency,
          rate: quote.rate,
          fee: quote.fee,
          status: conversion.status || 'completed',
        };
      },
    },

    /**
     * List Transactions
     */
    listTransactions: {
      name: 'listTransactions',
      displayName: 'List Transactions',
      description: 'List recent transactions from your Wise account',
      props: {
        apiToken: {
          type: 'SECRET_TEXT',
          displayName: 'API Token',
          description: 'Wise API Token',
          required: true,
        },
        profileId: {
          type: 'SHORT_TEXT',
          displayName: 'Profile ID',
          description: 'Wise Profile ID',
          required: true,
        },
        currency: {
          type: 'SHORT_TEXT',
          displayName: 'Currency',
          description: 'Filter by currency (optional)',
          required: false,
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Limit',
          description: 'Maximum number of transactions',
          required: false,
          defaultValue: 10,
        },
      },
      
      async run(context: WiseContext): Promise<any> {
        const apiToken = context.auth?.apiToken || context.propsValue.apiToken;
        const { profileId, currency, limit = 10 } = context.propsValue;
        
        if (!apiToken || !profileId) {
          throw new Error('API Token and Profile ID are required');
        }

        console.log(`💰 Wise: Listing last ${limit} transactions...`);
        
        let endpoint = `/v1/profiles/${profileId}/transfers?limit=${limit}`;
        if (currency) {
          endpoint += `&sourceCurrency=${currency}`;
        }
        
        const transfers = await wiseRequest(endpoint, 'GET', apiToken);
        
        return {
          transactions: transfers.map((t: any) => ({
            id: t.id,
            reference: t.reference,
            status: t.status,
            sourceAmount: t.sourceValue,
            sourceCurrency: t.sourceCurrency,
            targetAmount: t.targetValue,
            targetCurrency: t.targetCurrency,
            rate: t.rate,
            created: t.created,
          })),
        };
      },
    },

    /**
     * SCA Authentication
     * Handles Strong Customer Authentication flow for UK/EEA accounts
     * 
     * Steps:
     * 1. "initiate" - Attempts to access a protected resource, returns OTT if SCA required
     * 2. "trigger-sms" - Triggers SMS OTP to the user's phone
     * 3. "verify" - Verifies the SMS code, returns cleared OTT for use with protected endpoints
     */
    scaAuthenticate: {
      name: 'scaAuthenticate',
      displayName: 'SCA Authenticate',
      description: 'Handle Strong Customer Authentication (SCA) for UK/EEA Wise Business accounts. Returns a cleared OTT that can be used with protected endpoints.',
      props: {
        apiToken: {
          type: 'SECRET_TEXT',
          displayName: 'API Token',
          description: 'Wise API Token',
          required: true,
        },
        profileId: {
          type: 'SHORT_TEXT',
          displayName: 'Profile ID',
          description: 'Wise Profile ID (needed for initiate step)',
          required: false,
        },
        currency: {
          type: 'SHORT_TEXT',
          displayName: 'Currency',
          description: 'Currency for balance statement (needed for initiate step)',
          required: false,
        },
        step: {
          type: 'SHORT_TEXT',
          displayName: 'Step',
          description: 'SCA step: "initiate", "trigger-sms", or "verify"',
          required: true,
        },
        ott: {
          type: 'SHORT_TEXT',
          displayName: 'One-Time Token',
          description: 'OTT from previous step (required for trigger-sms and verify)',
          required: false,
        },
        smsCode: {
          type: 'SHORT_TEXT',
          displayName: 'SMS Code',
          description: 'SMS verification code (required for verify step)',
          required: false,
        },
      },
      
      async run(context: WiseContext): Promise<any> {
        const apiToken = context.auth?.apiToken || context.propsValue.apiToken;
        const { step, ott, smsCode, profileId, currency } = context.propsValue;
        
        if (!apiToken) {
          throw new Error('API Token is required');
        }

        if (!step) {
          throw new Error('Step is required: "initiate", "trigger-sms", or "verify"');
        }

        console.log(`🔐 Wise SCA: Running step "${step}"...`);

        switch (step) {
          case 'initiate': {
            // Try to access balance statement to trigger SCA
            if (!profileId || !currency) {
              throw new Error('Profile ID and Currency are required for initiate step');
            }

            // First get the balance ID for this currency
            const balances = await wiseRequest(
              `/v4/profiles/${profileId}/balances?types=STANDARD`,
              'GET',
              apiToken
            );

            const balanceAccount = balances.find((b: any) => b.currency === currency);
            if (!balanceAccount) {
              throw new Error(`No ${currency} balance account found`);
            }

            const balanceId = balanceAccount.id;
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const intervalStart = yesterday.toISOString();
            const intervalEnd = now.toISOString();

            // Attempt to get statement - this will likely return 403 with SCA headers
            const { data, headers, status } = await wiseRequestWithSca(
              `/v1/profiles/${profileId}/balance-statements/${balanceId}/statement.json?currency=${currency}&intervalStart=${encodeURIComponent(intervalStart)}&intervalEnd=${encodeURIComponent(intervalEnd)}&type=COMPACT`,
              'GET',
              apiToken
            );

            if (status === 403) {
              // SCA required - extract OTT from headers
              const ottFromHeader = headers.get('x-2fa-approval');
              const approvalResult = headers.get('x-2fa-approval-result');

              if (!ottFromHeader) {
                throw new Error('SCA required but no OTT received in response headers');
              }

              console.log(`🔐 SCA required. OTT: ${ottFromHeader}, Approval Result: ${approvalResult}`);

              // Immediately trigger SMS - OTTs expire very quickly
              console.log(`📱 Attempting to trigger SMS OTP for OTT: ${ottFromHeader}`);
              
              // Try both header formats
              const smsResponse = await wiseRequestWithSca(
                '/v1/one-time-token/sms/trigger',
                'POST',
                apiToken,
                { oneTimeToken: ottFromHeader },  // Also try in body
                { 'x-2fa-approval': ottFromHeader, 'One-Time-Token': ottFromHeader }
              );

              console.log(`📱 SMS trigger response: status=${smsResponse.status}, data=${JSON.stringify(smsResponse.data)}`);

              // SMS trigger failed - this account likely uses push notifications
              if (smsResponse.status >= 400) {
                return {
                  requiresSca: true,
                  ott: ottFromHeader,
                  approvalResult,
                  authMethod: 'push',
                  balanceId,
                  message: 'SMS not available. Approve the request in your Wise app, then call "verify" step with the same OTT.',
                };
              }

              // SMS was sent successfully
              return {
                requiresSca: true,
                ott: ottFromHeader,
                approvalResult,
                authMethod: 'sms',
                smsSent: true,
                balanceId,
                message: 'SMS code sent to your registered phone number. Use verify step with the code.',
              };
            }

            // No SCA required - return the data directly
            console.log('✅ No SCA required, statement retrieved directly');
            return {
              requiresSca: false,
              transactions: data.transactions || [],
            };
          }

          case 'trigger-sms': {
            if (!ott) {
              throw new Error('OTT is required for trigger-sms step');
            }

            console.log(`📱 Triggering SMS OTP for OTT: ${ott}`);

            // Try with x-2fa-approval header (used for retrying protected endpoints)
            const { data, status, headers } = await wiseRequestWithSca(
              '/v1/one-time-token/sms/trigger',
              'POST',
              apiToken,
              {},
              { 'x-2fa-approval': ott }
            );

            console.log(`📱 SMS trigger response: status=${status}, data=${JSON.stringify(data)}`);

            if (status >= 400) {
              // Log all response headers for debugging
              const headerEntries: string[] = [];
              headers.forEach((value, key) => headerEntries.push(`${key}: ${value}`));
              console.log(`📱 Response headers: ${headerEntries.join(', ')}`);
              throw new Error(`Failed to trigger SMS: ${JSON.stringify(data)}`);
            }

            console.log('✅ SMS OTP triggered successfully');
            return {
              triggered: true,
              ott,
              message: 'SMS code sent to your registered phone number',
            };
          }

          case 'verify': {
            if (!ott) {
              throw new Error('OTT is required for verify step');
            }
            if (!profileId || !currency) {
              throw new Error('Profile ID and Currency are required for verify step');
            }

            // If SMS code provided, try SMS verification first
            if (smsCode) {
              console.log(`🔑 Verifying SMS code for OTT: ${ott}`);

              const { data: smsData, status: smsStatus } = await wiseRequestWithSca(
                '/v1/one-time-token/sms/verify',
                'POST',
                apiToken,
                { otp: smsCode },
                { 'One-Time-Token': ott }
              );

              if (smsStatus >= 400) {
                return {
                  verified: false,
                  error: smsData,
                  message: 'SMS verification failed. Check the code and try again.',
                };
              }

              console.log('✅ SMS verification successful');
            } else {
              console.log('📱 No SMS code - assuming push notification approval');
            }

            // Now retry the original protected request with the OTT
            // Get the balance ID for this currency
            const balances = await wiseRequest(
              `/v4/profiles/${profileId}/balances?types=STANDARD`,
              'GET',
              apiToken
            );

            const balanceAccount = balances.find((b: any) => b.currency === currency);
            if (!balanceAccount) {
              throw new Error(`No ${currency} balance account found`);
            }

            const balanceId = balanceAccount.id;
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const intervalStart = yesterday.toISOString();
            const intervalEnd = now.toISOString();

            console.log(`📊 Retrying balance statement with OTT: ${ott}`);
            const { data, status, headers } = await wiseRequestWithSca(
              `/v1/profiles/${profileId}/balance-statements/${balanceId}/statement.json?currency=${currency}&intervalStart=${encodeURIComponent(intervalStart)}&intervalEnd=${encodeURIComponent(intervalEnd)}&type=COMPACT`,
              'GET',
              apiToken,
              undefined,
              { 'x-2fa-approval': ott }
            );

            console.log(`📊 Balance statement response: status=${status}`);
            
            if (status === 403) {
              const newOtt = headers.get('x-2fa-approval');
              const approvalResult = headers.get('x-2fa-approval-result');
              return {
                verified: false,
                ott: newOtt || ott,
                approvalResult,
                message: 'SCA not yet approved. If using push notifications, please approve in the Wise app and try again.',
              };
            }

            if (status >= 400) {
              return {
                verified: false,
                error: data,
                message: 'Failed to retrieve balance statement',
              };
            }

            // Success! Return the transactions
            console.log('✅ Balance statement retrieved successfully');
            return {
              verified: true,
              transactions: data.transactions || [],
              endOfStatementBalance: data.endOfStatementBalance,
              query: data.query,
              message: 'SCA verification complete. Transactions retrieved.',
            };
          }

          default:
            throw new Error(`Unknown step: ${step}. Valid steps are: "initiate", "trigger-sms", "verify"`);
        }
      },
    },
  },
};

export default wiseBit;
