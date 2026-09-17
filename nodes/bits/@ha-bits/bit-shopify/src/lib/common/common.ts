/** Shopify Admin API version (GraphQL). */
export const SHOPIFY_ADMIN_API_VERSION = '2026-07';

export interface ShopifyAuth {
  shop: string;
  clientId: string;
  clientSecret: string;
}

interface TokenCacheEntry {
  accessToken: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCacheEntry>();

export function normalizeShop(shop: string): string {
  const trimmed = shop.trim().toLowerCase();
  if (!trimmed) {
    throw new Error('Shop is required (your *.myshopify.com subdomain, without .myshopify.com).');
  }
  return trimmed.replace(/\.myshopify\.com\/?$/i, '').replace(/^https?:\/\//i, '').split('/')[0];
}

/** Admin GraphQL Order ID — accepts full GID or numeric legacy id. */
export function normalizeOrderGid(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) {
    throw new Error('Order id is required.');
  }
  if (trimmed.startsWith('gid://')) {
    return trimmed;
  }
  if (/^\d+$/.test(trimmed)) {
    return `gid://shopify/Order/${trimmed}`;
  }
  throw new Error(
    'Order id must be a full GID (gid://shopify/Order/...) or numeric Admin order id.'
  );
}

function cacheKey(shop: string, clientId: string): string {
  return `${normalizeShop(shop)}:${clientId}`;
}

export function shopAdminBaseUrl(shop: string): string {
  return `https://${normalizeShop(shop)}.myshopify.com/admin`;
}

/**
 * Exchange client ID + secret for a Shopify Admin API access token (client credentials grant).
 * Cached until ~1 minute before expiry (tokens last 24h).
 * @see https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant
 */
export async function getAccessToken(
  shop: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const key = cacheKey(shop, clientId);
  const cached = tokenCache.get(key);
  const refreshBufferMs = 60_000;

  if (cached && Date.now() < cached.expiresAt - refreshBufferMs) {
    return cached.accessToken;
  }

  const normalizedShop = normalizeShop(shop);
  const response = await fetch(`${shopAdminBaseUrl(normalizedShop)}/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Shopify token request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    scope: string;
    expires_in: number;
  };

  console.log('Shopify granted scopes:', data.scope);

  tokenCache.set(key, {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });

  return data.access_token;
}

export async function shopifyGraphql<T>(
  accessToken: string,
  shop: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const normalizedShop = normalizeShop(shop);
  const url = `${shopAdminBaseUrl(normalizedShop)}/api/${SHOPIFY_ADMIN_API_VERSION}/graphql.json`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Shopify GraphQL request failed (${response.status}): ${await response.text()}`);
  }

  const payload = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (payload.errors?.length) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(payload.errors)}`);
  }
  if (payload.data === undefined) {
    throw new Error('Shopify GraphQL response missing data');
  }
  return payload.data;
}

/** REST-style topic (products/create) → GraphQL WebhookSubscriptionTopic enum. */
const REST_TOPIC_TO_GRAPHQL: Record<string, string> = {
  'products/create': 'PRODUCTS_CREATE',
  'products/update': 'PRODUCTS_UPDATE',
  'products/delete': 'PRODUCTS_DELETE',
  'orders/create': 'ORDERS_CREATE',
  'orders/updated': 'ORDERS_UPDATED',
  'orders/cancelled': 'ORDERS_CANCELLED',
  'orders/delete': 'ORDERS_DELETE',
  'orders/edited': 'ORDERS_EDITED',
  'orders/fulfilled': 'ORDERS_FULFILLED',
  'orders/paid': 'ORDERS_PAID',
  'orders/partially_fulfilled': 'ORDERS_PARTIALLY_FULFILLED',
};

/**
 * Normalize user input to GraphQL WebhookSubscriptionTopic (e.g. PRODUCTS_CREATE).
 */
export function normalizeWebhookSubscriptionTopic(topic: string): string {
  const trimmed = topic.trim();
  if (!trimmed) {
    throw new Error('Webhook topic is required.');
  }
  const restKey = trimmed.toLowerCase();
  if (REST_TOPIC_TO_GRAPHQL[restKey]) {
    return REST_TOPIC_TO_GRAPHQL[restKey];
  }
  const upper = trimmed.toUpperCase().replace(/-/g, '_');
  if (/^[A-Z0-9_]+$/.test(upper)) {
    return upper;
  }
  throw new Error(
    `Unrecognized webhook topic "${topic}". Use GraphQL enum (PRODUCTS_CREATE) or REST form (products/create).`
  );
}

export function getHeaderValue(
  headers: Record<string, string | undefined>,
  name: string
): string {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower && value) {
      return value;
    }
  }
  return '';
}
