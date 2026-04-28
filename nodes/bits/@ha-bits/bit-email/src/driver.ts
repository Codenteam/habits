/**
 * Email Driver for bit-email
 * 
 * This file contains all business logic for IMAP fetching and SMTP sending.
 * In Tauri/browser environments, this is replaced by stubs/tauri-driver.js
 */

import { ImapFlow } from 'imapflow';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// ============================================================================
// Types
// ============================================================================

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tls?: boolean;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tls?: boolean;
}

export interface EmailMessage {
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
    content?: string; // base64 encoded attachment content
  }>;
}

export interface FetchEmailsOptions {
  folder?: string;
  limit?: number;
  unreadOnly?: boolean;
  attachmentsOnly?: boolean;
}

export interface SendEmailOptions {
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  html?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export interface SendEmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

// ============================================================================
// Logger
// ============================================================================

function log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
  const prefix = '[email-driver]';
  const fullMessage = data ? `${prefix} ${message} ${JSON.stringify(data)}` : `${prefix} ${message}`;
  
  switch (level) {
    case 'error':
      console.error(fullMessage);
      break;
    case 'warn':
      console.warn(fullMessage);
      break;
    case 'debug':
      console.debug(fullMessage);
      break;
    default:
      console.log(fullMessage);
  }
}

// ============================================================================
// IMAP Functions
// ============================================================================

/**
 * Fetch emails from IMAP server using imapflow
 */
export async function fetchImapEmails(
  config: ImapConfig,
  options: FetchEmailsOptions = {}
): Promise<EmailMessage[]> {
  const { folder = 'INBOX', limit = 10, unreadOnly = true, attachmentsOnly = false } = options;
  
  log('info', `Connecting to IMAP ${config.host}:${config.port} as ${config.user}...`);
  log('info', `Fetching from ${folder}, limit: ${limit}, unreadOnly: ${unreadOnly}`);
  
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.tls !== false && config.port === 993,
    auth: {
      user: config.user,
      pass: config.password,
    },
    logger: false,
  });

  const emails: EmailMessage[] = [];

  try {
    await client.connect();
    log('info', 'Connected to IMAP server successfully');

    const lock = await client.getMailboxLock(folder);
    
    try {
      // Build search query - use 1:* for all messages
      const searchQuery: any = unreadOnly ? { seen: false } : { all: true };
      
      // Search for messages
      const searchResult = await client.search(searchQuery, { uid: true });
      
      // imapflow returns a Set, convert to Array
      const messages = searchResult instanceof Set 
        ? Array.from(searchResult) 
        : (Array.isArray(searchResult) ? searchResult : []);
      
      log('info', `Search returned ${messages.length} messages (type: ${searchResult?.constructor?.name})`);
      
      if (messages.length === 0) {
        log('info', 'No messages found matching criteria');
        return emails;
      }

      // Get the most recent messages up to limit
      const messagesToFetch = messages.slice(-limit).reverse();
      log('info', `Found ${messages.length} messages, fetching ${messagesToFetch.length}`);
      log('debug', `UIDs to fetch: ${messagesToFetch.slice(0, 5).join(', ')}...`);

      // Fetch message details using fetchOne for each message
      let fetchCount = 0;
      for (const uid of messagesToFetch) {
        try {
          const message = await client.fetchOne(String(uid), {
            uid: true,
            envelope: true,
            source: true,
            bodyStructure: true,
          }, { uid: true });
          
          if (!message) continue;
          fetchCount++;
          
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
          let html = '';
          if (message.source) {
            const sourceStr = message.source.toString();
            // Simple extraction - find body after headers
            const bodyParts = sourceStr.split(/\r?\n\r?\n/);
            if (bodyParts.length > 1) {
              body = bodyParts.slice(1).join('\n\n');
            }
            
            // Try to extract HTML if present
            const htmlMatch = sourceStr.match(/<html[^>]*>[\s\S]*<\/html>/i);
            if (htmlMatch) {
              html = htmlMatch[0];
            }
          }

          // Extract attachment parts (with MIME section numbers) from bodyStructure
          const attachmentParts: AttachmentPart[] = [];
          if (message.bodyStructure) {
            extractAttachmentParts(message.bodyStructure, attachmentParts);
          }

          // Download each attachment's content as base64
          const attachments: Array<{ filename: string; contentType: string; size: number; content?: string }> = [];
          for (const part of attachmentParts) {
            let content: string | undefined;
            try {
              const dl = await client.download(String(uid), part.part, { uid: true });
              if (dl && dl.content) {
                const chunks: Buffer[] = [];
                for await (const chunk of dl.content) {
                  chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                }
                content = Buffer.concat(chunks).toString('base64');
                log('debug', `Downloaded attachment ${part.filename} (${chunks.length} chunks, ${content.length} base64 chars)`);
              }
            } catch (dlErr) {
              log('warn', `Failed to download attachment ${part.filename}: ${dlErr}`);
            }
            attachments.push({
              filename: part.filename,
              contentType: part.contentType,
              size: part.size,
              content,
            });
          }

          if (attachments.length > 0) {
            log('info', `Collected ${attachments.length} attachment(s) for uid ${uid}`);
          }

          emails.push({
            id: String(message.uid),
            from,
            to,
            subject: envelope.subject || '',
            body,
            html: html || undefined,
            date: envelope.date?.toISOString() || new Date().toISOString(),
            attachments: attachments.length > 0 ? attachments : undefined,
          });
        } catch (singleFetchErr) {
          log('warn', `Error fetching uid ${uid}: ${singleFetchErr}`);
        }
      }
      log('info', `Fetched ${fetchCount} messages, collected ${emails.length} emails`);
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
    log('info', 'Disconnected from IMAP server');
  }

  const result = attachmentsOnly ? emails.filter(e => e.attachments && e.attachments.length > 0) : emails;
  if (attachmentsOnly) {
    log('info', `Filtered to ${result.length} email(s) with attachments (from ${emails.length} total)`);
  } else {
    log('info', `Fetched ${emails.length} email(s)`);
  }
  return result;
}

// Internal type that includes the MIME part section number for downloading
interface AttachmentPart {
  part: string;
  filename: string;
  contentType: string;
  size: number;
}

/**
 * Recursively extract attachment parts (with MIME section numbers) from bodyStructure
 */
function extractAttachmentParts(
  structure: any,
  parts: AttachmentPart[]
): void {
  if (!structure) return;

  // Check if this part is an attachment
  if (structure.disposition === 'attachment' || 
      (structure.disposition === 'inline' && structure.dispositionParameters?.filename)) {
    const filename = structure.dispositionParameters?.filename || 
                     structure.parameters?.name || 
                     'attachment';
    const type = structure.type || 'application';
    const subtype = structure.subtype || 'octet-stream';
    parts.push({
      part: structure.part || '1',
      filename,
      contentType: `${type}/${subtype}`,
      size: structure.size || 0,
    });
  }

  // Recurse into child parts
  if (structure.childNodes && Array.isArray(structure.childNodes)) {
    for (const child of structure.childNodes) {
      extractAttachmentParts(child, parts);
    }
  }
}

// ============================================================================
// SMTP Functions
// ============================================================================

/**
 * Send email via SMTP using nodemailer
 */
export async function sendSmtpEmail(
  config: SmtpConfig,
  message: SendEmailOptions
): Promise<SendEmailResult> {
  log('info', `Connecting to SMTP ${config.host}:${config.port} as ${config.user}...`);
  log('info', `Sending from ${message.from} to ${message.to}`);
  log('info', `Subject: ${message.subject}`);
  
  // Create transporter
  const transporter: Transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.tls !== false && (config.port === 465 || config.port === 993),
    auth: {
      user: config.user,
      pass: config.password,
    },
  });

  // Build mail options
  const mailOptions: nodemailer.SendMailOptions = {
    from: message.from,
    to: message.to,
    subject: message.subject,
    text: message.body,
  };

  if (message.html) {
    mailOptions.html = message.html;
  }

  if (message.cc) {
    mailOptions.cc = message.cc;
  }

  if (message.bcc) {
    mailOptions.bcc = message.bcc;
  }

  if (message.replyTo) {
    mailOptions.replyTo = message.replyTo;
  }

  if (message.attachments && message.attachments.length > 0) {
    mailOptions.attachments = message.attachments.map(att => ({
      filename: att.filename,
      content: att.content,
      contentType: att.contentType,
    }));
  }

  // Send mail
  const info = await transporter.sendMail(mailOptions);
  
  log('info', `Email sent successfully. MessageId: ${info.messageId}`);

  // Parse accepted recipients
  const accepted: string[] = [];
  if (info.accepted) {
    for (const addr of info.accepted) {
      accepted.push(typeof addr === 'string' ? addr : addr.address);
    }
  }

  // Parse rejected recipients
  const rejected: string[] = [];
  if (info.rejected) {
    for (const addr of info.rejected) {
      rejected.push(typeof addr === 'string' ? addr : addr.address);
    }
  }

  return {
    messageId: info.messageId || `<${Date.now()}.${Math.random().toString(36).substring(7)}@habits.local>`,
    accepted,
    rejected,
  };
}

/**
 * Verify SMTP connection
 */
export async function verifySmtpConnection(config: SmtpConfig): Promise<boolean> {
  log('info', `Verifying SMTP connection to ${config.host}:${config.port}...`);
  
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.tls !== false && (config.port === 465 || config.port === 993),
    auth: {
      user: config.user,
      pass: config.password,
    },
  });

  try {
    await transporter.verify();
    log('info', 'SMTP connection verified successfully');
    return true;
  } catch (error) {
    log('error', 'SMTP connection verification failed', error);
    return false;
  }
}
