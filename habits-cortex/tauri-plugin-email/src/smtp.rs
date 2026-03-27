use crate::error::{Error, Result};
use crate::models::*;
use lettre::message::{header::ContentType, Mailbox as LettreMailbox};
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};

/// Send an email via SMTP
pub async fn send_email(config: &SmtpConfig, message: &EmailMessage) -> Result<()> {
    // Build the email message
    let from: LettreMailbox = message.from.parse().map_err(|e: lettre::address::AddressError| Error::InvalidEmail(e.to_string()))?;
    
    let mut email_builder = Message::builder()
        .from(from)
        .subject(&message.subject);
    
    // Add recipients
    for to in &message.to {
        let to_mailbox: LettreMailbox = to.parse().map_err(|e: lettre::address::AddressError| Error::InvalidEmail(e.to_string()))?;
        email_builder = email_builder.to(to_mailbox);
    }
    
    // Add CC recipients
    for cc in &message.cc {
        let cc_mailbox: LettreMailbox = cc.parse().map_err(|e: lettre::address::AddressError| Error::InvalidEmail(e.to_string()))?;
        email_builder = email_builder.cc(cc_mailbox);
    }
    
    // Add BCC recipients
    for bcc in &message.bcc {
        let bcc_mailbox: LettreMailbox = bcc.parse().map_err(|e: lettre::address::AddressError| Error::InvalidEmail(e.to_string()))?;
        email_builder = email_builder.bcc(bcc_mailbox);
    }
    
    // Add reply-to if specified
    if let Some(ref reply_to) = message.reply_to {
        let reply_mailbox: LettreMailbox = reply_to.parse().map_err(|e: lettre::address::AddressError| Error::InvalidEmail(e.to_string()))?;
        email_builder = email_builder.reply_to(reply_mailbox);
    }
    
    // Build the email with body
    let email = if let Some(ref html) = message.html_body {
        // Multipart email with HTML
        use lettre::message::MultiPart;
        email_builder
            .multipart(
                MultiPart::alternative()
                    .singlepart(
                        lettre::message::SinglePart::builder()
                            .header(ContentType::TEXT_PLAIN)
                            .body(message.body.clone()),
                    )
                    .singlepart(
                        lettre::message::SinglePart::builder()
                            .header(ContentType::TEXT_HTML)
                            .body(html.clone()),
                    ),
            )
            .map_err(|e| Error::Smtp(e.to_string()))?
    } else {
        // Plain text email
        email_builder
            .header(ContentType::TEXT_PLAIN)
            .body(message.body.clone())
            .map_err(|e| Error::Smtp(e.to_string()))?
    };
    
    // Create SMTP transport
    let creds = Credentials::new(config.username.clone(), config.password.clone());
    
    let mailer: AsyncSmtpTransport<Tokio1Executor> = if config.use_tls {
        AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&config.host)
            .map_err(|e| Error::Smtp(e.to_string()))?
            .port(config.port)
            .credentials(creds)
            .build()
    } else {
        AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(&config.host)
            .port(config.port)
            .credentials(creds)
            .build()
    };
    
    // Send the email
    mailer.send(email).await?;
    
    Ok(())
}
