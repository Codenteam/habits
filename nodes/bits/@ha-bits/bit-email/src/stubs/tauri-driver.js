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

function decodeMimeHeader(value) {
  if (!value) return '';
  return String(value).replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, function(_, charset, encoding, text) {
    if (encoding.toUpperCase() === 'Q') {
      var bytes = [];
      var str = text.replace(/_/g, ' ');
      for (var i = 0; i < str.length; i++) {
        if (str[i] === '=' && i + 2 < str.length) {
          bytes.push(parseInt(str.substr(i + 1, 2), 16));
          i += 2;
        } else {
          bytes.push(str.charCodeAt(i));
        }
      }
      try {
        return new TextDecoder(charset).decode(new Uint8Array(bytes));
      } catch (e) {
        return String.fromCharCode.apply(null, bytes);
      }
    }
    try {
      var bin = atob(text.replace(/\s/g, ''));
      var arr = new Uint8Array(bin.length);
      for (var j = 0; j < bin.length; j++) arr[j] = bin.charCodeAt(j);
      return new TextDecoder(charset).decode(arr);
    } catch (e2) {
      return text;
    }
  });
}

function getHeaderValue(headers, name) {
  var regex = new RegExp('^' + name + ':\\s*([\\s\\S]*?)(?=\\r?\\n[^\\t ]|\\r?\\n\\r?\\n|$)', 'im');
  var match = headers.match(regex);
  if (!match) return '';
  return match[1].replace(/\r?\n[\t ]+/g, ' ').trim();
}

function getBoundary(contentType) {
  var match = contentType.match(/boundary\s*=\s*"?([^"\s;]+)"?/i);
  return match ? match[1] : null;
}

function extractFilename(disposition, headers) {
  var source = (disposition || '') + ';' + getHeaderValue(headers, 'Content-Type');
  var match = source.match(/filename\*\s*=\s*UTF-8''([^;\r\n]+)/i)
    || source.match(/filename\s*=\s*"([^"]+)"/i)
    || source.match(/filename\s*=\s*([^;\r\n]+)/i)
    || source.match(/name\s*=\s*"([^"]+)"/i)
    || source.match(/name\s*=\s*([^;\r\n]+)/i);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1].replace(/"/g, '').trim());
  } catch (e) {
    return match[1].replace(/"/g, '').trim();
  }
}

function decodePartToBase64(body, encoding) {
  var enc = (encoding || '').toLowerCase().trim();
  var trimmed = (body || '').trim();
  if (!trimmed) return '';
  if (enc === 'base64') {
    return trimmed.replace(/\s/g, '');
  }
  if (enc === 'quoted-printable') {
    var decoded = trimmed.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/gi, function(_, hex) {
      return String.fromCharCode(parseInt(hex, 16));
    });
    return btoa(decoded);
  }
  try {
    return btoa(unescape(encodeURIComponent(trimmed)));
  } catch (e) {
    return btoa(trimmed);
  }
}

function parseAttachmentsFromRaw(raw) {
  if (!raw) return [];

  var splitIndex = raw.search(/\r?\n\r?\n/);
  if (splitIndex === -1) return [];

  var headers = raw.slice(0, splitIndex);
  var body = raw.slice(splitIndex).replace(/^\r?\n\r?\n/, '');
  var contentType = getHeaderValue(headers, 'Content-Type');

  if (!contentType.toLowerCase().includes('multipart')) {
    var disposition = getHeaderValue(headers, 'Content-Disposition');
    if (!/attachment|filename|name=/i.test(disposition + contentType)) {
      return [];
    }
    var filename = extractFilename(disposition, headers) || 'attachment';
    var encoding = getHeaderValue(headers, 'Content-Transfer-Encoding');
    var content = decodePartToBase64(body, encoding);
    if (!content) return [];
    return [{
      filename: filename,
      contentType: (contentType.split(';')[0] || 'application/octet-stream').trim(),
      size: body.length,
      content: content,
    }];
  }

  var boundary = getBoundary(contentType);
  if (!boundary) return [];

  var attachments = [];
  var escapedBoundary = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var parts = body.split(new RegExp('--' + escapedBoundary + '(?:--)?\\s*'));

  for (var i = 0; i < parts.length; i++) {
    var part = parts[i].trim();
    if (!part) continue;

    var partSplitIndex = part.search(/\r?\n\r?\n/);
    if (partSplitIndex === -1) continue;

    var partHeaders = part.slice(0, partSplitIndex);
    var partBody = part.slice(partSplitIndex).replace(/^\r?\n\r?\n/, '').trim();
    var partContentType = getHeaderValue(partHeaders, 'Content-Type');

    if (partContentType.toLowerCase().includes('multipart')) {
      attachments = attachments.concat(parseAttachmentsFromRaw(partHeaders + '\r\n\r\n' + partBody));
      continue;
    }

    var disposition = getHeaderValue(partHeaders, 'Content-Disposition');
    var filename = extractFilename(disposition, partHeaders);
    var isAttachment = /attachment/i.test(disposition)
      || (!!filename && !partContentType.toLowerCase().startsWith('text/'))
      || /application\/(pdf|octet-stream|msword|vnd\.)/i.test(partContentType);

    if (!isAttachment) continue;

    var encoding = getHeaderValue(partHeaders, 'Content-Transfer-Encoding');
    var content = decodePartToBase64(partBody, encoding);
    if (!content) continue;

    attachments.push({
      filename: filename || 'attachment',
      contentType: (partContentType.split(';')[0] || 'application/octet-stream').trim(),
      size: partBody.length,
      content: content,
    });
  }

  return attachments;
}

function mapTauriEmail(email, options) {
  var raw = email.raw || email.body_text || '';
  var attachments = parseAttachmentsFromRaw(raw);
  var attachmentsOnly = options && (options.attachmentsOnly === true || options.attachmentsOnly === 'true');

  if (attachmentsOnly && attachments.length === 0) {
    return null;
  }

  return {
    id: String(email.uid || email.seq),
    from: email.from || '',
    to: (email.to || []).join(', '),
    subject: decodeMimeHeader(email.subject || ''),
    body: email.body_text || '',
    html: email.body_html || undefined,
    date: email.date || new Date().toISOString(),
    attachments: attachments.length > 0 ? attachments : undefined,
  };
}

function finalizeEmails(emails, options) {
  var attachmentsOnly = options && (options.attachmentsOnly === true || options.attachmentsOnly === 'true');
  var result = attachmentsOnly
    ? emails.filter(function(e) { return e.attachments && e.attachments.length > 0; })
    : emails;
  tauriLog('info', 'Returning ' + result.length + ' email(s)' + (attachmentsOnly ? ' with attachments' : ''));
  for (var i = 0; i < result.length; i++) {
    var attCount = (result[i].attachments && result[i].attachments.length) || 0;
    tauriLog('info', '  [' + (i + 1) + '] ' + (result[i].subject || '(no subject)') + ' — ' + attCount + ' attachment(s)');
  }
  return result;
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
  var attachmentsOnly = options?.attachmentsOnly === true || options?.attachmentsOnly === 'true';
  
  tauriLog('info', 'Connecting to IMAP ' + config.host + ':' + config.port + '...');
  tauriLog('info', 'Options: folder=' + folder + ', limit=' + limit + ', unreadOnly=' + unreadOnly + ', attachmentsOnly=' + attachmentsOnly);
  
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
        var emails = [];
        (fetchedEmails || []).reverse().forEach(function(email) {
          var mapped = mapTauriEmail(email, options);
          if (mapped) emails.push(mapped);
        });
        
        tauriLog('info', 'Fetched ' + emails.length + ' email(s) via range');
        return finalizeEmails(emails, options);
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
            var mapped = mapTauriEmail(email, options);
            if (mapped) emails.push(mapped);
          }
        } catch (e) {
          tauriLog('warn', 'Failed to fetch email UID ' + uid + ': ' + (e?.message || e));
        }
      }
      
      // Disconnect
      await invoke('plugin:email|disconnect_imap');
      
      tauriLog('info', 'Fetched ' + emails.length + ' email(s)');
      return finalizeEmails(emails, options);
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
