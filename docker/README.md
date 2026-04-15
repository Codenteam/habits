# Docker Services for Habits Development

This folder contains Docker Compose configuration for development services.

## Services

| Service | Port | Description |
|---------|------|-------------|
| **Verdaccio** | 4873 | Private npm registry for publishing @ha-bits/* packages |
| **Greenmail** | 3025 (SMTP), 3143 (IMAP), 8080 (Web API) | Test email server |
| **Matter MVD** | 6080 (noVNC) | Google's Matter Virtual Device simulator |

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

## Matter Virtual Device (MVD)

Google's Matter Virtual Device simulates Matter-compatible smart home devices for development and testing with `tauri-plugin-matter`.

Web UI: http://localhost:6080 (noVNC)

### Prerequisites

1. **Docker Engine** (recommended over Docker Desktop for `network_mode: host`)
   ```bash
   # macOS with Colima
   brew install colima docker
   colima start --network-address
   ```

2. **Firewall Configuration** (allow mDNS)
   ```bash
   # macOS
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/sbin/mDNSResponder
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/sbin/mDNSResponder
   
   # Linux
   sudo ufw allow 5353/udp
   ```

### Start Matter Virtual Device

```bash
cd services
docker compose -f docker-compose.matter.yaml up -d

# View logs
docker compose -f docker-compose.matter.yaml logs -f
```

### Create and Commission a Device

1. Open http://localhost:6080 (noVNC web interface)
2. Select a device type (e.g., On/Off Light, Dimmable Light)
3. Click "Create Device" to generate a virtual device
4. Scan the QR code with Google Home app to commission
5. Device appears in your Matter fabric and can be controlled via `tauri-plugin-matter`

### Supported Device Types

- On/Off Light, Dimmable Light, Color Temperature Light, Extended Color Light
- On/Off Plug-in Unit, Dimmable Plug-in Unit
- Temperature Sensor, Humidity Sensor, Occupancy Sensor, Contact Sensor
- Door Lock, Window Covering
