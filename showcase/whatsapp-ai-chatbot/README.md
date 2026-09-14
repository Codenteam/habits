# WhatsApp AI Chatbot

An AI-powered WhatsApp assistant that answers customer questions using your company and product information.

## What it does

1. **Build your knowledge base** — Upload a document (PDF, TXT, etc.) with your company or product details through the web UI. The assistant learns from that content.
2. **Reply on WhatsApp** — When someone messages your WhatsApp Business number, the bot understands their question, finds relevant information from what you uploaded, and sends a helpful reply back to the same number.

Greetings like “Hi” get a friendly response. Product or company questions get answers based on your uploaded information.

## Setup

1. Copy `.env.example` to `.env` and fill in your OpenAI and WhatsApp credentials.
2. Start the showcase:

   ```bash
   npx nx dev @ha-bits/cortex --config showcase/whatsapp-ai-chatbot/stack.yaml
   ```

3. Open the frontend (default `http://localhost:13000`) and upload your company or product document.
4. Connect your Meta WhatsApp webhook to `/webhook/v/whatsapp` on your server (use ngrok for local testing). See the [WhatsApp integration guide](/integrations/whatsapp/) for full Meta setup steps.
