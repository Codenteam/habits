# Docker Services for Habits Development

This folder contains Docker Compose configuration for development services.

## Services

| Service | Port | Description |
|---------|------|-------------|
| **Verdaccio** | 4873 | Private npm registry for publishing @ha-bits/* packages |
| **Greenmail** | 3025 (SMTP), 3143 (IMAP), 8080 (Web API) | Test email server |

## Usage

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f

# Restart
docker compose restart
```

## Verdaccio (Private NPM Registry)

Web UI: http://localhost:4873

### First-time Setup

The storage directory will be created automatically on first run. Ensure proper permissions:

```bash
# Create storage directory with correct permissions for verdaccio user (10001:65533)
mkdir -p verdaccio-storage verdaccio-plugins
chmod 777 verdaccio-storage verdaccio-plugins

# Start the services
docker compose up -d
```

### Data Persistence

Verdaccio uses bind mounts to persist data on the host:
- `./verdaccio-storage/` - Published packages and htpasswd file
- `./verdaccio-plugins/` - Custom plugins

Data persists across container restarts and is visible on the host for easy debugging.

### NPM Uplink

Verdaccio proxies requests to npmjs.org for packages not found locally. The `@ha-bits/*` scope is kept private and won't proxy.

Publishing bits:
```bash
# From project root
./scripts/publish-bits-verdaccio.sh
```

Installing from registry:
```bash
npm install @ha-bits/bit-email --registry http://localhost:4873
```

## Greenmail (Test Email Server)

Greenmail auto-creates users on first login/send.

Send test email (Python):
```python
import smtplib
from email.mime.text import MIMEText

server = smtplib.SMTP('localhost', 3025)
msg = MIMEText("Test body")
msg['Subject'] = 'Test Subject'
msg['From'] = 'sender@test.com'
msg['To'] = 'recipient@test.com'
server.send_message(msg)
server.quit()
```

IMAP access:
- Host: localhost
- Port: 3143
- User: any email (e.g., test@localhost)
- Password: any (auto-created)
