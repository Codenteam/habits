/**
 * Tauri Driver Stub for bit-email
 * 
 * Replaces driver.ts in Tauri environments.
 * Uses tauri-plugin-email for IMAP/SMTP operations.
 */

function tauriLog(level, message) {
  var fullMsg = '[email-driver-tauri] ' + message;
  if (level === 'error') console.error(fullMsg);
  else if (level === 'warn') console.warn(fullMsg);
  else console.log(fullMsg);
}

function getInvoke() {
  if (typeof window === 'undefined') return null;
  if (window.__TAURI__?.core?.invoke) return window.__TAURI__.core.invoke;
  if (window.__TAURI__?.invoke) return window.__TAURI__.invoke;
  if (window.__TAURI_INTERNALS__?.invoke) return window.__TAURI_INTERNALS__.invoke;
  return null;
}

/**
 * Fetch emails from IMAP server using Tauri email plugin
 */
async function fetchImapEmails(config, options) {
  var invoke = getInvoke();
  
  if (!invoke) {
    throw new Error('Tauri API not available - email operations require Tauri');
  }
  
  var folder = options?.folder || 'INBOX';
  var limit = options?.limit || 10;
  // Handle string "false" as well as boolean false
  var unreadOnlyRaw = options?.unreadOnly;
  var unreadOnly = unreadOnlyRaw === true || unreadOnlyRaw === 'true';
  
  tauriLog('info', 'Connecting to IMAP ' + config.host + ':' + config.port + '...');
  tauriLog('info', 'Options: folder=' + folder + ', limit=' + limit + ', unreadOnly=' + unreadOnly + ' (raw: ' + unreadOnlyRaw + ')');
  
  try {
    // Connect to IMAP server
    await invoke('plugin:email|connect_imap', {
      config: {
        host: config.host,
        port: config.port,
        username: config.user,
        password: config.password,
        use_tls: config.tls !== false
      }
    });
    
    tauriLog('info', 'Connected to IMAP server');
    
    // Select mailbox
    var messageCount = await invoke('plugin:email|select_mailbox', {
      mailbox: folder
    });
    
    tauriLog('info', 'Selected mailbox: ' + folder + ' (' + messageCount + ' messages)');
    
    // If we want all emails (not just unread), use range-based fetch which is more reliable
    if (!unreadOnly && messageCount > 0) {
      tauriLog('info', 'Fetching all emails via range (unreadOnly=false)');
      var start = Math.max(1, messageCount - limit + 1);
      var range = start + ':' + messageCount;
      tauriLog('info', 'Fetching range: ' + range);
      
      try {
        var fetchedEmails = await invoke('plugin:email|fetch_emails', {
          range: range,
          options: {
            fetch_body: true,
            headers_only: false,
            mark_as_read: false
          }
        });
        
        // Disconnect
        await invoke('plugin:email|disconnect_imap');
        
        // Map to our format (reverse to get newest first)
        var emails = (fetchedEmails || []).reverse().map(function(email) {
          return {
            id: String(email.uid || email.seq),
            from: email.from || '',
            to: (email.to || []).join(', '),
            subject: email.subject || '',
            body: email.body_text || '',
            html: email.body_html || undefined,
            date: email.date || new Date().toISOString(),
            attachments: undefined
          };
        });
        
        tauriLog('info', 'Fetched ' + emails.length + ' email(s) via range');
        return emails;
      } catch (rangeErr) {
        tauriLog('error', 'Range fetch failed: ' + (rangeErr?.message || rangeErr));
        await invoke('plugin:email|disconnect_imap');
        throw new Error('Failed to fetch emails: ' + (rangeErr?.message || rangeErr));
      }
    }
    
    // For unread only, use search then fetch by UID
    if (unreadOnly) {
      tauriLog('info', 'Searching for unread emails');
      
      var messageUids = await invoke('plugin:email|search_emails', {
        criteria: { unseen: true }
      });
      
      tauriLog('info', 'Search returned ' + (messageUids?.length || 0) + ' unread message UIDs');
      
      var uidsToFetch = (messageUids || []).slice(-limit).reverse();
      
      if (uidsToFetch.length === 0) {
        await invoke('plugin:email|disconnect_imap');
        return [];
      }
      
      // Fetch unread emails by UID
      var emails = [];
      for (var i = 0; i < uidsToFetch.length; i++) {
        var uid = uidsToFetch[i];
        try {
          var email = await invoke('plugin:email|fetch_email_by_uid', {
            uid: uid,
            options: {
              fetch_body: true,
              headers_only: false,
              mark_as_read: false
            }
          });
          
          if (email) {
            emails.push({
              id: String(email.uid),
              from: email.from || '',
              to: (email.to || []).join(', '),
              subject: email.subject || '',
              body: email.body_text || '',
              html: email.body_html || undefined,
              date: email.date || new Date().toISOString(),
              attachments: undefined
            });
          }
        } catch (e) {
          tauriLog('warn', 'Failed to fetch email UID ' + uid + ': ' + (e?.message || e));
        }
      }
      
      // Disconnect
      await invoke('plugin:email|disconnect_imap');
      
      tauriLog('info', 'Fetched ' + emails.length + ' email(s)');
      return emails;
    }
    
    // No messages in mailbox
    await invoke('plugin:email|disconnect_imap');
    return [];
  } catch (e) {
    // Try to disconnect on error
    try {
      await invoke('plugin:email|disconnect_imap');
    } catch (disconnectErr) {
      // Ignore disconnect errors
    }
    
    var errMsg = e?.message || e?.toString() || 'Unknown error';
    tauriLog('error', 'IMAP fetch failed: ' + errMsg);
    throw new Error('IMAP fetch failed: ' + errMsg);
  }
}

/**
 * Send email via SMTP using Tauri email plugin
 */
async function sendSmtpEmail(config, message) {
  var invoke = getInvoke();
  
  if (!invoke) {
    throw new Error('Tauri API not available - email operations require Tauri');
  }
  
  tauriLog('info', 'Sending email via SMTP ' + config.host + ':' + config.port + '...');
  tauriLog('info', 'From: ' + message.from + ', To: ' + message.to);
  
  try {
    // Parse recipients
    var toAddresses = message.to.split(',').map(function(addr) {
      return addr.trim();
    }).filter(function(addr) {
      return addr.length > 0;
    });
    
    var ccAddresses = [];
    if (message.cc) {
      ccAddresses = message.cc.split(',').map(function(addr) {
        return addr.trim();
      }).filter(function(addr) {
        return addr.length > 0;
      });
    }
    
    var bccAddresses = [];
    if (message.bcc) {
      bccAddresses = message.bcc.split(',').map(function(addr) {
        return addr.trim();
      }).filter(function(addr) {
        return addr.length > 0;
      });
    }
    
    await invoke('plugin:email|send_email', {
      config: {
        host: config.host,
        port: config.port,
        username: config.user,
        password: config.password,
        use_tls: config.tls !== false
      },
      message: {
        from: message.from,
        to: toAddresses,
        cc: ccAddresses,
        bcc: bccAddresses,
        subject: message.subject,
        body: message.body,
        html_body: message.html || null,
        reply_to: message.replyTo || null
      }
    });
    
    var messageId = '<' + Date.now() + '.' + Math.random().toString(36).substring(7) + '@tauri.local>';
    
    tauriLog('info', 'Email sent successfully. MessageId: ' + messageId);
    
    return {
      messageId: messageId,
      accepted: toAddresses,
      rejected: []
    };
  } catch (e) {
    var errMsg = e?.message || e?.toString() || 'Unknown error';
    tauriLog('error', 'SMTP send failed: ' + errMsg);
    throw new Error('SMTP send failed: ' + errMsg);
  }
}

/**
 * Verify SMTP connection (not supported in Tauri - just returns true)
 */
async function verifySmtpConnection(config) {
  tauriLog('info', 'SMTP verification not supported in Tauri - assuming valid');
  return true;
}

// Export for ESM/CJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchImapEmails: fetchImapEmails,
    sendSmtpEmail: sendSmtpEmail,
    verifySmtpConnection: verifySmtpConnection
  };
} else if (typeof exports !== 'undefined') {
  exports.fetchImapEmails = fetchImapEmails;
  exports.sendSmtpEmail = sendSmtpEmail;
  exports.verifySmtpConnection = verifySmtpConnection;
}
