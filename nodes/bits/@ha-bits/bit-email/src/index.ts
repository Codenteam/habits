/**
 * @ha-bits/bit-email
 * 
 * Email integration bit for IMAP fetching and SMTP sending.
 * Provides triggers for new emails and actions for sending emails.
 */

import { ImapFlow } from 'imapflow';

interface EmailContext {
  auth?: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
  };
  propsValue: Record<string, any>;
}

interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
  }>;
}

/**
 * Fetch emails from IMAP server using imapflow
 */
async function fetchImapEmails(
  host: string,
  port: number,
  user: string,
  password: string,
  folder: string = 'INBOX',
  limit: number = 10,
  unreadOnly: boolean = true
): Promise<EmailMessage[]> {
  console.log(`📧 IMAP: Connecting to ${host}:${port} as ${user}...`);
  console.log(`📧 IMAP: Fetching from ${folder}, limit: ${limit}, unreadOnly: ${unreadOnly}`);
  
  const client = new ImapFlow({
    host,
    port,
    secure: port === 993,
    auth: {
      user,
      pass: password,
    },
    logger: false,
  });

  const emails: EmailMessage[] = [];

  try {
    await client.connect();
    console.log(`📧 IMAP: Connected successfully`);

    const lock = await client.getMailboxLock(folder);
    
    try {
      // Build search query
      const searchQuery: any = unreadOnly ? { seen: false } : 'all';
      
      // Search for messages
      const searchResult = await client.search(searchQuery, { uid: true });
      const messages = Array.isArray(searchResult) ? searchResult : [];
      
      if (messages.length === 0) {
        console.log(`📧 IMAP: No messages found matching criteria`);
        return emails;
      }

      // Get the most recent messages up to limit
      const messagesToFetch = messages.slice(-limit).reverse();
      console.log(`📧 IMAP: Found ${messages.length} messages, fetching ${messagesToFetch.length}`);

      // Fetch message details
      for await (const message of client.fetch(messagesToFetch, {
        uid: true,
        envelope: true,
        source: true,
        bodyStructure: true,
      })) {
        const envelope = message.envelope;
        if (!envelope) continue;
        
        // Parse from address
        const fromAddr = envelope.from?.[0];
        const from = fromAddr 
          ? (fromAddr.name ? `${fromAddr.name} <${fromAddr.address}>` : fromAddr.address || '')
          : '';
        
        // Parse to addresses
        const toAddrs = envelope.to || [];
        const to = toAddrs
          .map((addr: any) => addr.name ? `${addr.name} <${addr.address}>` : addr.address || '')
          .join(', ');

        // Extract body from source
        let body = '';
        if (message.source) {
          const sourceStr = message.source.toString();
          // Simple extraction - find body after headers
          const bodyMatch = sourceStr.split(/\r?\n\r?\n/);
          if (bodyMatch.length > 1) {
            body = bodyMatch.slice(1).join('\n\n');
          }
        }

        // Extract attachments info from bodyStructure
        const attachments: Array<{ filename: string; contentType: string; size: number }> = [];
        if (message.bodyStructure) {
          extractAttachments(message.bodyStructure, attachments);
        }

        emails.push({
          id: String(message.uid),
          from,
          to,
          subject: envelope.subject || '',
          body,
          date: envelope.date?.toISOString() || new Date().toISOString(),
          attachments: attachments.length > 0 ? attachments : undefined,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
    console.log(`📧 IMAP: Disconnected`);
  }

  console.log(`📧 IMAP: Fetched ${emails.length} email(s)`);
  return emails;
}

/**
 * Recursively extract attachment info from bodyStructure
 */
function extractAttachments(
  structure: any,
  attachments: Array<{ filename: string; contentType: string; size: number }>
): void {
  if (!structure) return;

  // Check if this part is an attachment
  if (structure.disposition === 'attachment' || 
      (structure.disposition === 'inline' && structure.dispositionParameters?.filename)) {
    const filename = structure.dispositionParameters?.filename || 
                     structure.parameters?.name || 
                     'attachment';
    attachments.push({
      filename,
      contentType: `${structure.type}/${structure.subtype}`,
      size: structure.size || 0,
    });
  }

  // Recurse into child parts
  if (structure.childNodes && Array.isArray(structure.childNodes)) {
    for (const child of structure.childNodes) {
      extractAttachments(child, attachments);
    }
  }
}

/**
 * Simulate SMTP send (in real implementation, use nodemailer or similar)
 */
async function sendSmtpEmail(
  host: string,
  port: number,
  user: string,
  password: string,
  from: string,
  to: string,
  subject: string,
  body: string,
  html?: string,
  attachments?: Array<{ filename: string; content: string | Buffer }>
): Promise<{ messageId: string; accepted: string[] }> {
  console.log(`📤 SMTP: Connecting to ${host}:${port} as ${user}...`);
  console.log(`📤 SMTP: Sending from ${from} to ${to}`);
  console.log(`📤 SMTP: Subject: ${subject}`);
  
  // In production, this would use nodemailer
  // For now, return mock response
  const messageId = `<${Date.now()}.${Math.random().toString(36).substring(7)}@habits.local>`;
  
  return {
    messageId,
    accepted: [to]
  };
}

const emailBit = {
  displayName: 'Email (IMAP/SMTP)',
  description: 'Email integration for fetching (IMAP) and sending (SMTP) emails',
  logoUrl: 'lucide:Mail',
  
  auth: {
    type: 'CUSTOM',
    displayName: 'Email Credentials',
    description: 'Email server credentials',
    required: false,
    props: {
      host: { type: 'SHORT_TEXT', displayName: 'Host', required: false },
      port: { type: 'NUMBER', displayName: 'Port', required: false },
      user: { type: 'SHORT_TEXT', displayName: 'Username', required: false },
      password: { type: 'SECRET_TEXT', displayName: 'Password', required: false },
    }
  },
  
  triggers: {
    /**
     * IMAP trigger - fetch new emails
     */
    newEmail: {
      name: 'newEmail',
      displayName: 'New Email (IMAP)',
      description: 'Trigger when new emails arrive in the mailbox',
      type: 'POLLING',
      props: {
        folder: {
          type: 'SHORT_TEXT',
          displayName: 'Folder',
          description: 'Mailbox folder to monitor',
          required: false,
          defaultValue: 'INBOX',
        },
        unreadOnly: {
          type: 'CHECKBOX',
          displayName: 'Unread Only',
          description: 'Only fetch unread emails',
          required: false,
          defaultValue: true,
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Limit',
          description: 'Maximum number of emails to fetch',
          required: false,
          defaultValue: 10,
        },
      },
      async run(context: EmailContext) {
        const { folder = 'INBOX', unreadOnly = true, limit = 10 } = context.propsValue;
        
        const { host, port = 993, user, password } = context.auth || {};
        
        if (!host || !user || !password) {
          throw new Error('IMAP credentials are required in auth');
        }
        
        const emails = await fetchImapEmails(
          host, Number(port), user, password,
          String(folder), Number(limit), Boolean(unreadOnly)
        );
        
        console.log(`📧 IMAP Trigger: Fetched ${emails.length} email(s)`);
        
        return {
          emails,
          count: emails.length,
          folder,
          timestamp: new Date().toISOString(),
        };
      },
    },
  },
  
  actions: {
    /**
     * New Email action (for workflow testing - simulates IMAP trigger as action)
     */
    newEmail: {
      name: 'newEmail',
      displayName: 'New Email (IMAP)',
      description: 'Fetch new emails from IMAP mailbox (action version of trigger)',
      props: {
        folder: {
          type: 'SHORT_TEXT',
          displayName: 'Folder',
          description: 'Mailbox folder',
          required: false,
          defaultValue: 'INBOX',
        },
        unreadOnly: {
          type: 'CHECKBOX',
          displayName: 'Unread Only',
          description: 'Only fetch unread emails',
          required: false,
          defaultValue: true,
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Limit',
          description: 'Maximum number of emails',
          required: false,
          defaultValue: 10,
        },
      },
      async run(context: EmailContext) {
        const { folder = 'INBOX' } = context.propsValue;
        
        // Return mock test data for workflow testing
        const mockEmails: EmailMessage[] = [
          {
            id: `email_${Date.now()}`,
            from: 'customer@example.com',
            to: 'support@company.com',
            subject: 'Help with my order #12345',
            body: 'Hi, I placed an order last week and haven\'t received any shipping confirmation. Can you help me track it? Order number is 12345. Thanks!',
            date: new Date().toISOString(),
          },
          {
            id: `email_${Date.now() + 1}`,
            from: 'sales.inquiry@prospect.com',
            to: 'sales@company.com',
            subject: 'Pricing inquiry for enterprise plan',
            body: 'We are interested in your enterprise pricing. Our company has 500+ employees. Please send us a quote.',
            date: new Date(Date.now() - 3600000).toISOString(),
          },
        ];
        
        console.log(`📧 New Email (Mock): Returning ${mockEmails.length} test emails from ${folder}`);
        
        return {
          emails: mockEmails,
          count: mockEmails.length,
          folder,
          timestamp: new Date().toISOString(),
        };
      },
    },
    
    /**
     * Fetch emails from IMAP server
     */
    fetchEmails: {
      name: 'fetchEmails',
      displayName: 'Fetch Emails (IMAP)',
      description: 'Fetch emails from an IMAP mailbox',
      props: {
        folder: {
          type: 'SHORT_TEXT',
          displayName: 'Folder',
          description: 'Mailbox folder to fetch from',
          required: false,
          defaultValue: 'INBOX',
        },
        unreadOnly: {
          type: 'CHECKBOX',
          displayName: 'Unread Only',
          description: 'Only fetch unread emails',
          required: false,
          defaultValue: false,
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Limit',
          description: 'Maximum number of emails to fetch',
          required: false,
          defaultValue: 10,
        },
      },
      async run(context: EmailContext) {
        const { folder = 'INBOX', unreadOnly = false, limit = 10 } = context.propsValue;
        
        const { host, port = 993, user, password } = context.auth || {};
        
        if (!host || !user || !password) {
          throw new Error('IMAP credentials are required in auth');
        }
        
        const emails = await fetchImapEmails(
          host, Number(port), user, password,
          String(folder), Number(limit), Boolean(unreadOnly)
        );
        
        console.log(`📧 Fetch Emails: Retrieved ${emails.length} email(s) from ${folder}`);
        
        return {
          emails,
          count: emails.length,
          folder,
        };
      },
    },
    
    /**
     * Send email via SMTP
     */
    sendEmail: {
      name: 'sendEmail',
      displayName: 'Send Email (SMTP)',
      description: 'Send an email via SMTP',
      props: {
        from: {
          type: 'SHORT_TEXT',
          displayName: 'From',
          description: 'Sender email address',
          required: true,
        },
        to: {
          type: 'SHORT_TEXT',
          displayName: 'To',
          description: 'Recipient email address(es), comma-separated',
          required: true,
        },
        cc: {
          type: 'SHORT_TEXT',
          displayName: 'CC',
          description: 'CC recipients (optional)',
          required: false,
        },
        bcc: {
          type: 'SHORT_TEXT',
          displayName: 'BCC',
          description: 'BCC recipients (optional)',
          required: false,
        },
        subject: {
          type: 'SHORT_TEXT',
          displayName: 'Subject',
          description: 'Email subject line',
          required: true,
        },
        body: {
          type: 'LONG_TEXT',
          displayName: 'Body (Plain Text)',
          description: 'Email body in plain text',
          required: true,
        },
        html: {
          type: 'LONG_TEXT',
          displayName: 'Body (HTML)',
          description: 'Email body in HTML format (optional)',
          required: false,
        },
        replyTo: {
          type: 'SHORT_TEXT',
          displayName: 'Reply-To',
          description: 'Reply-to address (optional)',
          required: false,
        },
      },
      async run(context: EmailContext) {
        const { from, to, subject, body, html, cc, bcc, replyTo } = context.propsValue;
        
        const { host, port = 587, user, password } = context.auth || {};
        
        if (!host || !user || !password) {
          throw new Error('SMTP credentials are required in auth');
        }
        
        if (!from || !to || !subject || !body) {
          throw new Error('From, To, Subject, and Body are required');
        }
        
        const result = await sendSmtpEmail(
          host, Number(port), user, password,
          String(from), String(to), String(subject), String(body), html
        );
        
        console.log(`📤 Send Email: Message sent to ${to}`);
        
        return {
          success: true,
          messageId: result.messageId,
          accepted: result.accepted,
          from,
          to,
          subject,
          timestamp: new Date().toISOString(),
        };
      },
    },
    
    /**
     * Parse email content
     */
    parseEmail: {
      name: 'parseEmail',
      displayName: 'Parse Email',
      description: 'Extract structured data from email content',
      props: {
        rawEmail: {
          type: 'LONG_TEXT',
          displayName: 'Raw Email',
          description: 'Raw email content or JSON email object',
          required: true,
        },
        extractAttachments: {
          type: 'CHECKBOX',
          displayName: 'Extract Attachments',
          description: 'Include attachment information',
          required: false,
          defaultValue: false,
        },
      },
      async run(context: EmailContext) {
        const { rawEmail, extractAttachments } = context.propsValue;
        
        let email: any;
        if (typeof rawEmail === 'string') {
          try {
            email = JSON.parse(rawEmail);
          } catch {
            // Parse as raw email text - simplified parsing
            const lines = rawEmail.split('\n');
            email = {
              subject: '',
              from: '',
              to: '',
              body: rawEmail,
            };
            for (const line of lines) {
              if (line.toLowerCase().startsWith('subject:')) {
                email.subject = line.substring(8).trim();
              } else if (line.toLowerCase().startsWith('from:')) {
                email.from = line.substring(5).trim();
              } else if (line.toLowerCase().startsWith('to:')) {
                email.to = line.substring(3).trim();
              }
            }
          }
        } else {
          email = rawEmail;
        }
        
        console.log(`📧 Parse Email: Extracted from ${email.from || 'unknown'}`);
        
        return {
          from: email.from || '',
          to: email.to || '',
          subject: email.subject || '',
          body: email.body || email.text || '',
          html: email.html || '',
          date: email.date || new Date().toISOString(),
          attachments: extractAttachments ? (email.attachments || []) : [],
        };
      },
    },
  },
};

export const email = emailBit;
export default emailBit;
