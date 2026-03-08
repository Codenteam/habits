/**
 * @ha-bits/bit-telegram
 * 
 * Telegram Bot integration bit for sending messages and notifications.
 * Uses Telegram Bot API for messaging.
 */

interface TelegramContext {
  auth?: {
    botToken: string;
  };
  propsValue: Record<string, any>;
}

interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
  error_code?: number;
}

/**
 * Make a request to Telegram Bot API
 */
async function telegramRequest(
  method: string,
  body: any,
  botToken: string
): Promise<TelegramResponse> {
  const url = `https://api.telegram.org/bot${botToken}/${method}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  const result: TelegramResponse = await response.json();
  
  if (!result.ok) {
    throw new Error(`Telegram API Error: ${result.description || 'Unknown error'} (${result.error_code})`);
  }
  
  return result;
}

const telegramBit = {
  displayName: 'Telegram',
  description: 'Send messages and notifications via Telegram Bot API',
  logoUrl: 'lucide:Send',
  
  auth: {
    type: 'SECRET_TEXT',
    displayName: 'Bot Token',
    description: 'Telegram Bot Token (from @BotFather)',
    required: true,
  },
  
  actions: {
    /**
     * Send a text message to a Telegram chat
     */
    sendMessage: {
      name: 'sendMessage',
      displayName: 'Send Message',
      description: 'Send a text message to a Telegram user or group',
      props: {
        botToken: {
          type: 'SECRET_TEXT',
          displayName: 'Bot Token',
          description: 'Telegram Bot Token (from @BotFather)',
          required: true,
        },
        chatId: {
          type: 'SHORT_TEXT',
          displayName: 'Chat ID',
          description: 'Chat ID, username (@username), or channel username (@channelusername)',
          required: true,
        },
        text: {
          type: 'LONG_TEXT',
          displayName: 'Message Text',
          description: 'Text message to send (supports Markdown or HTML if parseMode is set)',
          required: true,
        },
        parseMode: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Parse Mode',
          description: 'Text formatting mode',
          required: false,
          defaultValue: '',
          options: {
            options: [
              { label: 'None', value: '' },
              { label: 'Markdown', value: 'Markdown' },
              { label: 'MarkdownV2', value: 'MarkdownV2' },
              { label: 'HTML', value: 'HTML' },
            ],
          },
        },
        disableNotification: {
          type: 'CHECKBOX',
          displayName: 'Disable Notification',
          description: 'Send message silently without notification',
          required: false,
          defaultValue: false,
        },
        protectContent: {
          type: 'CHECKBOX',
          displayName: 'Protect Content',
          description: 'Prevent forwarding and saving of the message',
          required: false,
          defaultValue: false,
        },
        replyToMessageId: {
          type: 'NUMBER',
          displayName: 'Reply To Message ID',
          description: 'ID of the message to reply to (optional)',
          required: false,
        },
      },
      async run(context: TelegramContext) {
        const { 
          botToken, chatId, text, parseMode, 
          disableNotification = false, protectContent = false, replyToMessageId
        } = context.propsValue;
        
        const token = context.auth?.botToken || botToken;
        if (!token) {
          throw new Error('Telegram Bot Token is required');
        }
        
        if (!chatId || !text) {
          throw new Error('Chat ID and message text are required');
        }
        
        const body: any = {
          chat_id: chatId,
          text: String(text),
          disable_notification: disableNotification,
          protect_content: protectContent,
        };
        
        if (parseMode) body.parse_mode = parseMode;
        if (replyToMessageId) body.reply_to_message_id = Number(replyToMessageId);
        
        console.log(`📱 Telegram: Sending message to ${chatId}...`);
        
        const result = await telegramRequest('sendMessage', body, token);
        
        console.log(`📱 Telegram: Message sent, id: ${result.result?.message_id}`);
        
        return {
          success: true,
          messageId: result.result?.message_id,
          chatId: result.result?.chat?.id,
          date: result.result?.date,
          text: result.result?.text,
        };
      },
    },
    
    /**
     * Send a photo to a Telegram chat
     */
    sendPhoto: {
      name: 'sendPhoto',
      displayName: 'Send Photo',
      description: 'Send a photo to a Telegram user or group',
      props: {
        botToken: {
          type: 'SECRET_TEXT',
          displayName: 'Bot Token',
          description: 'Telegram Bot Token',
          required: true,
        },
        chatId: {
          type: 'SHORT_TEXT',
          displayName: 'Chat ID',
          description: 'Chat ID or username',
          required: true,
        },
        photo: {
          type: 'SHORT_TEXT',
          displayName: 'Photo',
          description: 'Photo URL or file_id',
          required: true,
        },
        caption: {
          type: 'LONG_TEXT',
          displayName: 'Caption',
          description: 'Photo caption (optional)',
          required: false,
        },
        parseMode: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Parse Mode',
          description: 'Caption formatting mode',
          required: false,
          defaultValue: '',
          options: {
            options: [
              { label: 'None', value: '' },
              { label: 'Markdown', value: 'Markdown' },
              { label: 'MarkdownV2', value: 'MarkdownV2' },
              { label: 'HTML', value: 'HTML' },
            ],
          },
        },
      },
      async run(context: TelegramContext) {
        const { botToken, chatId, photo, caption, parseMode } = context.propsValue;
        
        const token = context.auth?.botToken || botToken;
        if (!token) {
          throw new Error('Telegram Bot Token is required');
        }
        
        const body: any = {
          chat_id: chatId,
          photo,
        };
        
        if (caption) body.caption = caption;
        if (parseMode) body.parse_mode = parseMode;
        
        console.log(`📷 Telegram: Sending photo to ${chatId}...`);
        
        const result = await telegramRequest('sendPhoto', body, token);
        
        return {
          success: true,
          messageId: result.result?.message_id,
          chatId: result.result?.chat?.id,
        };
      },
    },
    
    /**
     * Send a document to a Telegram chat
     */
    sendDocument: {
      name: 'sendDocument',
      displayName: 'Send Document',
      description: 'Send a document to a Telegram user or group',
      props: {
        botToken: {
          type: 'SECRET_TEXT',
          displayName: 'Bot Token',
          description: 'Telegram Bot Token',
          required: true,
        },
        chatId: {
          type: 'SHORT_TEXT',
          displayName: 'Chat ID',
          description: 'Chat ID or username',
          required: true,
        },
        document: {
          type: 'SHORT_TEXT',
          displayName: 'Document',
          description: 'Document URL or file_id',
          required: true,
        },
        caption: {
          type: 'LONG_TEXT',
          displayName: 'Caption',
          description: 'Document caption (optional)',
          required: false,
        },
        filename: {
          type: 'SHORT_TEXT',
          displayName: 'Filename',
          description: 'Custom filename (optional)',
          required: false,
        },
      },
      async run(context: TelegramContext) {
        const { botToken, chatId, document, caption, filename } = context.propsValue;
        
        const token = context.auth?.botToken || botToken;
        if (!token) {
          throw new Error('Telegram Bot Token is required');
        }
        
        const body: any = {
          chat_id: chatId,
          document,
        };
        
        if (caption) body.caption = caption;
        if (filename) body.filename = filename;
        
        console.log(`📄 Telegram: Sending document to ${chatId}...`);
        
        const result = await telegramRequest('sendDocument', body, token);
        
        return {
          success: true,
          messageId: result.result?.message_id,
          chatId: result.result?.chat?.id,
        };
      },
    },
    
    /**
     * Get bot information
     */
    getMe: {
      name: 'getMe',
      displayName: 'Get Bot Info',
      description: 'Get information about the bot',
      props: {
        botToken: {
          type: 'SECRET_TEXT',
          displayName: 'Bot Token',
          description: 'Telegram Bot Token',
          required: true,
        },
      },
      async run(context: TelegramContext) {
        const { botToken } = context.propsValue;
        
        const token = context.auth?.botToken || botToken;
        if (!token) {
          throw new Error('Telegram Bot Token is required');
        }
        
        console.log(`📱 Telegram: Getting bot info...`);
        
        const result = await telegramRequest('getMe', {}, token);
        
        return {
          id: result.result?.id,
          isBot: result.result?.is_bot,
          firstName: result.result?.first_name,
          username: result.result?.username,
          canJoinGroups: result.result?.can_join_groups,
          canReadAllGroupMessages: result.result?.can_read_all_group_messages,
          supportsInlineQueries: result.result?.supports_inline_queries,
        };
      },
    },
  },
  
  triggers: {},
};

export const telegram = telegramBit;
export default telegramBit;
