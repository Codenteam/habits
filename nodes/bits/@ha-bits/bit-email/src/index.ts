/**
 * @ha-bits/bit-email
 * 
 * Email integration bit for IMAP fetching and SMTP sending.
 * Provides triggers for new emails and actions for sending emails.
 * 
 * Environments:
 * - Node.js: Uses imapflow and nodemailer via driver.ts
 * - Browser/Tauri: Uses stubs/tauri-driver.js (via bundle alias substitution)
 */

// Relative import - bundle generator's plugin will intercept and stub for Tauri
import * as driver from './driver';

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
  html?: string;
  date: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
  }>;
}

const emailBit = {
  name: '@ha-bits/bit-email',
  displayName: 'Email (IMAP/SMTP)',
  description: 'Email integration for fetching (IMAP) and sending (SMTP) emails',
  logoUrl: 'lucide:Mail',
  runtime: 'all',
  
  auth: {
    type: 'CUSTOM',
    displayName: 'Email Credentials',
    description: 'Email server credentials for IMAP and SMTP',
    required: false,
    props: {
      host: { type: 'SHORT_TEXT', displayName: 'Host', description: 'Mail server host', required: false },
      port: { type: 'NUMBER', displayName: 'Port', description: 'Mail server port (993 for IMAP, 587 for SMTP)', required: false },
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
        
        const auth = context.auth || {};
        const { host, user, password } = auth;
        const port = auth.port || 993;
        
        if (!host || !user || !password) {
          throw new Error('IMAP credentials are required in auth (host, user, password)');
        }
        
        const emails = await driver.fetchImapEmails(
          { host, port: Number(port), user, password },
          { folder: String(folder), limit: Number(limit), unreadOnly: Boolean(unreadOnly) }
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
        
        const auth = context.auth || {};
        const { host, user, password } = auth;
        const port = auth.port || 993;
        
        if (!host || !user || !password) {
          throw new Error('IMAP credentials are required in auth (host, user, password)');
        }
        
        const emails = await driver.fetchImapEmails(
          { host, port: Number(port), user, password },
          { folder: String(folder), limit: Number(limit), unreadOnly: Boolean(unreadOnly) }
        );
        
        console.log(`📧 Fetch Emails: Retrieved ${emails.length} email(s) from ${folder}`);
        
        return {
          emails,
          count: emails.length,
          folder,
          timestamp: new Date().toISOString(),
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
        
        const auth = context.auth || {};
        const { host, user, password } = auth;
        const port = auth.port || 587;
        
        if (!host || !user || !password) {
          throw new Error('SMTP credentials are required in auth (host, user, password)');
        }
        
        if (!from || !to || !subject || !body) {
          throw new Error('From, To, Subject, and Body are required');
        }
        
        const result = await driver.sendSmtpEmail(
          { host, port: Number(port), user, password },
          {
            from: String(from),
            to: String(to),
            subject: String(subject),
            body: String(body),
            html: html ? String(html) : undefined,
            cc: cc ? String(cc) : undefined,
            bcc: bcc ? String(bcc) : undefined,
            replyTo: replyTo ? String(replyTo) : undefined,
          }
        );
        
        console.log(`📤 Send Email: Message sent to ${to}`);
        
        return {
          success: true,
          messageId: result.messageId,
          accepted: result.accepted,
          rejected: result.rejected,
          from,
          to,
          subject,
          timestamp: new Date().toISOString(),
        };
      },
    },
    
    /**
     * Forward an email to another recipient
     */
    forwardEmail: {
      name: 'forwardEmail',
      displayName: 'Forward Email (SMTP)',
      description: 'Forward an email to another recipient',
      props: {
        originalEmail: {
          type: 'JSON',
          displayName: 'Original Email',
          description: 'The email object to forward (from fetchEmails or trigger)',
          required: true,
        },
        to: {
          type: 'SHORT_TEXT',
          displayName: 'Forward To',
          description: 'Recipient email address(es) to forward to',
          required: true,
        },
        from: {
          type: 'SHORT_TEXT',
          displayName: 'From',
          description: 'Sender email address (your address)',
          required: true,
        },
        addComment: {
          type: 'LONG_TEXT',
          displayName: 'Additional Comment',
          description: 'Optional comment to add before the forwarded email',
          required: false,
        },
      },
      async run(context: EmailContext) {
        const { originalEmail, to, from, addComment } = context.propsValue;
        
        const auth = context.auth || {};
        const { host, user, password } = auth;
        const port = auth.port || 587;
        
        if (!host || !user || !password) {
          throw new Error('SMTP credentials are required in auth (host, user, password)');
        }
        
        // Parse original email if string
        let email = originalEmail;
        if (typeof originalEmail === 'string') {
          try {
            email = JSON.parse(originalEmail);
          } catch {
            throw new Error('Invalid originalEmail format - expected JSON object');
          }
        }
        
        // Build forwarded email body
        const forwardedBody = `${addComment ? addComment + '\n\n' : ''}---------- Forwarded message ---------
From: ${email.from || 'Unknown'}
Date: ${email.date || 'Unknown'}
Subject: ${email.subject || 'No subject'}
To: ${email.to || 'Unknown'}

${email.body || email.text || ''}`;

        const result = await driver.sendSmtpEmail(
          { host, port: Number(port), user, password },
          {
            from: String(from),
            to: String(to),
            subject: `Fwd: ${email.subject || 'No subject'}`,
            body: forwardedBody,
            html: email.html ? `${addComment ? `<p>${addComment}</p><hr>` : ''}<p>---------- Forwarded message ---------<br>From: ${email.from}<br>Date: ${email.date}<br>Subject: ${email.subject}<br>To: ${email.to}</p>${email.html}` : undefined,
          }
        );
        
        console.log(`📤 Forward Email: Forwarded to ${to}`);
        
        return {
          success: true,
          messageId: result.messageId,
          accepted: result.accepted,
          from,
          to,
          originalSubject: email.subject,
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
