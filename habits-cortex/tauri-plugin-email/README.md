# Tauri Plugin Email

A Tauri plugin for sending emails via SMTP (using [lettre](https://github.com/lettre/lettre)) and fetching emails via IMAP (using [imap](https://github.com/jonhoo/rust-imap)).

## Features

- **SMTP Support**: Send plain text and HTML emails with attachments support
- **IMAP Support**: Connect to IMAP servers, list mailboxes, fetch and search emails
- **TLS/SSL**: Secure connections supported for both SMTP and IMAP

## Installation

### Rust

Add the plugin to your `src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri-plugin-email = { path = "../path/to/tauri-plugin-email" }
```

Register the plugin in your `src-tauri/src/main.rs`:

```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_email::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Permissions

Add permissions in your `src-tauri/capabilities/default.json`:

```json
{
  "permissions": [
    "email:default"
  ]
}
```

### TypeScript/JavaScript

```typescript
import {
  sendEmail,
  connectImap,
  disconnectImap,
  listMailboxes,
  selectMailbox,
  fetchEmails,
  fetchEmailByUid,
  searchEmails,
  fetchUnreadEmails,
  fetchRecentEmails,
} from "tauri-plugin-email-api";
```

## Usage

### Sending Emails (SMTP)

```typescript
import { sendEmail } from "tauri-plugin-email-api";

await sendEmail(
  {
    host: "smtp.gmail.com",
    port: 587,
    username: "your-email@gmail.com",
    password: "your-app-password",
    useTls: true,
  },
  {
    from: "your-email@gmail.com",
    to: ["recipient@example.com"],
    subject: "Hello from Tauri!",
    body: "This is a plain text email.",
    htmlBody: "<h1>Hello!</h1><p>This is an HTML email.</p>",
  }
);
```

### Fetching Emails (IMAP)

```typescript
import {
  connectImap,
  selectMailbox,
  fetchEmails,
  disconnectImap,
} from "tauri-plugin-email-api";

// Connect to IMAP server
await connectImap({
  host: "imap.gmail.com",
  port: 993,
  username: "your-email@gmail.com",
  password: "your-app-password",
  useTls: true,
});

// Select inbox
const messageCount = await selectMailbox("INBOX");
console.log(`Inbox has ${messageCount} messages`);

// Fetch last 10 emails
const emails = await fetchEmails("1:10");
for (const email of emails) {
  console.log(`From: ${email.from}, Subject: ${email.subject}`);
}

// Disconnect when done
await disconnectImap();
```

### Searching Emails

```typescript
import { searchEmails, fetchEmailByUid } from "tauri-plugin-email-api";

// Search for unread emails from a specific sender
const uids = await searchEmails({
  from: "important@example.com",
  unseen: true,
});

// Fetch each matching email
for (const uid of uids) {
  const email = await fetchEmailByUid(uid);
  if (email) {
    console.log(email.subject);
  }
}
```

### Convenience Functions

```typescript
import { fetchUnreadEmails, fetchRecentEmails } from "tauri-plugin-email-api";

// Fetch all unread emails
const unread = await fetchUnreadEmails();

// Fetch last 20 emails
const recent = await fetchRecentEmails(20);
```

## API Reference

### SMTP

- `sendEmail(config: SmtpConfig, message: EmailMessage): Promise<void>`

### IMAP

- `connectImap(config: ImapConfig): Promise<void>`
- `disconnectImap(): Promise<void>`
- `listMailboxes(): Promise<Mailbox[]>`
- `selectMailbox(mailbox: string): Promise<number>`
- `fetchEmails(range: string, options?: FetchOptions): Promise<FetchedEmail[]>`
- `fetchEmailByUid(uid: number, options?: FetchOptions): Promise<FetchedEmail | null>`
- `searchEmails(criteria: SearchCriteria): Promise<number[]>`

### Convenience

- `fetchUnreadEmails(options?: FetchOptions): Promise<FetchedEmail[]>`
- `fetchRecentEmails(count?: number, options?: FetchOptions): Promise<FetchedEmail[]>`

## Types

See [guest-js/index.ts](./guest-js/index.ts) for full type definitions.

## License

MIT
