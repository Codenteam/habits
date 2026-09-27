/**
 * @ha-bits/bit-shopify
 *
 * Shopify Admin API integration for Dev Dashboard apps using the
 * client credentials grant (same org app + dev store — no redirect URI).
 *
 * @see https://shopify.dev/docs/apps/build/authentication-authorization/client-credentials-grant
 */

import {
  getAccessToken,
  getHeaderValue,
  normalizeOrderGid,
  normalizeShop,
  normalizeWebhookSubscriptionTopic,
  shopifyGraphql,
  type ShopifyAuth,
} from './lib/common/common';

interface ShopifyContext {
  auth: ShopifyAuth;
  propsValue: Record<string, unknown>;
  payload?: unknown;
  webhookPayload?: {
    body: unknown;
    headers: Record<string, string>;
    query: Record<string, string>;
    method: string;
  };
}

type WebhookFilterPayload = {
  body: unknown;
  headers: Record<string, string>;
  query: Record<string, string>;
  method: string;
};

function normalizeShopifyWebhookEvent(
  payload: WebhookFilterPayload,
  body: Record<string, unknown>
): Record<string, unknown> {
  const headers = payload.headers || {};
  return {
    topic: getHeaderValue(headers, 'X-Shopify-Topic'),
    shopDomain: getHeaderValue(headers, 'X-Shopify-Shop-Domain'),
    webhookId: getHeaderValue(headers, 'X-Shopify-Webhook-Id'),
    apiVersion: getHeaderValue(headers, 'X-Shopify-API-Version'),
    triggeredAt: getHeaderValue(headers, 'X-Shopify-Triggered-At'),
    eventId: getHeaderValue(headers, 'X-Shopify-Event-Id'),
    body,
  };
}

function requireAuth(context: ShopifyContext): ShopifyAuth {
  const { shop, clientId, clientSecret } = context.auth || {};
  if (!shop || !clientId || !clientSecret) {
    throw new Error(
      'Shopify credentials missing. Set shop, client ID, and client secret in bit auth.'
    );
  }
  return {
    shop: String(shop),
    clientId: String(clientId),
    clientSecret: String(clientSecret),
  };
}

const shopifyBit = {
  id: 'shopify',
  displayName: 'Shopify',
  description:
    'Shopify Admin API (Dev Dashboard client credentials grant). For apps and stores in the same Shopify organization.',
  logoUrl: 'lucide:ShoppingBag',
  runtime: 'server' as const,

  auth: {
    type: 'CUSTOM' as const,
    displayName: 'Shopify Dev Dashboard app',
    description:
      'Client ID and secret from Dev Dashboard → Settings. Shop is your store subdomain (without .myshopify.com).',
    required: true,
    props: {
      shop: {
        type: 'SHORT_TEXT',
        displayName: 'Shop',
        description: 'Store subdomain only, e.g. my-dev-store (not .myshopify.com)',
        required: true,
      },
      clientId: {
        type: 'SECRET_TEXT',
        displayName: 'Client ID',
        description: 'Dev Dashboard → Settings → Client ID',
        required: true,
      },
      clientSecret: {
        type: 'SECRET_TEXT',
        displayName: 'Client Secret',
        description: 'Dev Dashboard → Settings → Client secret',
        required: true,
      },
    },
  },

  actions: {
    getShop: {
      name: 'getShop',
      displayName: 'Get Shop',
      description:
        'Return shop details for the store tied to the access token (validates auth and org setup).',
      props: {},
      async run(context: ShopifyContext): Promise<{
        id: string;
        name: string;
        myshopifyDomain: string;
        email: string;
        currencyCode: string;
        url: string;
      }> {
        const auth = requireAuth(context);
        const accessToken = await getAccessToken(auth.shop, auth.clientId, auth.clientSecret);

        const data = await shopifyGraphql<{
          shop: {
            id: string;
            name: string;
            myshopifyDomain: string;
            email: string;
            currencyCode: string;
            url: string;
          };
        }>(
          accessToken,
          auth.shop,
          `query GetShop {
            shop {
              id
              name
              myshopifyDomain
              email
              currencyCode
              url
            }
          }`
        );

        return data.shop;
      },
    },

    createProduct: {
      name: 'createProduct',
      displayName: 'Create Product',
      description:
        'Create a test product in the shop. Requires write_products on your app version in Dev Dashboard.',
      props: {
        title: {
          type: 'SHORT_TEXT',
          displayName: 'Title',
          description: 'Product title',
          required: true,
        },
        descriptionHtml: {
          type: 'LONG_TEXT',
          displayName: 'Description (HTML)',
          description: 'Optional product description',
          required: false,
        },
      },
      async run(context: ShopifyContext): Promise<{
        id: string;
        title: string;
        handle: string;
        status: string;
      }> {
        const auth = requireAuth(context);
        const accessToken = await getAccessToken(auth.shop, auth.clientId, auth.clientSecret);
        const title = String(context.propsValue.title || '').trim();
        if (!title) {
          throw new Error('Product title is required.');
        }

        const product: Record<string, string> = { title };
        const descriptionHtml = context.propsValue.descriptionHtml;
        if (descriptionHtml && String(descriptionHtml).trim()) {
          product.descriptionHtml = String(descriptionHtml);
        }

        const data = await shopifyGraphql<{
          productCreate: {
            product: { id: string; title: string; handle: string; status: string } | null;
            userErrors: Array<{ field: string[] | null; message: string }>;
          };
        }>(
          accessToken,
          auth.shop,
          `mutation CreateProduct($product: ProductCreateInput!) {
            productCreate(product: $product) {
              product { 
                id
                title
                handle
                status
              }
              userErrors {
                field
                message
              }
            }
          }`,
          { product }
        );

        const { productCreate } = data;
        if (productCreate.userErrors.length > 0) {
          throw new Error(
            `Shopify productCreate failed: ${productCreate.userErrors.map((e) => e.message).join('; ')}`
          );
        }
        if (!productCreate.product) {
          throw new Error('Shopify productCreate returned no product.');
        }

        return productCreate.product;
      },
    },

    getProductById: {
      name: 'getProductById',
      displayName: 'Get Product by ID',
      description:
        'Fetch a single product by Admin GraphQL ID (gid://shopify/Product/...). Requires read_products.',
      props: {
        id: {
          type: 'SHORT_TEXT',
          displayName: 'Product ID',
          description: 'Full GID from list/create, e.g. gid://shopify/Product/123456789',
          required: true,
        },
      },
      async run(context: ShopifyContext): Promise<{
        shop: string;
        product: {
          id: string;
          title: string;
          handle: string;
          status: string;
          descriptionHtml: string | null;
        };
      }> {
        const auth = requireAuth(context);
        const accessToken = await getAccessToken(auth.shop, auth.clientId, auth.clientSecret);
        const id = String(context.propsValue.id || '').trim();
        if (!id) {
          throw new Error('Product id is required.');
        }

        const data = await shopifyGraphql<{
          product: {
            id: string;
            title: string;
            handle: string;
            status: string;
            descriptionHtml: string | null;
          } | null;
        }>(
          accessToken,
          auth.shop,
          `query GetProduct($id: ID!) {
            product(id: $id) {
              id
              title
              handle
              status
              descriptionHtml
            }
          }`,
          { id }
        );

        if (!data.product) {
          throw new Error(`Product not found: ${id}`);
        }

        return {
          shop: normalizeShop(auth.shop),
          product: data.product,
        };
      },
    },

    getOrderById: {
      name: 'getOrderById',
      displayName: 'Get Order by ID',
      description:
        'Fetch a single order by Admin GraphQL ID (gid://shopify/Order/...). Requires read_orders (or write_orders). Last 60 days unless read_all_orders is granted.',
      props: {
        id: {
          type: 'SHORT_TEXT',
          displayName: 'Order ID',
          description:
            'Full GID, e.g. gid://shopify/Order/123456789, or numeric legacy order id',
          required: true,
        },
      },
      async run(context: ShopifyContext): Promise<{
        shop: string;
        order: {
          id: string;
          name: string;
          email: string | null;
          note: string | null;
          customerDisplayName: string | null;
          createdAt: string;
          displayFinancialStatus: string | null;
          displayFulfillmentStatus: string | null;
          totalPrice: { amount: string; currencyCode: string } | null;
          lineItems: Array<{ id: string; name: string; quantity: number }>;
        };
      }> {
        const auth = requireAuth(context);
        const accessToken = await getAccessToken(auth.shop, auth.clientId, auth.clientSecret);
        const id = normalizeOrderGid(String(context.propsValue.id || ''));

        const data = await shopifyGraphql<{
          order: {
            id: string;
            name: string;
            email: string | null;
            note: string | null;
            customer: { displayName: string | null } | null;
            createdAt: string;
            displayFinancialStatus: string | null;
            displayFulfillmentStatus: string | null;
            totalPriceSet: {
              shopMoney: { amount: string; currencyCode: string };
            } | null;
            lineItems: {
              edges: Array<{ node: { id: string; name: string; quantity: number } }>;
            };
          } | null;
        }>(
          accessToken,
          auth.shop,
          `query GetOrder($id: ID!) {
            order(id: $id) {
              id
              name
              email
              note
              customer {
                displayName
              }
              createdAt
              displayFinancialStatus
              displayFulfillmentStatus
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              lineItems(first: 25) {
                edges {
                  node {
                    id
                    name
                    quantity
                  }
                }
              }
            }
          }`,
          { id }
        );

        if (!data.order) {
          throw new Error(`Order not found: ${id}`);
        }

        const { order } = data;
        return {
          shop: normalizeShop(auth.shop),
          order: {
            id: order.id,
            name: order.name,
            email: order.email,
            note: order.note ?? null,
            customerDisplayName: order.customer?.displayName ?? null,
            createdAt: order.createdAt,
            displayFinancialStatus: order.displayFinancialStatus,
            displayFulfillmentStatus: order.displayFulfillmentStatus,
            totalPrice: order.totalPriceSet?.shopMoney ?? null,
            lineItems: order.lineItems.edges.map((edge) => edge.node),
          },
        };
      },
    },

    listProducts: {
      name: 'listProducts',
      displayName: 'List Products',
      description: 'Fetch the first products from the shop (tests Admin API access token).',
      props: {
        first: {
          type: 'NUMBER',
          displayName: 'Limit',
          description: 'Number of products to return (max 50)',
          required: false,
          defaultValue: 3,
        },
      },
      async run(context: ShopifyContext): Promise<{
        shop: string;
        products: Array<{ id: string; title: string; handle: string }>;
      }> {
        const auth = requireAuth(context);
        const accessToken = await getAccessToken(auth.shop, auth.clientId, auth.clientSecret);
        const first = Math.min(Math.max(Number(context.propsValue.first) || 3, 1), 50);

        const data = await shopifyGraphql<{
          products: {
            edges: Array<{ node: { id: string; title: string; handle: string } }>;
          };
        }>(
          accessToken,
          auth.shop,
          `query ListProducts($first: Int!) {
            products(first: $first) {
              edges { node { id title handle } }
            }
          }`,
          { first }
        );

        return {
          shop: normalizeShop(auth.shop),
          products: data.products.edges.map((edge) => edge.node),
        };
      },
    },

    createWebhookSubscription: {
      name: 'createWebhookSubscription',
      displayName: 'Create Webhook Subscription',
      description:
        'Register an Admin API webhook subscription for one topic (HTTPS callback). Requires matching scopes on your app version.',
      props: {
        topic: {
          type: 'SHORT_TEXT',
          displayName: 'Topic',
          description:
            'GraphQL enum (PRODUCTS_CREATE) or REST topic (products/create). One topic per call.',
          required: true,
        },
        callbackUrl: {
          type: 'SHORT_TEXT',
          displayName: 'Callback URL',
          description: 'Public HTTPS URL, e.g. https://your-host/webhook/v/shopify',
          required: true,
        },
      },
      async run(context: ShopifyContext): Promise<{
        success: boolean;
        topic: string;
        graphqlTopic: string;
        callbackUrl: string;
        subscriptionId: string | null;
        uri: string | null;
        alreadyExists: boolean;
        userErrors: Array<{ field: string[] | null; message: string }>;
      }> {
        const auth = requireAuth(context);
        const accessToken = await getAccessToken(auth.shop, auth.clientId, auth.clientSecret);
        const rawTopic = String(context.propsValue.topic || '').trim();
        const callbackUrl = String(context.propsValue.callbackUrl || '').trim();
        if (!callbackUrl) {
          throw new Error('Callback URL is required.');
        }
        if (!callbackUrl.startsWith('https://')) {
          throw new Error('Shopify webhook callback URL must use HTTPS.');
        }

        const graphqlTopic = normalizeWebhookSubscriptionTopic(rawTopic);

        const data = await shopifyGraphql<{
          webhookSubscriptionCreate: {
            webhookSubscription: {
              id: string;
              topic: string;
              uri: string;
            } | null;
            userErrors: Array<{ field: string[] | null; message: string }>;
          };
        }>(
          accessToken,
          auth.shop,
          `mutation WebhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
            webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
              webhookSubscription {
                id
                topic
                uri
              }
              userErrors {
                field
                message
              }
            }
          }`,
          {
            topic: graphqlTopic,
            webhookSubscription: {
              uri: callbackUrl,
              format: 'JSON',
            },
          }
        );

        const { webhookSubscriptionCreate } = data;
        const userErrors = webhookSubscriptionCreate.userErrors || [];
        const alreadyExists = userErrors.some((e) =>
          /already been taken|already exists|duplicate/i.test(e.message)
        );

        if (userErrors.length > 0 && !webhookSubscriptionCreate.webhookSubscription && !alreadyExists) {
          throw new Error(
            `Shopify webhookSubscriptionCreate failed: ${userErrors.map((e) => e.message).join('; ')}`
          );
        }

        const sub = webhookSubscriptionCreate.webhookSubscription;

        return {
          success: Boolean(sub) || alreadyExists,
          topic: rawTopic,
          graphqlTopic,
          callbackUrl,
          subscriptionId: sub?.id ?? null,
          uri: sub?.uri ?? callbackUrl,
          alreadyExists,
          userErrors,
        };
      },
    },
  },

  triggers: {
    shopifyEvent: {
      name: 'shopifyEvent',
      displayName: 'Shopify Event (webhook)',
      description:
        'Fires when Shopify delivers an Admin webhook to /webhook/v/shopify. Cortex verifies X-Shopify-Hmac-Sha256 with HABITS_SHOPIFY_CLIENT_SECRET.',
      type: 'WEBHOOK',
      props: {
        topics: {
          type: 'SHORT_TEXT',
          displayName: 'Topics filter',
          description:
            'Optional comma-separated X-Shopify-Topic values (e.g. products/create,orders/create). Empty = all topics.',
          required: false,
          defaultValue: '',
        },
      },
      filter(payload: WebhookFilterPayload): boolean {
        if (payload.method !== 'POST') {
          return false;
        }
        const topic = getHeaderValue(payload.headers, 'X-Shopify-Topic');
        return Boolean(topic);
      },
      async onEnable(_context: ShopifyContext): Promise<void> {},
      async onDisable(_context: ShopifyContext): Promise<void> {},
      async run(context: ShopifyContext): Promise<Record<string, unknown>[]> {
        const webhookPayload = context.webhookPayload;
        const body =
          (webhookPayload?.body as Record<string, unknown> | undefined) ||
          (context.payload as Record<string, unknown> | undefined);
        if (!body || !webhookPayload) {
          return [];
        }

        const topic = getHeaderValue(webhookPayload.headers, 'X-Shopify-Topic');
        const allowedRaw = String(context.propsValue?.topics || '').trim();
        if (allowedRaw) {
          const allowed = allowedRaw
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
          if (allowed.length > 0 && !allowed.includes(topic.toLowerCase())) {
            return [];
          }
        }

        return [normalizeShopifyWebhookEvent(webhookPayload, body)];
      },
    },
  },
};

export const shopify = shopifyBit;
export default shopifyBit;
