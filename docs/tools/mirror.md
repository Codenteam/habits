# Mirror, P2P Habit Transfer

**Habit Mirror** is a peer-to-peer file transfer system for moving `.habit` files between devices. The signaling server only relays connection setup (SDP/ICE); all file data flows directly between peers via WebRTC DataChannel, nothing is stored or passed through the server.

::: info Why "Mirror"?
The feature was previously called "Express Habit Sharing". It was renamed to **Mirror** to better reflect its purpose: instantly mirroring a habit from one device to another.
:::

## How it works

1. **Receiver** opens the Mirror screen (in the Desktop App, Mobile App, or Admin UI) and generates a 6-character pairing code
2. **Sender** enters the code and selects the `.habit` file in Base UI or Admin
3. **WebRTC DataChannel** transfers the file in 64KB chunks directly between devices
4. The receiver imports the habit automatically

No file data ever passes through the server, the server only brokers the WebRTC handshake.

## Pairing code

Codes are 6 characters (uppercase, unambiguous alphabet, no `0`, `O`, `1`, `I`). They expire after 15 minutes.

## Where Mirror is available

| Surface | Send | Receive |
|---|---|---|
| Base UI (toolbar button) | ✓ |, |
| Admin UI (`/share` route) | ✓ | ✓ |
| Desktop App |, | ✓ |
| Mobile App |, | ✓ |

## Running your own Mirror server

Mirror requires a signaling server (`@ha-bits/mirror`). The easiest way is to enable it as a system service in [Admin](/tools/admin):

1. Go to **Admin → Services → System Services**
2. Enable **Habit Mirror**
3. It will run at `mirror.yourdomain.com` (or your configured subdomain)

To run it standalone:

```bash
npx @ha-bits/mirror --port 3001 --host 0.0.0.0
```

The server exposes:
- `GET /ws`, WebSocket signaling endpoint
- `GET /habit-mirror.js`, Client library for embedding in your own apps
- `GET /api/code`, Generate a pairing code

## Client library

```html
<script src="https://mirror.yourdomain.com/habit-mirror.js"></script>
<script>
  // Receiver
  const { code, transfer } = await window.HabitMirror.createReceiver('wss://mirror.yourdomain.com/ws');
  console.log('Pairing code:', code);
  const { name, blob } = await transfer;

  // Sender
  await window.HabitMirror.sendHabit('wss://mirror.yourdomain.com/ws', code, file);
</script>
```

## Security note

The WebSocket signaling endpoint is publicly reachable. Put it behind a rate-limiting layer (e.g. Cloudflare) before exposing publicly.

## Relation to other tools

| Tool | Relation |
|---|---|
| [Admin](/tools/admin) | Admin hosts Mirror as a managed system service |
| [Desktop App](/tools/desktop-app) | Built-in Mirror receiver |
| [Mobile App](/tools/mobile-app) | Built-in Mirror receiver |
| [Base](/tools/base) | Mirror send button in the Base toolbar |
