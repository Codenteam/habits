---
title: "Telegram"
description: "Send summaries and alerts to Telegram chats with a bot token"
---

# Telegram

Use `@ha-bits/bit-telegram` to send formatted summaries and notifications to Telegram chats or groups.

**Related bit:** [`@ha-bits/bit-telegram`](/bits/bit-telegram)

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `HABITS_TELEGRAM_BOT_TOKEN` | Bot token from BotFather | `123456789:AAF...` |
| `HABITS_TELEGRAM_CHAT_ID` | Chat or group ID | `-1001234567890` |
| `TELEGRAM_BOT_TOKEN` | Alternate naming | `123456789:AAF...` |
| `TELEGRAM_CHAT_ID` | Alternate naming | `-100...` |

## Create a Telegram Bot

1. Open Telegram and search for **@BotFather** (official bot with blue checkmark).
2. Send `/newbot`.
3. Enter a **display name** (e.g. `My Habits Bot`).
4. Enter a **username** ending in `bot` (e.g. `my_habits_bot`).
5. BotFather replies with your **bot token**:

   ```
   123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

6. Add it to `.env`:

```env
HABITS_TELEGRAM_BOT_TOKEN=123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Add the Bot to a Chat

**Private chat:**
1. Search for your bot by username.
2. Open the chat and press **Start** (or send `/start`).

**Group:**
1. Open the group → **Settings → Add Members**.
2. Search for your bot and add it.
3. If needed, grant read permissions (make admin or disable privacy mode via BotFather: `/setprivacy` → `Disable`).

## Get the Chat ID

1. Search for **@GetIdsBot** in Telegram.
2. **Private chat:** Open the bot and press **Start** — it replies with your user ID.
3. **Group:** Add @GetIdsBot to the group, send any message, and copy the **Chat ID** from its reply (e.g. `-1001234567890`).
4. Add it to `.env`:

```env
HABITS_TELEGRAM_CHAT_ID=-1001234567890
```

## Example `.env`

```env
HABITS_TELEGRAM_BOT_TOKEN=123456789:AAF...
HABITS_TELEGRAM_CHAT_ID=-1001234567890
```

## Used in Showcases

- [Emails Categorization](/showcase/emails-categorization)
- [Email Classification](/showcase/email-classification) (important emails routed to Telegram)
