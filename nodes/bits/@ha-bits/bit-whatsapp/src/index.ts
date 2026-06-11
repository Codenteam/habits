/**
 * @ha-bits/bit-whatsapp
 * 
 * WhatsApp Business API integration bit for sending messages.
 * Uses WhatsApp Cloud API (Meta Business Platform) for messaging.
 * 
 * Requirements:
 * - Meta Business Account
 * - WhatsApp Business App
 * - Access Token from Meta Developer Portal
 * - Phone Number ID from WhatsApp Business settings
 */

interface WhatsAppContext {
  auth?: {
    accessToken: string;
    phoneNumberId: string;
  };
  propsValue: Record<string, any>;
  payload?: unknown;
  webhookPayload?: WebhookFilterPayload;
}

interface WebhookFilterPayload {
  body: any;
  headers: Record<string, string>;
  query: Record<string, string>;
  method: string;
}

interface WhatsAppInboundMessage {
  messageId: string;
  from: string;
  timestamp: string;
  type: string;
  text: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  contactName: string;
  waId: string;
  raw: any;
}

interface WhatsAppResponse {
  messaging_product: string;
  contacts?: Array<{ input: string; wa_id: string }>;
  messages?: Array<{ id: string }>;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

const WHATSAPP_API_VERSION = 'v18.0';
const WHATSAPP_API_BASE = 'https://graph.facebook.com';

/**
 * Make a request to WhatsApp Cloud API
 */
async function whatsappRequest(
  phoneNumberId: string,
  endpoint: string,
  body: any,
  accessToken: string
): Promise<WhatsAppResponse> {
  const url = `${WHATSAPP_API_BASE}/${WHATSAPP_API_VERSION}/${phoneNumberId}/${endpoint}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  
  const result = await response.json() as WhatsAppResponse;
  
  if (result.error) {
    throw new Error(`WhatsApp API Error: ${result.error.message} (${result.error.code})`);
  }
  
  return result;
}

/**
 * Format phone number for WhatsApp (remove +, spaces, dashes)
 */
function formatPhoneNumber(phone: string): string {
  return phone.replace(/[\s\-\+\(\)]/g, '');
}

/**
 * Extract inbound user messages from a Meta WhatsApp webhook POST body.
 * @see https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview
 */
function extractInboundMessages(body: any): WhatsAppInboundMessage[] {
  if (!body || body.object !== 'whatsapp_business_account' || !Array.isArray(body.entry)) {
    return [];
  }

  const messages: WhatsAppInboundMessage[] = [];

  for (const entry of body.entry) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      if (change?.field !== 'messages') continue;

      const value = change?.value;
      const inbound = Array.isArray(value?.messages) ? value.messages : [];
      if (inbound.length === 0) continue;

      const contacts: any[] = Array.isArray(value?.contacts) ? value.contacts : [];
      const contactByWaId = new Map<string, any>(
        contacts.map((c) => [String(c?.wa_id ?? ''), c])
      );
      const phoneNumberId = String(value?.metadata?.phone_number_id ?? '');
      const displayPhoneNumber = String(value?.metadata?.display_phone_number ?? '');

      for (const msg of inbound) {
        const from = String(msg?.from ?? '');
        const contact = contactByWaId.get(from);
        messages.push({
          messageId: String(msg?.id ?? ''),
          from,
          timestamp: String(msg?.timestamp ?? ''),
          type: String(msg?.type ?? 'unknown'),
          text: String(
            msg?.text?.body
            ?? msg?.button?.text
            ?? msg?.interactive?.button_reply?.title
            ?? msg?.interactive?.list_reply?.title
            ?? ''
          ),
          phoneNumberId,
          displayPhoneNumber,
          contactName: String(contact?.profile?.name ?? ''),
          waId: String(contact?.wa_id ?? from),
          raw: msg,
        });
      }
    }
  }

  return messages;
}

function hasInboundMessages(body: any): boolean {
  return extractInboundMessages(body).length > 0;
}

function inboundMessageFilter(payload: WebhookFilterPayload): boolean {
  const mode = payload.query?.['hub.mode'];
  if (payload.method === 'GET' && mode === 'subscribe') {
    return true;
  }

  if (payload.method !== 'POST') {
    return false;
  }

  return payload.body?.object === 'whatsapp_business_account' && hasInboundMessages(payload.body);
}

async function inboundMessageHandshake(context: WhatsAppContext): Promise<string | false> {
  const verifyToken = String(context.propsValue?.verifyToken ?? '');
  const query = context.webhookPayload?.query ?? {};
  const mode = String(query['hub.mode'] ?? '');
  const token = String(query['hub.verify_token'] ?? '');
  const challenge = String(query['hub.challenge'] ?? '');

  if (mode !== 'subscribe' || !verifyToken || !challenge) {
    return false;
  }

  if (token !== verifyToken) {
    console.warn('[bit-whatsapp] Webhook verify token mismatch');
    return false;
  }

  console.log('[bit-whatsapp] Webhook verification succeeded');
  return challenge;
}

async function inboundMessageRun(context: WhatsAppContext) {
  const body = context.webhookPayload?.body ?? context.payload;
  const messages = extractInboundMessages(body);

  return messages.map((msg) => ({
    event: 'inboundMessage',
    ...msg,
    entry: body?.entry,
    raw: body,
  }));
}

const inboundMessageProps = {
  verifyToken: {
    type: 'SECRET_TEXT' as const,
    displayName: 'Verify Token',
    description: 'Verification string for Meta webhook setup (hub.verify_token). Store the same value in Meta App Dashboard.',
    required: true,
  },
};

const whatsappBit = {
  // Vendor webhook routing: POST/GET /webhook/v/whatsapp
  id: 'whatsapp',
  displayName: 'WhatsApp',
  description: 'Send messages via WhatsApp Business Cloud API (Meta)',
  logoUrl: 'lucide:MessageCircle',
  runtime: 'all',
  
  auth: {
    type: 'CUSTOM',
    displayName: 'WhatsApp Business Credentials',
    description: 'WhatsApp Cloud API credentials from Meta Business',
    required: true,
    props: {
      accessToken: {
        type: 'SECRET_TEXT',
        displayName: 'Access Token',
        description: 'Permanent access token from Meta Business',
        required: true,
      },
      phoneNumberId: {
        type: 'SHORT_TEXT',
        displayName: 'Phone Number ID',
        description: 'WhatsApp Business Phone Number ID',
        required: true,
      },
    },
  },
  
  actions: {
    /**
     * Send a text message
     */
    sendTextMessage: {
      name: 'sendTextMessage',
      displayName: 'Send Text Message',
      description: 'Send a text message to a WhatsApp number',
      props: {
        accessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Access Token',
          description: 'WhatsApp Cloud API access token',
          required: true,
        },
        phoneNumberId: {
          type: 'SHORT_TEXT',
          displayName: 'Phone Number ID',
          description: 'Your WhatsApp Business Phone Number ID',
          required: true,
        },
        to: {
          type: 'SHORT_TEXT',
          displayName: 'To',
          description: 'Recipient phone number (with country code, e.g., 14155238886)',
          required: true,
        },
        message: {
          type: 'LONG_TEXT',
          displayName: 'Message',
          description: 'Text message to send',
          required: true,
        },
        previewUrl: {
          type: 'CHECKBOX',
          displayName: 'Preview URL',
          description: 'Enable link preview in the message',
          required: false,
          defaultValue: false,
        },
      },
      async run(context: WhatsAppContext) {
        const { 
          accessToken, phoneNumberId, to, message, previewUrl = false
        } = context.propsValue;
        
        const token = context.auth?.accessToken || accessToken;
        const numberId = context.auth?.phoneNumberId || phoneNumberId;
        
        if (!token || !numberId) {
          throw new Error('WhatsApp access token and phone number ID are required');
        }
        
        if (!to || !message) {
          throw new Error('Recipient phone number and message are required');
        }
        
        const formattedPhone = formatPhoneNumber(String(to));
        
        const body = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'text',
          text: {
            preview_url: previewUrl,
            body: String(message),
          },
        };
        
        console.log(`💬 WhatsApp: Sending message to ${formattedPhone}...`);
        
        const result = await whatsappRequest(numberId, 'messages', body, token);
        
        const messageId = result.messages?.[0]?.id;
        console.log(`💬 WhatsApp: Message sent, id: ${messageId}`);
        
        return {
          success: true,
          messageId,
          to: formattedPhone,
          waId: result.contacts?.[0]?.wa_id,
          timestamp: new Date().toISOString(),
        };
      },
    },
    
    /**
     * Send a template message
     */
    sendTemplateMessage: {
      name: 'sendTemplateMessage',
      displayName: 'Send Template Message',
      description: 'Send a pre-approved template message',
      props: {
        accessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Access Token',
          description: 'WhatsApp Cloud API access token',
          required: true,
        },
        phoneNumberId: {
          type: 'SHORT_TEXT',
          displayName: 'Phone Number ID',
          description: 'Your WhatsApp Business Phone Number ID',
          required: true,
        },
        to: {
          type: 'SHORT_TEXT',
          displayName: 'To',
          description: 'Recipient phone number (with country code)',
          required: true,
        },
        templateName: {
          type: 'SHORT_TEXT',
          displayName: 'Template Name',
          description: 'Name of the approved message template',
          required: true,
        },
        languageCode: {
          type: 'SHORT_TEXT',
          displayName: 'Language Code',
          description: 'Template language code (e.g., en_US, es, pt_BR)',
          required: true,
          defaultValue: 'en_US',
        },
        components: {
          type: 'JSON',
          displayName: 'Template Components',
          description: 'Template variables/parameters (JSON array)',
          required: false,
          defaultValue: '[]',
        },
      },
      async run(context: WhatsAppContext) {
        const { 
          accessToken, phoneNumberId, to, templateName, languageCode, components
        } = context.propsValue;
        
        const token = context.auth?.accessToken || accessToken;
        const numberId = context.auth?.phoneNumberId || phoneNumberId;
        
        if (!token || !numberId) {
          throw new Error('WhatsApp access token and phone number ID are required');
        }
        
        const formattedPhone = formatPhoneNumber(String(to));
        
        let parsedComponents = components;
        if (typeof components === 'string') {
          try {
            parsedComponents = JSON.parse(components);
          } catch {
            parsedComponents = [];
          }
        }
        
        const body: any = {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode,
            },
          },
        };
        
        if (Array.isArray(parsedComponents) && parsedComponents.length > 0) {
          body.template.components = parsedComponents;
        }
        
        console.log(`📋 WhatsApp: Sending template "${templateName}" to ${formattedPhone}...`);
        
        const result = await whatsappRequest(numberId, 'messages', body, token);
        
        const messageId = result.messages?.[0]?.id;
        console.log(`📋 WhatsApp: Template sent, id: ${messageId}`);
        
        return {
          success: true,
          messageId,
          to: formattedPhone,
          templateName,
          waId: result.contacts?.[0]?.wa_id,
          timestamp: new Date().toISOString(),
        };
      },
    },
    
    /**
     * Send media message (image, video, document, audio)
     */
    sendMediaMessage: {
      name: 'sendMediaMessage',
      displayName: 'Send Media Message',
      description: 'Send an image, video, document, or audio file',
      props: {
        accessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Access Token',
          description: 'WhatsApp Cloud API access token',
          required: true,
        },
        phoneNumberId: {
          type: 'SHORT_TEXT',
          displayName: 'Phone Number ID',
          description: 'Your WhatsApp Business Phone Number ID',
          required: true,
        },
        to: {
          type: 'SHORT_TEXT',
          displayName: 'To',
          description: 'Recipient phone number (with country code)',
          required: true,
        },
        mediaType: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Media Type',
          description: 'Type of media to send',
          required: true,
          defaultValue: 'image',
          options: {
            options: [
              { label: 'Image', value: 'image' },
              { label: 'Video', value: 'video' },
              { label: 'Document', value: 'document' },
              { label: 'Audio', value: 'audio' },
            ],
          },
        },
        mediaUrl: {
          type: 'SHORT_TEXT',
          displayName: 'Media URL',
          description: 'URL of the media file (must be publicly accessible)',
          required: true,
        },
        caption: {
          type: 'LONG_TEXT',
          displayName: 'Caption',
          description: 'Caption for image/video/document (optional)',
          required: false,
        },
        filename: {
          type: 'SHORT_TEXT',
          displayName: 'Filename',
          description: 'Filename for documents (optional)',
          required: false,
        },
      },
      async run(context: WhatsAppContext) {
        const { 
          accessToken, phoneNumberId, to, mediaType, mediaUrl, caption, filename
        } = context.propsValue;
        
        const token = context.auth?.accessToken || accessToken;
        const numberId = context.auth?.phoneNumberId || phoneNumberId;
        
        if (!token || !numberId) {
          throw new Error('WhatsApp access token and phone number ID are required');
        }
        
        const formattedPhone = formatPhoneNumber(String(to));
        
        const mediaContent: any = {
          link: mediaUrl,
        };
        
        if (caption && ['image', 'video', 'document'].includes(mediaType)) {
          mediaContent.caption = caption;
        }
        
        if (filename && mediaType === 'document') {
          mediaContent.filename = filename;
        }
        
        const body = {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: mediaType,
          [mediaType]: mediaContent,
        };
        
        console.log(`📎 WhatsApp: Sending ${mediaType} to ${formattedPhone}...`);
        
        const result = await whatsappRequest(numberId, 'messages', body, token);
        
        const messageId = result.messages?.[0]?.id;
        console.log(`📎 WhatsApp: ${mediaType} sent, id: ${messageId}`);
        
        return {
          success: true,
          messageId,
          to: formattedPhone,
          mediaType,
          waId: result.contacts?.[0]?.wa_id,
          timestamp: new Date().toISOString(),
        };
      },
    },
    
    /**
     * Send location message
     */
    sendLocationMessage: {
      name: 'sendLocationMessage',
      displayName: 'Send Location',
      description: 'Send a location pin to a WhatsApp number',
      props: {
        accessToken: {
          type: 'SECRET_TEXT',
          displayName: 'Access Token',
          description: 'WhatsApp Cloud API access token',
          required: true,
        },
        phoneNumberId: {
          type: 'SHORT_TEXT',
          displayName: 'Phone Number ID',
          description: 'Your WhatsApp Business Phone Number ID',
          required: true,
        },
        to: {
          type: 'SHORT_TEXT',
          displayName: 'To',
          description: 'Recipient phone number (with country code)',
          required: true,
        },
        latitude: {
          type: 'NUMBER',
          displayName: 'Latitude',
          description: 'Location latitude',
          required: true,
        },
        longitude: {
          type: 'NUMBER',
          displayName: 'Longitude',
          description: 'Location longitude',
          required: true,
        },
        name: {
          type: 'SHORT_TEXT',
          displayName: 'Location Name',
          description: 'Name of the location (optional)',
          required: false,
        },
        address: {
          type: 'SHORT_TEXT',
          displayName: 'Address',
          description: 'Address of the location (optional)',
          required: false,
        },
      },
      async run(context: WhatsAppContext) {
        const { 
          accessToken, phoneNumberId, to, latitude, longitude, name, address
        } = context.propsValue;
        
        const token = context.auth?.accessToken || accessToken;
        const numberId = context.auth?.phoneNumberId || phoneNumberId;
        
        if (!token || !numberId) {
          throw new Error('WhatsApp access token and phone number ID are required');
        }
        
        const formattedPhone = formatPhoneNumber(String(to));
        
        const locationContent: any = {
          latitude: Number(latitude),
          longitude: Number(longitude),
        };
        
        if (name) locationContent.name = name;
        if (address) locationContent.address = address;
        
        const body = {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'location',
          location: locationContent,
        };
        
        console.log(`📍 WhatsApp: Sending location to ${formattedPhone}...`);
        
        const result = await whatsappRequest(numberId, 'messages', body, token);
        
        const messageId = result.messages?.[0]?.id;
        console.log(`📍 WhatsApp: Location sent, id: ${messageId}`);
        
        return {
          success: true,
          messageId,
          to: formattedPhone,
          location: locationContent,
          waId: result.contacts?.[0]?.wa_id,
          timestamp: new Date().toISOString(),
        };
      },
    },
  },
  
  triggers: {
    /**
     * Inbound message trigger (Meta WhatsApp Cloud API webhook).
     * Configure Meta App Dashboard callback URL: https://<host>/webhook/v/whatsapp
     * @see https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint
     */
    inboundMessage: {
      name: 'inboundMessage',
      displayName: 'Inbound Message',
      description: 'Triggers when a user sends a WhatsApp message to your business number',
      type: 'WEBHOOK',
      props: inboundMessageProps,
      filter: inboundMessageFilter,
      onHandshake: inboundMessageHandshake,
      run: inboundMessageRun,
    },

    /** @deprecated Use inboundMessage */
    inboundMessageTrigger: {
      name: 'inboundMessageTrigger',
      displayName: 'Inbound Message (legacy alias)',
      description: 'Alias for inboundMessage',
      type: 'WEBHOOK',
      props: inboundMessageProps,
      filter: inboundMessageFilter,
      onHandshake: inboundMessageHandshake,
      run: inboundMessageRun,
    },
  },
};

export const whatsapp = whatsappBit;
export default whatsappBit;
