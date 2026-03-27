const COMMANDS: &[&str] = &[
    "send_email",
    "connect_imap",
    "disconnect_imap",
    "list_mailboxes",
    "select_mailbox",
    "fetch_emails",
    "fetch_email_by_uid",
    "search_emails",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .build();
}
