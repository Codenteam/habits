/**
 * @ha-bits/bit-discord
 * 
 * Discord Bot integration bit for sending messages and notifications.
 * Uses Discord REST API for messaging via webhooks and bot tokens.
 */

interface DiscordContext {
  auth?: {
    botToken?: string;
    webhookUrl?: string;
  };
  propsValue: Record<string, any>;
}

interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  footer?: { text: string; icon_url?: string };
  thumbnail?: { url: string };
  image?: { url: string };
  author?: { name: string; url?: string; icon_url?: string };
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}

interface DiscordChannel {
  id: string;
  type?: number;
  [key: string]: any;
}

interface DiscordWebhookPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
  tts?: boolean;
}

/**
 * Send message via Discord webhook
 */
async function sendWebhook(
  webhookUrl: string,
  payload: DiscordWebhookPayload
): Promise<{ success: boolean }> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Discord webhook error: ${error}`);
  }

  return { success: true };
}

/**
 * Send message via Discord Bot API
 */
async function sendBotMessage(
  channelId: string,
  content: string,
  botToken: string,
  embeds?: DiscordEmbed[]
): Promise<any> {
  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${botToken}`,
    },
    body: JSON.stringify({ content, embeds }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Discord API error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

const discordBit = {
  displayName: 'Discord',
  description: 'Send messages and notifications via Discord webhooks or bot',
  logoUrl: 'lucide:MessageSquare',

  auth: {
    type: 'SECRET_TEXT',
    displayName: 'Bot Token',
    description: 'Discord Bot Token (optional if using webhooks)',
    required: false,
  },

  actions: {
    /**
     * Send a message via Discord webhook
     */
    sendWebhookMessage: {
      name: 'sendWebhookMessage',
      displayName: 'Send Webhook Message',
      description: 'Send a message to a Discord channel via webhook URL',
      props: {
        webhookUrl: {
          type: 'SECRET_TEXT',
          displayName: 'Webhook URL',
          description: 'Discord webhook URL',
          required: true,
        },
        content: {
          type: 'LONG_TEXT',
          displayName: 'Message Content',
          description: 'Text content of the message',
          required: false,
        },
        username: {
          type: 'SHORT_TEXT',
          displayName: 'Username Override',
          description: 'Override the webhook username',
          required: false,
        },
        avatarUrl: {
          type: 'SHORT_TEXT',
          displayName: 'Avatar URL Override',
          description: 'Override the webhook avatar',
          required: false,
        },
        embedTitle: {
          type: 'SHORT_TEXT',
          displayName: 'Embed Title',
          description: 'Title for rich embed',
          required: false,
        },
        embedDescription: {
          type: 'LONG_TEXT',
          displayName: 'Embed Description',
          description: 'Description for rich embed',
          required: false,
        },
        embedColor: {
          type: 'SHORT_TEXT',
          displayName: 'Embed Color',
          description: 'Hex color (e.g., #5865F2)',
          required: false,
        },
      },
      async run(context: DiscordContext): Promise<any> {
        const { webhookUrl, content, username, avatarUrl, embedTitle, embedDescription, embedColor } = context.propsValue;

        const payload: DiscordWebhookPayload = {
          content: content || undefined,
          username: username || undefined,
          avatar_url: avatarUrl || undefined,
        };

        if (embedTitle || embedDescription) {
          payload.embeds = [{
            title: embedTitle,
            description: embedDescription,
            color: embedColor ? parseInt(embedColor.replace('#', ''), 16) : undefined,
          }];
        }

        return sendWebhook(webhookUrl, payload);
      },
    },

    /**
     * Send a message via Discord Bot
     */
    sendBotMessage: {
      name: 'sendBotMessage',
      displayName: 'Send Bot Message',
      description: 'Send a message to a Discord channel via bot',
      props: {
        botToken: {
          type: 'SECRET_TEXT',
          displayName: 'Bot Token',
          description: 'Discord Bot Token',
          required: true,
        },
        channelId: {
          type: 'SHORT_TEXT',
          displayName: 'Channel ID',
          description: 'Discord channel ID',
          required: true,
        },
        content: {
          type: 'LONG_TEXT',
          displayName: 'Message Content',
          description: 'Text content of the message',
          required: true,
        },
        embedTitle: {
          type: 'SHORT_TEXT',
          displayName: 'Embed Title',
          description: 'Title for rich embed (optional)',
          required: false,
        },
        embedDescription: {
          type: 'LONG_TEXT',
          displayName: 'Embed Description',
          description: 'Description for rich embed (optional)',
          required: false,
        },
      },
      async run(context: DiscordContext): Promise<any> {
        const { botToken, channelId, content, embedTitle, embedDescription } = context.propsValue;

        const embeds = (embedTitle || embedDescription) ? [{
          title: embedTitle,
          description: embedDescription,
        }] : undefined;

        return sendBotMessage(channelId, content, botToken, embeds);
      },
    },

    /**
     * Send a direct message to a user
     */
    sendDirectMessage: {
      name: 'sendDirectMessage',
      displayName: 'Send Direct Message',
      description: 'Send a direct message to a Discord user',
      props: {
        botToken: {
          type: 'SECRET_TEXT',
          displayName: 'Bot Token',
          description: 'Discord Bot Token',
          required: true,
        },
        userId: {
          type: 'SHORT_TEXT',
          displayName: 'User ID',
          description: 'Discord user ID to DM',
          required: true,
        },
        content: {
          type: 'LONG_TEXT',
          displayName: 'Message Content',
          description: 'Text content of the message',
          required: true,
        },
      },
      async run(context: DiscordContext): Promise<any> {
        const { botToken, userId, content } = context.propsValue;

        // First, create a DM channel
        const channelResponse = await fetch('https://discord.com/api/v10/users/@me/channels', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bot ${botToken}`,
          },
          body: JSON.stringify({ recipient_id: userId }),
        });

        if (!channelResponse.ok) {
          const error = await channelResponse.json();
          throw new Error(`Failed to create DM channel: ${JSON.stringify(error)}`);
        }

        const channel = await channelResponse.json() as DiscordChannel;
        return sendBotMessage(channel.id, content, botToken);
      },
    },
  },

  triggers: {},
};

export default discordBit;
