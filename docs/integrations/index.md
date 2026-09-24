---
title: "Integrations"
description: "Setup guides for connecting Habits to Gmail, Slack, HubSpot, Google APIs, social platforms, and more"
aside: false
---

<script setup>
const integrations = [
  {
    "slug": "gmail",
    "name": "Gmail (IMAP/SMTP)",
    "description": "Connect Gmail for reading and sending email using App Passwords with IMAP and SMTP.",
    "categories": [
      "email"
    ],
    "bitPackage": "@ha-bits/bit-email",
    "showcaseCount": 6,
    "icon": "Mail"
  },
  {
    "slug": "openai",
    "name": "OpenAI",
    "description": "Use GPT models for classification, summarization, enrichment, and content generation.",
    "categories": [
      "ai"
    ],
    "bitPackage": "@ha-bits/bit-openai",
    "showcaseCount": 27,
    "icon": "Sparkles"
  },
  {
    "slug": "quickbooks",
    "name": "QuickBooks Online",
    "description": "Record payments in QuickBooks Online with OAuth 2.0 and the QBO Accounting API.",
    "categories": [
      "finance"
    ],
    "bitPackage": "@ha-bits/bit-quickbooks",
    "showcaseCount": 1,
    "icon": "Calculator"
  },
  {
    "slug": "slack",
    "name": "Slack",
    "description": "Post digests and notifications to Slack channels with a bot token.",
    "categories": [
      "messaging"
    ],
    "bitPackage": "@ha-bits/bit-slack",
    "showcaseCount": 4,
    "icon": "MessageSquare"
  },
  {
    "slug": "hubspot",
    "name": "HubSpot CRM",
    "description": "Sync contacts, leads, and custom properties using a HubSpot private app token.",
    "categories": [
      "crm"
    ],
    "bitPackage": "@ha-bits/bit-hubspot",
    "showcaseCount": 2,
    "icon": "Users"
  },
  {
    "slug": "google-drive",
    "name": "Google Drive",
    "description": "Upload files to Google Drive with OAuth 2.0 credentials from Google Cloud.",
    "categories": [
      "google"
    ],
    "bitPackage": "@ha-bits/bit-google-drive",
    "showcaseCount": 1,
    "icon": "Package"
  },
  {
    "slug": "google-sheets",
    "name": "Google Sheets",
    "description": "Read and write spreadsheet data with OAuth 2.0 and the Google Sheets API.",
    "categories": [
      "google"
    ],
    "bitPackage": "@ha-bits/bit-google-sheets",
    "showcaseCount": 1,
    "icon": "Package"
  },
  {
    "slug": "google-calendar",
    "name": "Google Calendar",
    "description": "Sync calendar events and send digests using Google OAuth and the Calendar API.",
    "categories": [
      "google"
    ],
    "bitPackage": "@ha-bits/bit-google-calendar",
    "showcaseCount": 0,
    "icon": "Package"
  },
  {
    "slug": "telegram",
    "name": "Telegram",
    "description": "Send summaries and alerts to Telegram chats using a BotFather bot token.",
    "categories": [
      "messaging"
    ],
    "bitPackage": "@ha-bits/bit-telegram",
    "showcaseCount": 1,
    "icon": "Send"
  },
  {
    "slug": "linkedin",
    "name": "LinkedIn",
    "description": "Publish posts to LinkedIn personal or organization pages via OAuth.",
    "categories": [
      "social"
    ],
    "bitPackage": "@ha-bits/bit-linkedin",
    "showcaseCount": 3,
    "icon": "Globe"
  },
  {
    "slug": "twitter",
    "name": "Twitter / X",
    "description": "Post tweets via the Twitter/X API with developer app credentials.",
    "categories": [
      "social"
    ],
    "bitPackage": "@ha-bits/bit-twitter",
    "showcaseCount": 3,
    "icon": "Globe"
  },
  {
    "slug": "whatsapp",
    "name": "WhatsApp Business",
    "description": "Send template messages and receive inbound messages via Meta Cloud API.",
    "categories": [
      "messaging"
    ],
    "bitPackage": "@ha-bits/bit-whatsapp",
    "showcaseCount": 2,
    "icon": "MessageCircle"
  },
  {
    "slug": "intersect",
    "name": "Intersect AI",
    "description": "Generate images, posters, and landing pages through the Intersect AI gateway.",
    "categories": [
      "ai"
    ],
    "bitPackage": "@ha-bits/bit-intersect",
    "showcaseCount": 3,
    "icon": "Sparkles"
  },
  {
    "slug": "snov",
    "name": "Snov.io",
    "description": "Enrich leads with prospect and company data from the Snov.io API.",
    "categories": [
      "crm"
    ],
    "bitPackage": "@ha-bits/bit-snov",
    "showcaseCount": 0,
    "icon": "Users"
  },
  {
    "slug": "salesforce",
    "name": "Salesforce CRM",
    "description": "Create leads and opportunities in Salesforce with an access token.",
    "categories": [
      "crm"
    ],
    "bitPackage": "@ha-bits/bit-salesforce",
    "showcaseCount": 0,
    "icon": "Users"
  },
  {
    "slug": "gohighlevel",
    "name": "GoHighLevel CRM",
    "description": "Sync contacts and workflows to GoHighLevel with an API access token.",
    "categories": [
      "crm"
    ],
    "bitPackage": "@ha-bits/bit-gohighlevel",
    "showcaseCount": 0,
    "icon": "Users"
  },
  {
    "slug": "recaptcha",
    "name": "reCAPTCHA Enterprise",
    "description": "Protect contact forms with Google reCAPTCHA Enterprise verification.",
    "categories": [
      "identity"
    ],
    "showcaseCount": 0,
    "icon": "Shield"
  },
  {
    "slug": "sumsub",
    "name": "Sumsub KYC",
    "description": "Run identity verification workflows with Sumsub applicants and webhooks.",
    "categories": [
      "identity"
    ],
    "showcaseCount": 0,
    "icon": "Shield"
  },
  {
    "slug": "mcp-servers",
    "name": "MCP Servers",
    "description": "Connect AI agents to Google Drive, Slack, GitHub, and other tools via Model Context Protocol.",
    "categories": [
      "ai"
    ],
    "bitPackage": "@ha-bits/bit-agent",
    "showcaseCount": 1,
    "icon": "Bot"
  }
]
</script>

<div class="integrations-index-header">
  <h1>Integrations</h1>
  <p class="integrations-subtitle">Step-by-step setup guides for connecting external services to your Habits workflows</p>

</div>

<IntegrationsGrid :integrations="integrations" />

<style>
.integrations-index-header {
  text-align: center;
  padding: 32px 0 40px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.integrations-index-header h1 {
  font-size: 2.5em;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 12px;
  color: var(--vp-c-text-1);
}

.integrations-subtitle {
  font-size: 1.2em;
  color: var(--vp-c-text-2);
  margin: 0 0 8px;
  font-weight: 400;
}

.integrations-note {
  font-size: 0.9em;
  color: var(--vp-c-text-3);
  margin: 0;
}

.vp-doc > h1:first-of-type {
  display: none;
}
</style>
