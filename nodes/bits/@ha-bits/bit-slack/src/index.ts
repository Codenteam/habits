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
  token: string
): Promise<any> {
  const url = `https://slack.com/api/${endpoint}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  
  const result = await response.json() as SlackResponse;
  
  if (!result.ok) {
    throw new Error(`Slack API Error: ${result.error}`);
  }
  
  return result;
}

const slackBit = {
  displayName: 'Slack',
  description: 'Send messages and notifications to Slack channels',
  logoUrl: 'lucide:MessageSquareText',
  
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
        emoji: {
          type: 'SHORT_TEXT',
          displayName: 'Emoji',
          description: 'Emoji name without colons (e.g., thumbsup)',
          required: true,
        },
      },
      async run(context: SlackContext) {
        const { token, channel, timestamp, emoji } = context.propsValue;
        
        const authToken = context.auth?.token || token;
        if (!authToken) {
          throw new Error('Slack Bot Token is required');
        }
        
        const body = {
          channel,
          timestamp,
          name: emoji.replace(/:/g, ''),
        };
        
        console.log(`💬 Slack: Adding reaction :${emoji}: to message...`);
        
        await slackRequest('reactions.add', body, authToken);
        
        return {
          success: true,
          emoji,
          timestamp,
        };
      },
    },
  },
  
  triggers: {},
};

export const slack = slackBit;
export default slackBit;
