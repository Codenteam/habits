# @ha-bits/bit-qr

QR code generation and reading bit for Habits workflows. Supports multiple data formats and works across Node.js, browser, and Tauri environments.

## Features

- **Generate QR codes** from text, URLs, vCards, WiFi credentials, and calendar events
- **Read QR codes** from images (PNG, JPEG)
- **Auto-detect data type** in decoded QR codes
- **Format helpers** for vCard, WiFi, and calendar data
- **Cross-platform** - works in Node.js, browser, and Tauri

## Actions

### generate

Generate a QR code from data.

**Parameters:**
- `data` (required): The data to encode
- `dataType` (optional): Type hint - `text`, `url`, `vcard`, `wifi`, `calendar`
- `format` (optional): Output format - `dataUrl` (default), `png`, `svg`
- `size` (optional): Size in pixels (default: 256)
- `errorCorrection` (optional): Error correction level - `L`, `M` (default), `Q`, `H`
- `darkColor` (optional): Dark module color (default: #000000)
- `lightColor` (optional): Light module color (default: #ffffff)

**Returns:**
```json
{
  "success": true,
  "data": "data:image/png;base64,...",
  "format": "dataUrl",
  "dataType": "text",
  "content": "Hello World",
  "size": 256
}
```

### read

Read and decode a QR code from an image.

**Parameters:**
- `image` (required): Base64 encoded image, data URL, or file path
- `maxSize` (optional): Maximum image size in bytes (default: 5MB)

**Returns:**
```json
{
  "success": true,
  "data": "https://example.com",
  "location": {
    "topLeftCorner": { "x": 10, "y": 10 },
    "topRightCorner": { "x": 200, "y": 10 },
    "bottomLeftCorner": { "x": 10, "y": 200 },
    "bottomRightCorner": { "x": 200, "y": 200 }
  },
  "detectedType": "url"
}
```

### formatVCard

Format contact information as a vCard string.

**Parameters:**
- `firstName` (required): First name
- `lastName` (optional): Last name
- `phone` (optional): Phone number
- `email` (optional): Email address
- `organization` (optional): Company/organization
- `title` (optional): Job title
- `url` (optional): Website URL
- `address` (optional): Street address

### formatWiFi

Format WiFi credentials for QR encoding.

**Parameters:**
- `ssid` (required): Network name
- `password` (optional): Network password
- `encryption` (optional): `WPA` (default), `WEP`, or `nopass`
- `hidden` (optional): Whether the network is hidden

### formatCalendar

Format a calendar event for QR encoding.

**Parameters:**
- `title` (required): Event title
- `startDate` (required): Start date (ISO format)
- `endDate` (optional): End date (ISO format)
- `location` (optional): Event location
- `description` (optional): Event description

### detectType

Detect the type of data in a QR code string.

**Parameters:**
- `data` (required): The decoded QR data

**Returns:**
```json
{
  "type": "wifi",
  "parsed": {
    "ssid": "MyNetwork",
    "password": "secret123",
    "encryption": "WPA"
  }
}
```

## Usage in Workflows

### Generate a simple QR code

```yaml
nodes:
  - id: create-qr
    type: bit
    data:
      framework: bits
      module: '@ha-bits/bit-qr'
      operation: generate
      source: npm
      params:
        data: 'https://example.com'
        dataType: url
        format: dataUrl
        size: 300
```

### Generate a WiFi QR code

```yaml
nodes:
  - id: wifi-string
    type: bit
    data:
      framework: bits
      module: '@ha-bits/bit-qr'
      operation: formatWiFi
      source: npm
      params:
        ssid: 'MyNetwork'
        password: 'secret123'
        encryption: WPA
  - id: wifi-qr
    type: bit
    data:
      framework: bits
      module: '@ha-bits/bit-qr'
      operation: generate
      source: npm
      params:
        data: '{{wifi-string.wifi}}'
        dataType: wifi
edges:
  - source: wifi-string
    target: wifi-qr
```

### Read a QR code from uploaded image

```yaml
nodes:
  - id: read-qr
    type: bit
    data:
      framework: bits
      module: '@ha-bits/bit-qr'
      operation: read
      source: npm
      params:
        image: '{{habits.input.imageBase64}}'
```

## License

MIT
