/**
 * @ha-bits/bit-snov
 * 
 * Snov.io API integration for email enrichment and lead data.
 * Uses native fetch - no external dependencies.
 */

const SNOV_API_BASE = 'https://api.snov.io/v1';

interface SnovAuthContext {
  auth: {
    clientId: string;
    clientSecret: string;
  };
  propsValue: Record<string, any>;
}

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

// Simple in-memory token cache
let tokenCache: TokenCache | null = null;

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  // Check cache
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.accessToken;
  }
  
  const response = await fetch(`${SNOV_API_BASE}/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Snov.io auth failed: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  
  // Cache token (expires in ~1 hour, cache for 50 mins)
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + 50 * 60 * 1000,
  };
  
  return data.access_token;
}

async function snovRequest(
  endpoint: string,
  accessToken: string,
  method: 'GET' | 'POST' = 'POST',
  body?: Record<string, any>
): Promise<any> {
  const url = `${SNOV_API_BASE}${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  };
  
  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Snov.io API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

const snovBit = {
  displayName: 'Snov.io',
  description: 'Snov.io API integration for email enrichment and lead prospecting',
  logoUrl: 'lucide:Mail',
  
  auth: {
    type: 'CUSTOM' as const,
    props: {
      clientId: {
        type: 'SECRET_TEXT',
        displayName: 'Client ID',
        description: 'Snov.io API User ID (Client ID)',
        required: true,
      },
      clientSecret: {
        type: 'SECRET_TEXT',
        displayName: 'Client Secret',
        description: 'Snov.io API Secret',
        required: true,
      },
    },
  },
  
  actions: {
    /**
     * Get prospect/person info by email
     */
    getProspectByEmail: {
      name: 'getProspectByEmail',
      displayName: 'Get Prospect by Email',
      description: 'Retrieve enrichment data for a person by their email address',
      props: {
        email: {
          type: 'SHORT_TEXT',
          displayName: 'Email',
          description: 'Email address to look up',
          required: true,
        },
      },
      async run(context: SnovAuthContext & { propsValue: { email: string } }) {
        const accessToken = await getAccessToken(
          context.auth.clientId,
          context.auth.clientSecret
        );
        
        const data = await snovRequest('/get-profile-by-email', accessToken, 'POST', {
          email: context.propsValue.email,
        });
        
        console.log(`🔍 Snov.io: Retrieved prospect data for ${context.propsValue.email}`);
        
        return {
          success: data.success !== false,
          email: context.propsValue.email,
          data: {
            firstName: data.data?.firstName || data.firstName,
            lastName: data.data?.lastName || data.lastName,
            name: data.data?.name || data.name,
            position: data.data?.currentJob?.[0]?.position || data.position,
            company: data.data?.currentJob?.[0]?.companyName || data.company,
            industry: data.data?.currentJob?.[0]?.industry || data.industry,
            country: data.data?.country || data.country,
            locality: data.data?.locality || data.locality,
            social: {
              linkedin: data.data?.social?.find((s: any) => s.type === 'linkedin')?.url,
              twitter: data.data?.social?.find((s: any) => s.type === 'twitter')?.url,
            },
            skills: data.data?.skills || [],
            experience: data.data?.currentJob || [],
          },
          raw: data,
        };
      },
    },
    
    /**
     * Get company info by domain
     */
    getCompanyByDomain: {
      name: 'getCompanyByDomain',
      displayName: 'Get Company by Domain',
      description: 'Retrieve company information by domain name',
      props: {
        domain: {
          type: 'SHORT_TEXT',
          displayName: 'Domain',
          description: 'Company domain (e.g., acme.com)',
          required: true,
        },
      },
      async run(context: SnovAuthContext & { propsValue: { domain: string } }) {
        const accessToken = await getAccessToken(
          context.auth.clientId,
          context.auth.clientSecret
        );
        
        const data = await snovRequest('/get-domain-emails-count', accessToken, 'POST', {
          domain: context.propsValue.domain,
        });
        
        console.log(`🏢 Snov.io: Retrieved company data for ${context.propsValue.domain}`);
        
        return {
          success: data.success !== false,
          domain: context.propsValue.domain,
          data: {
            emailCount: data.result || 0,
            webmail: data.webmail || false,
          },
          raw: data,
        };
      },
    },
    
    /**
     * Find emails by domain
     */
    findEmailsByDomain: {
      name: 'findEmailsByDomain',
      displayName: 'Find Emails by Domain',
      description: 'Find email addresses associated with a domain',
      props: {
        domain: {
          type: 'SHORT_TEXT',
          displayName: 'Domain',
          description: 'Company domain (e.g., acme.com)',
          required: true,
        },
        type: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Email Type',
          description: 'Type of emails to find',
          required: false,
          defaultValue: 'all',
          options: {
            options: [
              { label: 'All', value: 'all' },
              { label: 'Generic (info@, support@)', value: 'generic' },
              { label: 'Personal', value: 'personal' },
            ],
          },
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Limit',
          description: 'Maximum number of emails to return',
          required: false,
          defaultValue: 10,
        },
      },
      async run(context: SnovAuthContext & { propsValue: { domain: string; type?: string; limit?: number } }) {
        const accessToken = await getAccessToken(
          context.auth.clientId,
          context.auth.clientSecret
        );
        
        const params: Record<string, any> = {
          domain: context.propsValue.domain,
          limit: context.propsValue.limit || 10,
        };
        
        if (context.propsValue.type && context.propsValue.type !== 'all') {
          params.type = context.propsValue.type;
        }
        
        const data = await snovRequest('/get-domain-emails-with-info', accessToken, 'POST', params);
        
        const emails = data.emails || [];
        
        console.log(`📧 Snov.io: Found ${emails.length} emails for ${context.propsValue.domain}`);
        
        return {
          success: data.success !== false,
          domain: context.propsValue.domain,
          emails: emails.map((e: any) => ({
            email: e.email,
            firstName: e.firstName,
            lastName: e.lastName,
            position: e.position,
            department: e.department,
            type: e.type,
            status: e.status,
          })),
          count: emails.length,
          raw: data,
        };
      },
    },
    
    /**
     * Verify email address
     */
    verifyEmail: {
      name: 'verifyEmail',
      displayName: 'Verify Email',
      description: 'Verify if an email address is valid and deliverable',
      props: {
        email: {
          type: 'SHORT_TEXT',
          displayName: 'Email',
          description: 'Email address to verify',
          required: true,
        },
      },
      async run(context: SnovAuthContext & { propsValue: { email: string } }) {
        const accessToken = await getAccessToken(
          context.auth.clientId,
          context.auth.clientSecret
        );
        
        // First, add email to verification list
        const addResponse = await snovRequest('/add-emails-to-verification', accessToken, 'POST', {
          emails: [context.propsValue.email],
        });
        
        // Then get verification result
        const data = await snovRequest('/get-emails-verification-status', accessToken, 'POST', {
          emails: [context.propsValue.email],
        });
        
        const result = data[0] || {};
        
        console.log(`✅ Snov.io: Verified email ${context.propsValue.email}: ${result.status}`);
        
        return {
          email: context.propsValue.email,
          status: result.status || 'unknown',
          isValid: result.status === 'valid',
          isDeliverable: ['valid', 'catch-all'].includes(result.status),
          raw: result,
        };
      },
    },
    
    /**
     * Get remaining API credits
     */
    getBalance: {
      name: 'getBalance',
      displayName: 'Get API Balance',
      description: 'Check remaining Snov.io API credits',
      props: {},
      async run(context: SnovAuthContext) {
        const accessToken = await getAccessToken(
          context.auth.clientId,
          context.auth.clientSecret
        );
        
        const data = await snovRequest('/get-balance', accessToken, 'GET');
        
        console.log(`💳 Snov.io: Balance check - ${data.credits || 0} credits remaining`);
        
        return {
          credits: data.credits || 0,
          teamCredits: data.teamCredits || 0,
          raw: data,
        };
      },
    },
  },
  
  triggers: {},
};

export const snov = snovBit;
export default snovBit;
