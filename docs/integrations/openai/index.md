---
title: "OpenAI"
description: "Use GPT models for AI-powered workflows in Habits"
---

# OpenAI

Use `@ha-bits/bit-openai` for text generation, classification, summarization, and structured data extraction across many showcases.

**Related bit:** [`@ha-bits/bit-openai`](/bits/bit-openai)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HABITS_OPENAI_API_KEY` | Your OpenAI API key (preferred Habits prefix) |
| `OPENAI_API_KEY` | Alternate naming used in some showcases |

## Get an API Key

1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. Sign in or create an account.
3. Click **Create new secret key**.
4. Copy the key and add it to your `.env` file:

```env
HABITS_OPENAI_API_KEY=sk-...
```

> Keep your API key secret. Never commit `.env` files to version control.

## Example `.env`

```env
HABITS_OPENAI_API_KEY=sk-proj-...
```

## Used in Showcases

- [Email Digest Summarizer](/showcase/email-digest-summarizer)
- [RSS Digest Summarizer](/showcase/rss-digest-summarizer)
- [Emails Categorization](/showcase/emails-categorization)
- [Email Ticket Routing](/showcase/email-ticket-routing)
- [Email Classification](/showcase/email-classification)
- [AI Agent Lead Enrichment](/showcase/ai-agent-lead-enrichment)
- [Client Invoice Manager](/showcase/client-invoice-manager)
- [Invoices Processing](/showcase/invoices-processing)
- [Real Estate Agent Leads Management](/showcase/real-estate-agent-leads-management)
- [Real Estate Social Marketing](/showcase/real-estate-social-marketing)
- [Social Media Multi-Posting](/showcase/social-media-multi-posting)
- [Marketing Campaign](/showcase/marketing-campaign)
- [Smart Contact Form](https://github.com/codenteam/habits/tree/main/showcase/smart-contact-form)
- [Agent MCP Demo](/showcase/agent-mcp-demo)
