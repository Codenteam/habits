use crate::error::{Error, Result};
use crate::models::*;
use imap::Session;
use native_tls::TlsConnector;
use std::net::TcpStream;
use std::sync::{Arc, Mutex};

type TlsSession = Session<native_tls::TlsStream<TcpStream>>;
type PlainSession = Session<TcpStream>;

/// IMAP client that can hold either TLS or plain connection
#[derive(Clone)]
pub struct ImapClient {
    inner: Arc<ImapClientInner>,
}

struct ImapClientInner {
    tls_session: Mutex<Option<TlsSession>>,
    plain_session: Mutex<Option<PlainSession>>,
}

impl ImapClient {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(ImapClientInner {
                tls_session: Mutex::new(None),
                plain_session: Mutex::new(None),
            }),
        }
    }

    /// Connect to IMAP server
    pub fn connect(&self, config: &ImapConfig) -> Result<()> {
        if config.use_tls {
            let tls = TlsConnector::builder().build()?;
            let client = imap::connect(
                (config.host.as_str(), config.port),
                &config.host,
                &tls,
            )?;
            
            let session = client
                .login(&config.username, &config.password)
                .map_err(|e| Error::Auth(e.0.to_string()))?;
            
            let mut guard = self.inner.tls_session.lock().unwrap();
            *guard = Some(session);
            
            // Clear plain session if any
            let mut plain_guard = self.inner.plain_session.lock().unwrap();
            *plain_guard = None;
        } else {
            let stream = TcpStream::connect((config.host.as_str(), config.port))
                .map_err(|e| Error::Connection(e.to_string()))?;
            let client = imap::Client::new(stream);
            
            let session = client
                .login(&config.username, &config.password)
                .map_err(|e| Error::Auth(e.0.to_string()))?;
            
            let mut guard = self.inner.plain_session.lock().unwrap();
            *guard = Some(session);
            
            // Clear TLS session if any
            let mut tls_guard = self.inner.tls_session.lock().unwrap();
            *tls_guard = None;
        }
        
        Ok(())
    }

    /// Disconnect from IMAP server
    pub fn disconnect(&self) -> Result<()> {
        let mut tls_guard = self.inner.tls_session.lock().unwrap();
        if let Some(mut session) = tls_guard.take() {
            let _ = session.logout();
        }
        
        let mut plain_guard = self.inner.plain_session.lock().unwrap();
        if let Some(mut session) = plain_guard.take() {
            let _ = session.logout();
        }
        
        Ok(())
    }

    /// Check if connected
    pub fn is_connected(&self) -> bool {
        let tls_guard = self.inner.tls_session.lock().unwrap();
        let plain_guard = self.inner.plain_session.lock().unwrap();
        tls_guard.is_some() || plain_guard.is_some()
    }

    /// List all mailboxes
    pub fn list_mailboxes(&self) -> Result<Vec<Mailbox>> {
        let mut tls_guard = self.inner.tls_session.lock().unwrap();
        let mut plain_guard = self.inner.plain_session.lock().unwrap();
        
        let names = if let Some(ref mut session) = *tls_guard {
            session.list(Some(""), Some("*"))?
        } else if let Some(ref mut session) = *plain_guard {
            session.list(Some(""), Some("*"))?
        } else {
            return Err(Error::NotConnected);
        };
        
        let mailboxes = names
            .iter()
            .map(|name| Mailbox {
                name: name.name().to_string(),
                delimiter: name.delimiter().map(|c| c.to_string()),
                attributes: name.attributes().iter().map(|a| format!("{:?}", a)).collect(),
            })
            .collect();
        
        Ok(mailboxes)
    }

    /// Select a mailbox
    pub fn select_mailbox(&self, mailbox: &str) -> Result<u32> {
        let mut tls_guard = self.inner.tls_session.lock().unwrap();
        let mut plain_guard = self.inner.plain_session.lock().unwrap();
        
        let selected = if let Some(ref mut session) = *tls_guard {
            session.select(mailbox)?
        } else if let Some(ref mut session) = *plain_guard {
            session.select(mailbox)?
        } else {
            return Err(Error::NotConnected);
        };
        
        Ok(selected.exists)
    }

    /// Fetch emails from current mailbox
    pub fn fetch_emails(
        &self,
        range: &str,
        options: &FetchOptions,
    ) -> Result<Vec<FetchedEmail>> {
        let mut tls_guard = self.inner.tls_session.lock().unwrap();
        let mut plain_guard = self.inner.plain_session.lock().unwrap();
        
        // Determine what to fetch - use RFC822 for body which is more compatible
        let fetch_items = if options.headers_only {
            "(UID FLAGS ENVELOPE)"
        } else if options.fetch_body {
            "(UID FLAGS ENVELOPE RFC822)"
        } else {
            "(UID FLAGS ENVELOPE)"
        };
        
        let messages = if let Some(ref mut session) = *tls_guard {
            session.fetch(range, fetch_items)?
        } else if let Some(ref mut session) = *plain_guard {
            session.fetch(range, fetch_items)?
        } else {
            return Err(Error::NotConnected);
        };
        
        let emails = messages
            .iter()
            .map(|msg| {
                let envelope = msg.envelope();
                
                FetchedEmail {
                    uid: msg.uid.unwrap_or(0),
                    seq: msg.message,
                    from: envelope.and_then(|e| {
                        e.from.as_ref().and_then(|addrs| {
                            addrs.first().map(|a| {
                                let mailbox = a.mailbox.as_ref().map(|m| std::str::from_utf8(m).unwrap_or("")).unwrap_or("");
                                let host = a.host.as_ref().map(|h| std::str::from_utf8(h).unwrap_or("")).unwrap_or("");
                                format!("{}@{}", mailbox, host)
                            })
                        })
                    }),
                    to: envelope
                        .and_then(|e| e.to.as_ref())
                        .map(|addrs| {
                            addrs
                                .iter()
                                .map(|a| {
                                    let mailbox = a.mailbox.as_ref().map(|m| std::str::from_utf8(m).unwrap_or("")).unwrap_or("");
                                    let host = a.host.as_ref().map(|h| std::str::from_utf8(h).unwrap_or("")).unwrap_or("");
                                    format!("{}@{}", mailbox, host)
                                })
                                .collect()
                        })
                        .unwrap_or_default(),
                    subject: envelope.and_then(|e| {
                        e.subject.as_ref().map(|s| String::from_utf8_lossy(s).to_string())
                    }),
                    date: envelope.and_then(|e| {
                        e.date.as_ref().map(|d| String::from_utf8_lossy(d).to_string())
                    }),
                    body_text: msg.body().map(|b| String::from_utf8_lossy(b).to_string()),
                    body_html: None, // Would need MIME parsing for HTML
                    raw: msg.body().map(|b| String::from_utf8_lossy(b).to_string()),
                    flags: msg.flags().iter().map(|f| format!("{:?}", f)).collect(),
                }
            })
            .collect();
        
        Ok(emails)
    }

    /// Fetch a single email by UID
    pub fn fetch_email_by_uid(
        &self,
        uid: u32,
        options: &FetchOptions,
    ) -> Result<Option<FetchedEmail>> {
        let mut tls_guard = self.inner.tls_session.lock().unwrap();
        let mut plain_guard = self.inner.plain_session.lock().unwrap();
        
        let fetch_items = if options.headers_only {
            "(FLAGS ENVELOPE)"
        } else if options.fetch_body {
            "(FLAGS ENVELOPE RFC822)"
        } else {
            "(FLAGS ENVELOPE)"
        };
        
        let messages = if let Some(ref mut session) = *tls_guard {
            session.uid_fetch(uid.to_string(), fetch_items)?
        } else if let Some(ref mut session) = *plain_guard {
            session.uid_fetch(uid.to_string(), fetch_items)?
        } else {
            return Err(Error::NotConnected);
        };
        
        let email = messages.iter().next().map(|msg| {
            let envelope = msg.envelope();
            
            FetchedEmail {
                uid,
                seq: msg.message,
                from: envelope.and_then(|e| {
                    e.from.as_ref().and_then(|addrs| {
                        addrs.first().map(|a| {
                            let mailbox = a.mailbox.as_ref().map(|m| std::str::from_utf8(m).unwrap_or("")).unwrap_or("");
                            let host = a.host.as_ref().map(|h| std::str::from_utf8(h).unwrap_or("")).unwrap_or("");
                            format!("{}@{}", mailbox, host)
                        })
                    })
                }),
                to: envelope
                    .and_then(|e| e.to.as_ref())
                    .map(|addrs| {
                        addrs
                            .iter()
                            .map(|a| {
                                let mailbox = a.mailbox.as_ref().map(|m| std::str::from_utf8(m).unwrap_or("")).unwrap_or("");
                                let host = a.host.as_ref().map(|h| std::str::from_utf8(h).unwrap_or("")).unwrap_or("");
                                format!("{}@{}", mailbox, host)
                            })
                            .collect()
                    })
                    .unwrap_or_default(),
                subject: envelope.and_then(|e| {
                    e.subject.as_ref().map(|s| String::from_utf8_lossy(s).to_string())
                }),
                date: envelope.and_then(|e| {
                    e.date.as_ref().map(|d| String::from_utf8_lossy(d).to_string())
                }),
                body_text: msg.body().map(|b| String::from_utf8_lossy(b).to_string()),
                body_html: None,
                raw: msg.body().map(|b| String::from_utf8_lossy(b).to_string()),
                flags: msg.flags().iter().map(|f| format!("{:?}", f)).collect(),
            }
        });
        
        Ok(email)
    }

    /// Search emails based on criteria
    pub fn search_emails(&self, criteria: &SearchCriteria) -> Result<Vec<u32>> {
        let mut tls_guard = self.inner.tls_session.lock().unwrap();
        let mut plain_guard = self.inner.plain_session.lock().unwrap();
        
        // Build search query
        let mut query_parts: Vec<String> = Vec::new();
        
        if let Some(ref subject) = criteria.subject {
            query_parts.push(format!("SUBJECT \"{}\"", subject));
        }
        if let Some(ref from) = criteria.from {
            query_parts.push(format!("FROM \"{}\"", from));
        }
        if let Some(ref body) = criteria.body {
            query_parts.push(format!("BODY \"{}\"", body));
        }
        if criteria.unseen == Some(true) {
            query_parts.push("UNSEEN".to_string());
        }
        if let Some(ref since) = criteria.since {
            query_parts.push(format!("SINCE {}", since));
        }
        if let Some(ref before) = criteria.before {
            query_parts.push(format!("BEFORE {}", before));
        }
        
        let query = if query_parts.is_empty() {
            "ALL".to_string()
        } else {
            query_parts.join(" ")
        };
        
        let uids = if let Some(ref mut session) = *tls_guard {
            session.uid_search(&query)?
        } else if let Some(ref mut session) = *plain_guard {
            session.uid_search(&query)?
        } else {
            return Err(Error::NotConnected);
        };
        
        Ok(uids.into_iter().collect())
    }
}

impl Default for ImapClient {
    fn default() -> Self {
        Self::new()
    }
}
