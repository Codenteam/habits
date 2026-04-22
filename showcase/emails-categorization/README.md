# Emails Categorization Showcase

This showcase reads emails via IMAP, categorizes them using OpenAI, and sends a summary to a Telegram chat.

---

## Setup

Copy `.env.example` to `.env` and fill in each value following the steps below.

```bash
cp .env.example .env
```

---

## 1. Get Gmail App Password (`HABITS_IMAP_PASSWORD`)

Gmail requires an **App Password** instead of your regular password when using IMAP with third-party apps.

### Step 1 — Enable 2-Step Verification

1. Go to your Google Account: [https://myaccount.google.com](https://myaccount.google.com)
2. Click **Security** in the left sidebar.
3. Under **"How you sign in to Google"**, click **2-Step Verification**.
4. Click **Get started** and follow the prompts (phone number or authenticator app).
5. Complete the setup and confirm 2-Step Verification is **On**.

### Step 2 — Generate an App Password

1. Go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)  
   _(You must have 2-Step Verification enabled to see this page.)_
2. Sign in if prompted.
3. In the **"App name"** field, type a label like `Habits IMAP`.
4. Click **Create**.
5. Google will show a **16-character password** (e.g. `abcd efgh ijkl mnop`). **Copy it without spaces immediately** — it will not be shown again.

### Step 3 — Add to `.env`

```env
HABITS_IMAP_HOST=imap.gmail.com
HABITS_IMAP_PORT=993
HABITS_IMAP_USER=your-email@gmail.com
HABITS_IMAP_PASSWORD=abcdefghijklmnop   # paste the 16-char app password (no spaces)
```

---

## 2. Create a Telegram Bot and Get the Bot Token (`HABITS_TELEGRAM_BOT_TOKEN`)

### Step 1 — Create the bot with BotFather

1. Open Telegram and search for **@BotFather** (the official bot, blue checkmark).
2. Start a chat and send `/newbot`.
3. BotFather will ask for a **name** — enter a display name, e.g. `My Habits Bot`.
4. Then it asks for a **username** — must end in `bot`, e.g. `my_habits_bot`.
5. BotFather replies with your **bot token**, which looks like:
   ```
   123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
6. Copy the token — you'll need it in the next step.

### Step 2 — Add the bot to a chat or group

**For a private chat:**
1. Search for your bot by its username in Telegram.
2. Open the chat and press **Start** (or send `/start`).

**For a group:**
1. Open an existing group or create a new one.
2. Go to the group **Settings → Add Members**.
3. Search for your bot by username and add it.
4. If needed, grant the bot permission to **read messages** (make it an admin or disable privacy mode via BotFather: `/setprivacy` → `Disable`).

### Step 3 — Add to `.env`

```env
HABITS_TELEGRAM_BOT_TOKEN=123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 3. Get the Telegram Chat ID (`HABITS_TELEGRAM_CHAT_ID`)

### Step 1 — Add @GetIdsBot to the chat

1. In Telegram, search for **@GetIdsBot**.
2. **For a private chat:** Open the bot and press **Start** — it will reply with your user ID.
3. **For a group:** Go to the group → **Add Members** → search `@GetIdsBot` and add it.

### Step 2 — Retrieve the Chat ID

1. After adding @GetIdsBot to the group, send **any message** in the group (e.g. `hello`).
2. @GetIdsBot will immediately reply with information including the **Chat ID**, which looks like:
   ```
   Chat ID: -1001234567890
   ```
3. Copy the chat ID.

### Step 3 — Add to `.env`

```env
HABITS_TELEGRAM_CHAT_ID=-1001234567890
```

---

## Final `.env` Example

```env
HABITS_IMAP_HOST=imap.gmail.com
HABITS_IMAP_PORT=993
HABITS_IMAP_USER=your-email@gmail.com
HABITS_IMAP_PASSWORD=...

HABITS_OPENAI_API_KEY=...

HABITS_TELEGRAM_BOT_TOKEN=...
HABITS_TELEGRAM_CHAT_ID=...

HABITS_OPENAPI_ENABLED=true
```
