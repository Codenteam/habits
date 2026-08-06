/**
 * @ha-bits/bit-slack
 * 
 * Slack integration bit for sending messages and notifications.
 * Uses Slack Web API for messaging.
 */

interface SlackContext {
  auth?: {
    token: string;
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

interface SlackInboundMessage {
  channel: string;
  user: string;
  text: string;
  timestamp: string;
  threadTs: string;
  team: string;
  eventType: string;
  subtype: string;
  raw: any;
}

interface SlackMessage {
  channel: string;
  text: string;
  blocks?: any[];
  attachments?: any[];
  thread_ts?: string;
}

interface SlackResponse {
  ok: boolean;
  error?: string;
  [key: string]: any;
}

/**
 * Make a request to Slack API
 */
async function slackRequest(
  endpoint: string,
  body: any,
  token: string,
  method: 'GET' | 'POST' = 'POST',
): Promise<any> {
  let url = `https://slack.com/api/${endpoint}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };

  const options: RequestInit = { method, headers };

  if (method === 'GET') {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  } else {
    headers['Content-Type'] = 'application/json; charset=utf-8';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  const result = await response.json() as SlackResponse;
  
  if (!result.ok) {
    throw new Error(`Slack API Error: ${result.error}`);
  }
  
  return result;
}

/**
 * Extract inbound user messages from a Slack Events API event_callback payload.
 * @see https://docs.slack.dev/apis/events-api/
 */
function extractInboundMessages(body: any): SlackInboundMessage[] {
  if (!body || body.type !== 'event_callback' || !body.event) {
    return [];
  }

  const event = body.event;
  if (event.type !== 'message') {
    return [];
  }

  // Skip bot messages and non-user message subtypes (edits, deletes, etc.)
  if (event.bot_id || event.subtype === 'bot_message') {
    return [];
  }
  if (event.subtype && !['file_share', 'thread_broadcast'].includes(event.subtype)) {
    return [];
  }

  return [{
    channel: String(event.channel ?? ''),
    user: String(event.user ?? event.bot_id ?? ''),
    text: String(event.text ?? ''),
    timestamp: String(event.ts ?? event.event_ts ?? ''),
    threadTs: String(event.thread_ts ?? ''),
    team: String(body.team_id ?? ''),
    eventType: String(event.type ?? 'message'),
    subtype: String(event.subtype ?? ''),
    raw: event,
  }];
}

function hasInboundMessages(body: any): boolean {
  return extractInboundMessages(body).length > 0;
}

function inboundMessageFilter(payload: WebhookFilterPayload): boolean {
  if (payload.method === 'POST' && payload.body?.type === 'url_verification') {
    return true;
  }

  if (payload.method !== 'POST') {
    return false;
  }

  return payload.body?.type === 'event_callback' && hasInboundMessages(payload.body);
}

/**
 * Slack Events API URL verification handshake.
 * @see https://docs.slack.dev/apis/events-api/using-http-request-urls/
 */
async function inboundMessageHandshake(context: SlackContext): Promise<string | false> {
  const body = context.webhookPayload?.body ?? {};
  if (body.type !== 'url_verification') {
    return false;
  }

  const challenge = String(body.challenge ?? '');
  if (!challenge) {
    return false;
  }

  console.log('[bit-slack] URL verification handshake succeeded');
  return challenge;
}

async function inboundMessageRun(context: SlackContext) {
  const body = context.webhookPayload?.body ?? context.payload;
  const messages = extractInboundMessages(body);

  return messages.map((msg) => ({
    event: 'inboundMessage',
    ...msg,
    raw: body,
  }));
}

const slackBit = {
  // Vendor webhook routing: POST /webhook/v/slack
  id: 'slack',
  displayName: 'Slack',
  description: 'Send messages and notifications to Slack channels',
  logoUrl: 'lucide:MessageSquareText',
  runtime: 'all',
  
  auth: {
    type: 'SECRET_TEXT',
    displayName: 'Bot Token',
    description: 'Slack Bot OAuth Token (xoxb-...)',
    required: true,
  },
  
  actions: {
    /**
     * Send a message to a Slack channel
     */
    sendMessage: {
      name: 'sendMessage',
      displayName: 'Send Message',
      description: 'Send a message to a Slack channel or user',
      props: {
        token: {
          type: 'SECRET_TEXT',
          displayName: 'Bot Token',
          description: 'Slack Bot OAuth Token',
          required: true,
        },
        channel: {
          type: 'SHORT_TEXT',
          displayName: 'Channel',
          description: 'Channel ID or name (#channel) or user ID for DM',
          required: true,
        },
        text: {
          type: 'LONG_TEXT',
          displayName: 'Message Text',
          description: 'The message content',
          required: true,
        },
        username: {
          type: 'SHORT_TEXT',
          displayName: 'Username',
          description: 'Bot username to display (optional)',
          required: false,
        },
        iconEmoji: {
          type: 'SHORT_TEXT',
          displayName: 'Icon Emoji',
          description: 'Emoji to use as icon (e.g., :robot_face:)',
          required: false,
        },
        threadTs: {
          type: 'SHORT_TEXT',
          displayName: 'Thread Timestamp',
          description: 'Reply to a specific thread (optional)',
          required: false,
        },
        unfurlLinks: {
          type: 'CHECKBOX',
          displayName: 'Unfurl Links',
          description: 'Show link previews',
          required: false,
          defaultValue: true,
        },
      },
      async run(context: SlackContext) {
        const { 
          token, channel, text, username, iconEmoji, threadTs, unfurlLinks = true
        } = context.propsValue;
        
        const authToken = context.auth?.token || token;
        if (!authToken) {
          throw new Error('Slack Bot Token is required');
        }
        
        const body: any = {
          channel,
          text,
          unfurl_links: unfurlLinks,
        };
        
        if (username) body.username = username;
        if (iconEmoji) body.icon_emoji = iconEmoji;
        if (threadTs) body.thread_ts = threadTs;
        
        console.log(`💬 Slack: Sending message to ${channel}...`);
        
        const result = await slackRequest('chat.postMessage', body, authToken);
        
        console.log(`💬 Slack: Message sent, ts: ${result.ts}`);
        
        return {
          success: true,
          channel: result.channel,
          timestamp: result.ts,
          message: result.message,
        };
      },
    },
    
    /**
     * Send a message with blocks (rich formatting)
     */
    sendBlockMessage: {
      name: 'sendBlockMessage',
      displayName: 'Send Block Message',
      description: 'Send a rich message with Block Kit formatting',
      props: {
        token: {
          type: 'SECRET_TEXT',
          displayName: 'Bot Token',
          description: 'Slack Bot OAuth Token',
          required: true,
        },
        channel: {
          type: 'SHORT_TEXT',
          displayName: 'Channel',
          description: 'Channel ID or name',
          required: true,
        },
        text: {
          type: 'LONG_TEXT',
          displayName: 'Fallback Text',
          description: 'Text shown in notifications',
          required: true,
        },
        blocks: {
          type: 'JSON',
          displayName: 'Blocks',
          description: 'Block Kit blocks array (JSON)',
          required: true,
          defaultValue: '[]',
        },
      },
      async run(context: SlackContext) {
        const { token, channel, text, blocks } = context.propsValue;
        
        const authToken = context.auth?.token || token;
        if (!authToken) {
          throw new Error('Slack Bot Token is required');
        }
        
        let parsedBlocks = blocks;
        if (typeof blocks === 'string') {
          try {
            parsedBlocks = JSON.parse(blocks);
          } catch {
            throw new Error('Invalid blocks JSON');
          }
        }
        
        const body = {
          channel,
          text,
          blocks: parsedBlocks,
        };
        
        console.log(`💬 Slack: Sending block message to ${channel}...`);
        
        const result = await slackRequest('chat.postMessage', body, authToken);
        
        return {
          success: true,
          channel: result.channel,
          timestamp: result.ts,
        };
      },
    },
    
    /**
     * Send a message via incoming webhook
     */
    sendWebhook: {
      name: 'sendWebhook',
      displayName: 'Send Webhook Message',
      description: 'Send a message via Slack Incoming Webhook',
      props: {
        webhookUrl: {
          type: 'SHORT_TEXT',
          displayName: 'Webhook URL',
          description: 'Slack Incoming Webhook URL',
          required: true,
        },
        text: {
          type: 'LONG_TEXT',
          displayName: 'Message Text',
          description: 'The message content',
          required: true,
        },
        username: {
          type: 'SHORT_TEXT',
          displayName: 'Username',
          description: 'Override username (optional)',
          required: false,
        },
        iconEmoji: {
          type: 'SHORT_TEXT',
          displayName: 'Icon Emoji',
          description: 'Override icon emoji (optional)',
          required: false,
        },
        channel: {
          type: 'SHORT_TEXT',
          displayName: 'Channel Override',
          description: 'Override channel (optional)',
          required: false,
        },
      },
      async run(context: SlackContext) {
        const { webhookUrl, text, username, iconEmoji, channel } = context.propsValue;
        
        if (!webhookUrl) {
          throw new Error('Webhook URL is required');
        }
        
        const body: any = { text };
        if (username) body.username = username;
        if (iconEmoji) body.icon_emoji = iconEmoji;
        if (channel) body.channel = channel;
        
        console.log(`💬 Slack Webhook: Sending message...`);
        
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Slack Webhook Error: ${errorText}`);
        }
        
        console.log(`💬 Slack Webhook: Message sent`);
        
        return {
          success: true,
          timestamp: new Date().toISOString(),
        };
      },
    },
    
    /**
     * Update an existing message
     */
    updateMessage: {
      name: 'updateMessage',
      displayName: 'Update Message',
      description: 'Update an existing Slack message',
      props: {
        token: {
          type: 'SECRET_TEXT',
          displayName: 'Bot Token',
          description: 'Slack Bot OAuth Token',
          required: true,
        },
        channel: {
          type: 'SHORT_TEXT',
          displayName: 'Channel',
          description: 'Channel ID where message exists',
          required: true,
        },
        timestamp: {
          type: 'SHORT_TEXT',
          displayName: 'Message Timestamp',
          description: 'The ts of the message to update',
          required: true,
        },
        text: {
          type: 'LONG_TEXT',
          displayName: 'New Text',
          description: 'Updated message content',
          required: true,
        },
      },
      async run(context: SlackContext) {
        const { token, channel, timestamp, text } = context.propsValue;
        
        const authToken = context.auth?.token || token;
        if (!authToken) {
          throw new Error('Slack Bot Token is required');
        }
        
        const body = {
          channel,
          ts: timestamp,
          text,
        };
        
        console.log(`💬 Slack: Updating message ${timestamp}...`);
        
        const result = await slackRequest('chat.update', body, authToken);
        
        return {
          success: true,
          channel: result.channel,
          timestamp: result.ts,
        };
      },
    },
    
    /**
     * Retrieve a thread of messages posted to a conversation
     * @see https://docs.slack.dev/reference/methods/conversations.replies/
     */
    getConversationReplies: {
      name: 'getConversationReplies',
      displayName: 'Get Conversation Replies',
      description: 'Retrieve a thread of messages posted to a conversation',
      props: {
        token: {
          type: 'SECRET_TEXT',
          displayName: 'Bot Token',
          description: 'Slack Bot OAuth Token',
          required: true,
        },
        channel: {
          type: 'SHORT_TEXT',
          displayName: 'Channel',
          description: 'Conversation ID to fetch thread from',
          required: true,
        },
        ts: {
          type: 'SHORT_TEXT',
          displayName: 'Thread Timestamp',
          description: 'Parent message ts (thread root)',
          required: true,
        },
      },
      async run(context: SlackContext) {
        const { token, channel, ts } = context.propsValue;

        const authToken = context.auth?.token || token;
        if (!authToken) {
          throw new Error('Slack Bot Token is required');
        }

        console.log(`💬 Slack: Fetching replies for ${channel} thread ${ts}...`);

        const result = await slackRequest('conversations.replies', { channel, ts }, authToken, 'GET');

        return {
          success: true,
          channel,
          ts,
          messages: result.messages ?? [],
          hasMore: result.has_more ?? false,
        };
      },
    },

    /**
     * Get reactions for a specific message
     * @see https://docs.slack.dev/reference/methods/reactions.get/
     */
    getReactions: {
      name: 'getReactions',
      displayName: 'Get Reactions',
      description: 'Gets reactions for a specific message',
      props: {
        token: {
          type: 'SECRET_TEXT',
          displayName: 'Bot Token',
          description: 'Slack Bot OAuth Token',
          required: true,
        },
        channel: {
          type: 'SHORT_TEXT',
          displayName: 'Channel',
          description: 'Channel where the message was posted',
          required: true,
        },
        timestamp: {
          type: 'SHORT_TEXT',
          displayName: 'Message Timestamp',
          description: 'Timestamp of the message to get reactions for',
          required: true,
        },
      },
      async run(context: SlackContext) {
        const { token, channel, timestamp } = context.propsValue;

        const authToken = context.auth?.token || token;
        if (!authToken) {
          throw new Error('Slack Bot Token is required');
        }

        console.log(`💬 Slack: Fetching reactions for ${channel} message ${timestamp}...`);

        const result = await slackRequest('reactions.get', { channel, timestamp }, authToken, 'GET');

        return {
          success: true,
          channel,
          timestamp,
          reactions: result.message?.reactions ?? [],
          message: result.message,
        };
      },
    },

    /**
     * Add a reaction to a message
     */
    addReaction: {
      name: 'addReaction',
      displayName: 'Add Reaction',
      description: 'Add an emoji reaction to a message',
      props: {
        token: {
          type: 'SECRET_TEXT',
          displayName: 'Bot Token',
          description: 'Slack Bot OAuth Token',
          required: true,
        },
        channel: {
          type: 'SHORT_TEXT',
          displayName: 'Channel',
          description: 'Channel ID',
          required: true,
        },
        timestamp: {
          type: 'SHORT_TEXT',
          displayName: 'Message Timestamp',
          description: 'The ts of the message',
          required: true,
        },
        name: {
          type: 'SHORT_TEXT',
          displayName: 'Reaction Name',
          description: 'Emoji name without colons (e.g., thumbsup)',
          required: true,
        },
      },
      async run(context: SlackContext) {
        const { token, channel, timestamp, name } = context.propsValue;
        
        const authToken = context.auth?.token || token;
        if (!authToken) {
          throw new Error('Slack Bot Token is required');
        }
        
        const reactionName = String(name).replace(/:/g, '');
        
        const body = {
          channel,
          timestamp,
          name: reactionName,
        };
        
        console.log(`💬 Slack: Adding reaction :${reactionName}: to message...`);
        
        await slackRequest('reactions.add', body, authToken);
        
        return {
          success: true,
          name: reactionName,
          timestamp,
        };
      },
    },
  },
  
  triggers: {
    /**
     * Inbound message trigger (Slack Events API).
     * Configure Request URL in Slack app Event Subscriptions: https://<host>/webhook/v/slack
     * @see https://docs.slack.dev/apis/events-api/using-http-request-urls/
     */
    inboundMessage: {
      name: 'inboundMessage',
      displayName: 'Inbound Message',
      description: 'Triggers when a user posts a message in a channel the app is subscribed to',
      type: 'WEBHOOK',
      props: {},
      filter: inboundMessageFilter,
      onHandshake: inboundMessageHandshake,
      run: inboundMessageRun,
    },
  },
};

export {
  verifySlackRequestSignature,
  getSlackSignatureHeaders,
} from './verifySignature';
export type {
  VerifySlackRequestSignatureParams,
  VerifySlackRequestSignatureResult,
} from './verifySignature';

export const slack = slackBit;
export default slackBit;
