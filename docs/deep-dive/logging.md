# Logging Configuration

This guide covers how to configure and use logging when running automations with Cortex.

## Overview

Habits provides a multilevel logging system with:
- **6 log levels**: trace, debug, info, warn, error, fatal (plus `none` to disable)
- **Multiple outputs**: console, file, JSON (NDJSON format)
- **Hierarchical configuration**: Environment variables > stack.yaml > habit.yaml > defaults
- **Per-bit log level overrides**: Fine-grained control over specific bits

::: tip Configuration Priority
Environment variables always take precedence over YAML configuration, making it easy to adjust logging in production without changing files.
:::

---

## Configuration in stack.yaml

Add a `logging` section to your `stack.yaml` to configure logging:

```yaml
version: "1.0"
workflows:
  - id: my-workflow
    path: ./habit.yaml
    enabled: true

server:
  port: 3000

# Logging configuration
logging:
  level: info                    # trace, debug, info, warn, error, fatal, none
  outputs: [console]             # console, file, json
  format: text                   # text or json
  colorize: true                 # Enable ANSI colors in console output
```

### Full Configuration Reference

```yaml
logging:
  # Default log level for all loggers (default: info)
  level: info

  # Output destinations (default: [console])
  outputs: [console, file]

  # Output format for console/file (default: text)
  format: text  # or 'json'

  # Enable colors in console output (auto-detected if not specified)
  colorize: true

  # File output configuration (required if 'file' is in outputs)
  file:
    path: ./logs/habits.log     # Log file path
    maxSize: 10mb               # Max file size before rotation
    maxFiles: 5                 # Number of rotated files to keep

  # Per-bit log level overrides
  bitOverrides:
    bit-http: debug             # More verbose logging for HTTP bit
    bit-openai: trace           # Trace-level logging for OpenAI bit
```

---

## Log Levels

Log levels are ordered by severity. Setting a level shows that level and all more severe levels:

| Level | Priority | Description | Use Case |
|-------|----------|-------------|----------|
| `trace` | 0 | Most verbose | Detailed debugging, request/response bodies |
| `debug` | 1 | Debug information | Development debugging |
| `info` | 2 | General information | Normal operation status |
| `warn` | 3 | Warnings | Potential issues, deprecations |
| `error` | 4 | Errors | Failures, caught exceptions |
| `fatal` | 5 | Critical errors | System failures, crashes |
| `none` | 6 | Disabled | No logging output |

::: info Level Filtering
If you set `level: warn`, you'll see `warn`, `error`, and `fatal` messages, but not `trace`, `debug`, or `info`.
:::

---

## Environment Variable Overrides

Override any logging configuration using environment variables. This is useful for:
- Adjusting log levels in production without redeploying
- Debugging specific bits temporarily
- CI/CD pipeline configuration

### Available Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `HABITS_LOG_LEVEL` | Global log level | `debug` |
| `HABITS_LOG_OUTPUT` | Comma-separated outputs | `console,file` |
| `HABITS_LOG_FILE_PATH` | Log file path | `./logs/habits.log` |
| `HABITS_LOG_FILE_MAX_SIZE` | Max file size | `10mb` |
| `HABITS_LOG_FILE_MAX_FILES` | Max rotated files | `5` |
| `HABITS_LOG_COLORIZE` | Enable colors | `true` |
| `HABITS_LOG_FORMAT` | Output format | `json` |

### Per-Bit Level Overrides via Environment

Override log levels for specific bits using the pattern `HABITS_LOG_BIT_{BITNAME}_LEVEL`:

```bash
# Set bit-http to trace level while keeping others at info
HABITS_LOG_LEVEL=info HABITS_LOG_BIT_HTTP_LEVEL=trace npx @ha-bits/cortex

# Multiple bit overrides
HABITS_LOG_BIT_HTTP_LEVEL=debug HABITS_LOG_BIT_OPENAI_LEVEL=trace npx @ha-bits/cortex
```

### Example: Debug Mode

Enable full debugging with environment variables:

```bash
HABITS_LOG_LEVEL=debug npx @ha-bits/cortex --config ./stack.yaml
```

### Example: Production with File Logging

Log to files in production:

```bash
HABITS_LOG_LEVEL=info \
HABITS_LOG_OUTPUT=console,file \
HABITS_LOG_FILE_PATH=/var/log/habits/app.log \
npx @ha-bits/cortex --config ./stack.yaml
```

---

## Output Formats

### Console Output (Default)

Human-readable text format with optional colors:

```
2024-01-15 10:30:45 INFO  [bit-http] Request started {"url":"https://api.example.com"}
2024-01-15 10:30:46 DEBUG [bit-http] Response received {"status":200}
```

### JSON Output (NDJSON)

Machine-readable format for log aggregation systems:

```json
{"timestamp":"2024-01-15T10:30:45.123Z","level":"info","message":"Request started","context":{"bitName":"bit-http"},"data":{"url":"https://api.example.com"}}
{"timestamp":"2024-01-15T10:30:46.456Z","level":"debug","message":"Response received","context":{"bitName":"bit-http"},"data":{"status":200}}
```

Use JSON format for integration with:
- Elasticsearch / OpenSearch
- Datadog
- Splunk
- CloudWatch Logs
- Any log aggregation system

---

## File Rotation

When using file output, logs are automatically rotated:

```yaml
logging:
  outputs: [console, file]
  file:
    path: ./logs/habits.log     # Main log file
    maxSize: 10mb               # Rotate when file reaches 10MB
    maxFiles: 5                 # Keep 5 rotated files
```

This creates files like:
```
logs/
├── habits.log          # Current log file
├── habits.log.1        # Most recent rotated file
├── habits.log.2
├── habits.log.3
├── habits.log.4
└── habits.log.5        # Oldest rotated file
```

---

## Per-Bit Overrides

Fine-tune logging for specific bits without affecting others:

```yaml
logging:
  level: info  # Default level
  
  # Override specific bits
  bitOverrides:
    bit-http: debug      # See all HTTP request details
    bit-openai: trace    # Full trace for AI calls
    bit-email: warn      # Only warnings and errors for email
```

This is useful for:
- Debugging specific integrations
- Reducing noise from verbose bits
- Tracking specific workflow steps

---

## Practical Examples

### Development Setup

Verbose logging for local development:

```yaml
logging:
  level: debug
  outputs: [console]
  format: text
  colorize: true
  bitOverrides:
    bit-http: trace  # See full request/response
```

### Production Setup

Minimal console output with file backup:

```yaml
logging:
  level: info
  outputs: [console, file]
  format: json           # Structured logs for parsing
  colorize: false        # Disable colors for cleaner logs
  file:
    path: /var/log/habits/app.log
    maxSize: 50mb
    maxFiles: 10
```

### Debugging Specific Issue

Temporarily enable trace logging for one bit:

```bash
HABITS_LOG_BIT_HTTP_LEVEL=trace npx @ha-bits/cortex --config ./stack.yaml
```

### Docker/Container Deployment

JSON output to stdout for container log drivers:

```yaml
logging:
  level: info
  outputs: [json]  # NDJSON to stdout
```

---

## Best Practices

1. **Use `info` level in production** - It provides enough visibility without overwhelming logs
2. **Enable file logging for production** - Keeps a backup if console logs are lost
3. **Use JSON format for log aggregation** - Makes parsing and querying easier
4. **Use per-bit overrides for debugging** - Avoid turning everything to debug
5. **Set up log rotation** - Prevent disk space issues
6. **Use environment variables for quick changes** - No need to redeploy for log level changes
