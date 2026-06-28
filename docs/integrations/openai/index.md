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

<IntegrationShowcases integration="openai" />
