import { invoke } from "@tauri-apps/api/core";

// ============== Types ==============

export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  useTls?: boolean;
}

export interface ImapConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  useTls?: boolean;
}

export interface EmailMessage {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  replyTo?: string;
}

export interface FetchedEmail {
  uid: number;
  seq: number;
  from?: string;
  to: string[];
  subject?: string;
  date?: string;
  bodyText?: string;
  bodyHtml?: string;
  raw?: string;
  flags: string[];
}

export interface Mailbox {
  name: string;
  delimiter?: string;
  attributes: string[];
}

export interface SearchCriteria {
  subject?: string;
  from?: string;
  body?: string;
  unseen?: boolean;
  since?: string;
  before?: string;
}

export interface FetchOptions {
  fetchBody?: boolean;
  headersOnly?: boolean;
  markAsRead?: boolean;
}

// ============== SMTP Functions ==============

/**
 * Send an email via SMTP
 */
export function sendEmail(
  config: SmtpConfig,
  message: EmailMessage
): Promise<void> {
  return invoke<void>("plugin:email|send_email", {
    config: {
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      use_tls: config.useTls ?? true,
    },
    message: {
      from: message.from,
      to: message.to,
      cc: message.cc ?? [],
      bcc: message.bcc ?? [],
      subject: message.subject,
      body: message.body,
      html_body: message.htmlBody,
      reply_to: message.replyTo,
    },
  });
}

// ============== IMAP Functions ==============

/**
 * Connect to an IMAP server
 */
export function connectImap(config: ImapConfig): Promise<void> {
  return invoke<void>("plugin:email|connect_imap", {
    config: {
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      use_tls: config.useTls ?? true,
    },
  });
}

/**
 * Disconnect from the IMAP server
 */
export function disconnectImap(): Promise<void> {
  return invoke<void>("plugin:email|disconnect_imap");
}

/**
 * List all mailboxes on the IMAP server
 */
export function listMailboxes(): Promise<Mailbox[]> {
  return invoke<Mailbox[]>("plugin:email|list_mailboxes");
}

/**
 * Select a mailbox. Returns the number of messages in the mailbox.
 */
export function selectMailbox(mailbox: string): Promise<number> {
  return invoke<number>("plugin:email|select_mailbox", { mailbox });
}

/**
 * Fetch emails from the currently selected mailbox.
 * @param range - IMAP sequence range (e.g., "1:10", "1:*", "*")
 * @param options - Optional fetch options
 */
export function fetchEmails(
  range: string,
  options?: FetchOptions
): Promise<FetchedEmail[]> {
  return invoke<FetchedEmail[]>("plugin:email|fetch_emails", {
    range,
    options: options
      ? {
          fetch_body: options.fetchBody ?? true,
          headers_only: options.headersOnly ?? false,
          mark_as_read: options.markAsRead ?? false,
        }
      : null,
  });
}

/**
 * Fetch a single email by its UID
 */
export function fetchEmailByUid(
  uid: number,
  options?: FetchOptions
): Promise<FetchedEmail | null> {
  return invoke<FetchedEmail | null>("plugin:email|fetch_email_by_uid", {
    uid,
    options: options
      ? {
          fetch_body: options.fetchBody ?? true,
          headers_only: options.headersOnly ?? false,
          mark_as_read: options.markAsRead ?? false,
        }
      : null,
  });
}

/**
 * Search emails based on criteria. Returns UIDs of matching messages.
 */
export function searchEmails(criteria: SearchCriteria): Promise<number[]> {
  return invoke<number[]>("plugin:email|search_emails", {
    criteria: {
      subject: criteria.subject,
      from: criteria.from,
      body: criteria.body,
      unseen: criteria.unseen,
      since: criteria.since,
      before: criteria.before,
    },
  });
}

// ============== Convenience Functions ==============

/**
 * Fetch unread emails from inbox
 */
export async function fetchUnreadEmails(
  options?: FetchOptions
): Promise<FetchedEmail[]> {
  await selectMailbox("INBOX");
  const uids = await searchEmails({ unseen: true });
  
  if (uids.length === 0) {
    return [];
  }
  
  const emails: FetchedEmail[] = [];
  for (const uid of uids) {
    const email = await fetchEmailByUid(uid, options);
    if (email) {
      emails.push(email);
    }
  }
  
  return emails;
}

/**
 * Fetch recent emails from inbox
 * @param count - Number of recent emails to fetch
 */
export async function fetchRecentEmails(
  count: number = 10,
  options?: FetchOptions
): Promise<FetchedEmail[]> {
  const total = await selectMailbox("INBOX");
  
  if (total === 0) {
    return [];
  }
  
  const start = Math.max(1, total - count + 1);
  return fetchEmails(`${start}:*`, options);
}
