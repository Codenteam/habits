# Bits

Enhanced workflow nodes with built-in capabilities, mandatory testing, and an OOP API.

## Overview

**Bits** are the workflow nodes in Habits. They provide a modular, type-safe way to build automations:

| Feature | Description |
|---------|-------------|
| Capabilities Model | Explicit capabilities (`fs:read`, `http:request`, etc.) |
| Mandatory Tests | Required end-to-end test for each bit |
| Script Support | TypeScript, Python, and more |
| Familiar API | `createRoutine`/`createCue` pattern |

---

## Bit Kinds

Bits come in two kinds, inspired by the habit loop:

| Kind | Deprecated Alias | Description |
|------|-----------------|-------------|
| **Cue** | Trigger/Watcher | Monitors for events and initiates workflow executions |
| **Routine** | Action/Doer | Performs operations when invoked |

### Cue (Entry Point)

A **Cue** observes external systems or schedules and emits events that start a habit. Think of it as the "cue" in the habit loop - the signal that initiates the routine. Use `createCue` (deprecated aliases: `createTrigger`, `createWatcher`).

### Routine (Operation)

A **Routine** executes a specific operation as part of the habit's workflow. It receives input, performs work, and returns output. Use `createRoutine` (deprecated aliases: `createAction`, `createDoer`).

---

## Capabilities Model

Bits declare explicit capabilities to control what resources they can access. Capabilities use a `namespace:action` format for fine-grained control. This follows the principle of least privilege and makes security auditing straightforward.

### Available Capabilities

| Capability | Description |
|------------|-------------|
| `net` | Make outbound HTTP/HTTPS requests |
| `fs:read` | Read from the filesystem |
| `fs:write` | Write to the filesystem |
| `env:read` | Read environment variables |
| `exec:run` | Execute shell commands |
| `pii:replace` | Read/access personally identifiable information |
| `pii:eradicate` | Store/transmit personally identifiable information |
| `pii:block` | Block/redact PII from being processed or transmitted |
| `pii:flag` | Block/redact PII from being processed or transmitted |
| `moderation:block` | Block harmful, offensive, or inappropriate content |
| `moderation:flag` | Flag content for review without blocking |

### Capability Declaration

```typescript
import { createRoutine } from '@ha-bits/bits';

export const myRoutine = createRoutine({
  // ...
  capabilities: ['http:request', 'secrets:read'], // Declare required capabilities
  // ...
});
```

If a bit attempts to use a resource it hasn't declared, execution will fail with a capability error.

---

## Creating Bits

Bits use an OOP-style API. The framework provides two primary functions:

- `createRoutine` – Create routine bits (deprecated aliases: `createAction`, `createDoer`)
- `createCue` – Create cue bits (deprecated aliases: `createTrigger`, `createWatcher`)

Both functions accept a capabilities array alongside the standard configuration.

---

## Creating a Routine

Use `createRoutine` to define an operation that performs work when invoked.

### Basic Routine Example

```typescript
// bits/slack/send-message.ts
import { createRoutine, Property } from '@ha-bits/bits';
import { httpClient, HttpMethod } from '@ha-bits/bits-common';
import { slackAuth } from '../..';

export const sendSlackMessage = createRoutine({
  name: 'send_slack_message',
  auth: slackAuth,
  displayName: 'Send Slack Message',
  description: 'Posts a message to a Slack channel',
  capabilities: ['http:request', 'secrets:read'],
  props: {
    channel: Property.ShortText({
      displayName: 'Channel',
      description: 'Channel ID or name (e.g., #general or C01234567)',
      required: true,
    }),
    text: Property.LongText({
      displayName: 'Message',
      description: 'The message content to send',
      required: true,
    }),
    thread_ts: Property.ShortText({
      displayName: 'Thread Timestamp',
      description: 'Reply to a specific thread (optional)',
      required: false,
    }),
  },
  async run(context) {
    const { channel, text, thread_ts } = context.propsValue;

    const response = await httpClient.sendRequest({
      method: HttpMethod.POST,
      url: 'https://slack.com/api/chat.postMessage',
      headers: {
        Authorization: `Bearer ${context.auth}`,
        'Content-Type': 'application/json',
      },
      body: {
        channel,
        text,
        ...(thread_ts && { thread_ts }),
      },
    });

    return response.body;
  },
});
```

### Doer with Complex Logic: CSV Processor

```typescript
// bits/data/process-csv.ts
import { createDoer, Property } from '@ha-bits/bits';

export const processCsv = createDoer({
  name: 'process_csv',
  auth: undefined, // No auth required
  displayName: 'Process CSV',
  description: 'Parses CSV content into structured JSON data',
  capabilities: ['fs:read', 'fs:write'],
  props: {
    csvContent: Property.LongText({
      displayName: 'CSV Content',
      description: 'Raw CSV content to parse',
      required: true,
    }),
    delimiter: Property.ShortText({
      displayName: 'Delimiter',
      description: 'Column separator character',
      required: false,
      defaultValue: ',',
    }),
    hasHeaders: Property.Checkbox({
      displayName: 'Has Headers',
      description: 'First row contains column names',
      required: false,
      defaultValue: true,
    }),
  },
  async run(context) {
    const { csvContent, delimiter = ',', hasHeaders = true } = context.propsValue;

    const lines = csvContent.trim().split('\n');
    const headers = hasHeaders
      ? lines[0].split(delimiter).map((h) => h.trim())
      : lines[0].split(delimiter).map((_, i) => `column_${i}`);

    const dataLines = hasHeaders ? lines.slice(1) : lines;

    const rows = dataLines.map((line) => {
      const values = line.split(delimiter);
      return headers.reduce((obj, header, i) => {
        obj[header] = values[i]?.trim() ?? '';
        return obj;
      }, {} as Record<string, string>);
    });

    context.log.info(`Processed ${rows.length} rows with ${headers.length} columns`);

    return {
      rows,
      headers,
      rowCount: rows.length,
    };
  },
});
```

### Doer with Retry Logic: Resilient HTTP Request

```typescript
// bits/http/resilient-request.ts
import { createDoer, Property } from '@ha-bits/bits';
import { httpClient, HttpMethod } from '@ha-bits/bits-common';

export const resilientHttpRequest = createDoer({
  name: 'resilient_http_request',
  auth: undefined,
  displayName: 'Resilient HTTP Request',
  description: 'HTTP request with automatic retry and exponential backoff',
  capabilities: ['http:request'],
  props: {
    url: Property.ShortText({
      displayName: 'URL',
      description: 'The endpoint URL',
      required: true,
    }),
    method: Property.StaticDropdown({
      displayName: 'Method',
      description: 'HTTP method',
      required: true,
      options: {
        options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
        ],
      },
    }),
    body: Property.Json({
      displayName: 'Body',
      description: 'Request body (for POST/PUT)',
      required: false,
    }),
    headers: Property.Object({
      displayName: 'Headers',
      description: 'Custom headers',
      required: false,
    }),
    retries: Property.Number({
      displayName: 'Max Retries',
      description: 'Number of retry attempts',
      required: false,
      defaultValue: 3,
    }),
    backoffMs: Property.Number({
      displayName: 'Backoff (ms)',
      description: 'Initial backoff delay in milliseconds',
      required: false,
      defaultValue: 1000,
    }),
  },
  async run(context) {
    const { url, method, body, headers, retries = 3, backoffMs = 1000 } = context.propsValue;

    let lastError: Error | null = null;
    let attempts = 0;

    for (let i = 0; i <= retries; i++) {
      attempts++;
      try {
        const response = await httpClient.sendRequest({
          url,
          method: method as HttpMethod,
          body,
          headers: headers as Record<string, string>,
        });

        return {
          status: response.status,
          data: response.body,
          attempts,
        };
      } catch (error) {
        lastError = error as Error;
        context.log.warn(`Attempt ${attempts} failed: ${lastError.message}`);

        if (i < retries) {
          const delay = backoffMs * Math.pow(2, i);
          context.log.info(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Request failed after ${attempts} attempts: ${lastError?.message}`);
  },
});
```

---

## Creating a Watcher (Trigger)

Use `createWatcher` to define a trigger that monitors for events. Watchers support three strategies:

| Strategy | Description |
|----------|-------------|
| `POLLING` | Periodically checks for new data |
| `WEBHOOK` | Receives incoming HTTP requests |
| `APP_WEBHOOK` | Uses app-level webhook subscriptions |

### Polling Watcher Example

```typescript
// bits/github/new-issue.ts
import { createWatcher, Property, WatcherStrategy } from '@ha-bits/bits';
import { DedupeStrategy, httpClient, HttpMethod, pollingHelper } from '@ha-bits/bits-common';
import { githubAuth } from '../..';
import dayjs from 'dayjs';

const polling = {
  strategy: DedupeStrategy.TIMEBASED,
  items: async ({ auth, propsValue, lastFetchEpochMS }) => {
    const response = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: `https://api.github.com/repos/${propsValue.owner}/${propsValue.repo}/issues`,
      headers: {
        Authorization: `Bearer ${auth}`,
        Accept: 'application/vnd.github.v3+json',
      },
      queryParams: {
        state: 'open',
        sort: 'created',
        direction: 'desc',
        since: lastFetchEpochMS 
          ? new Date(lastFetchEpochMS).toISOString() 
          : undefined,
      },
    });

    return response.body.map((issue: any) => ({
      epochMilliSeconds: dayjs(issue.created_at).valueOf(),
      data: issue,
    }));
  },
};

export const newGithubIssue = createWatcher({
  name: 'new_github_issue',
  auth: githubAuth,
  displayName: 'New GitHub Issue',
  description: 'Triggers when a new issue is created in a repository',
  capabilities: ['http:request', 'secrets:read', 'cache:read', 'cache:write'],
  props: {
    owner: Property.ShortText({
      displayName: 'Owner',
      description: 'Repository owner (username or organization)',
      required: true,
    }),
    repo: Property.ShortText({
      displayName: 'Repository',
      description: 'Repository name',
      required: true,
    }),
  },
  sampleData: {
    id: 1,
    title: 'Sample Issue',
    body: 'This is a sample issue body',
    state: 'open',
    user: { login: 'octocat' },
  },
  type: WatcherStrategy.POLLING,

  async test(context) {
    return await pollingHelper.test(polling, context);
  },

  async onEnable(context) {
    await pollingHelper.onEnable(polling, context);
  },

  async onDisable(context) {
    await pollingHelper.onDisable(polling, context);
  },

  async run(context) {
    return await pollingHelper.poll(polling, context);
  },
});
```

### Webhook Watcher Example

```typescript
// bits/stripe/payment-received.ts
import { createWatcher, Property, WatcherStrategy } from '@ha-bits/bits';
import { stripeAuth } from '../..';
import crypto from 'crypto';

export const stripePaymentReceived = createWatcher({
  name: 'stripe_payment_received',
  auth: stripeAuth,
  displayName: 'Payment Received',
  description: 'Triggers when a successful payment is received',
  capabilities: ['http:request', 'http:webhook', 'secrets:read'],
  props: {},
  sampleData: {
    id: 'pi_1234567890',
    amount: 2000,
    currency: 'usd',
    status: 'succeeded',
    customer: 'cus_1234567890',
  },
  type: WatcherStrategy.WEBHOOK,

  async onEnable(context) {
    // Register webhook with Stripe
    const response = await context.http.post(
      'https://api.stripe.com/v1/webhook_endpoints',
      {
        url: context.webhookUrl,
        enabled_events: ['payment_intent.succeeded'],
      },
      {
        headers: {
          Authorization: `Bearer ${context.auth.secretKey}`,
        },
      }
    );

    await context.store.put('webhookId', response.body.id);
    await context.store.put('webhookSecret', response.body.secret);
  },

  async onDisable(context) {
    const webhookId = await context.store.get<string>('webhookId');
    if (webhookId) {
      await context.http.delete(
        `https://api.stripe.com/v1/webhook_endpoints/${webhookId}`,
        {
          headers: {
            Authorization: `Bearer ${context.auth.secretKey}`,
          },
        }
      );
    }
  },

  async run(context) {
    const webhookSecret = await context.store.get<string>('webhookSecret');
    const signature = context.payload.headers['stripe-signature'];
    const payload = context.payload.rawBody;

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret!)
      .update(payload)
      .digest('hex');

    if (!crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(`v1=${expectedSignature}`)
    )) {
      throw new Error('Invalid webhook signature');
    }

    const event = context.payload.body;
    
    if (event.type === 'payment_intent.succeeded') {
      return [event.data.object];
    }

    return [];
  },
});
```

### Schedule Watcher Example

```typescript
// bits/schedule/cron.ts
import { createWatcher, Property, WatcherStrategy } from '@ha-bits/bits';

export const cronSchedule = createWatcher({
  name: 'cron_schedule',
  auth: undefined,
  displayName: 'Cron Schedule',
  description: 'Triggers on a cron schedule',
  capabilities: ['env:read'],
  props: {
    cronExpression: Property.ShortText({
      displayName: 'Cron Expression',
      description: 'Cron expression (e.g., "0 9 * * 1-5" for weekdays at 9 AM)',
      required: true,
    }),
    timezone: Property.StaticDropdown({
      displayName: 'Timezone',
      description: 'Timezone for the schedule',
      required: false,
      defaultValue: 'UTC',
      options: {
        options: [
          { label: 'UTC', value: 'UTC' },
          { label: 'America/New_York', value: 'America/New_York' },
          { label: 'Europe/London', value: 'Europe/London' },
          { label: 'Asia/Tokyo', value: 'Asia/Tokyo' },
        ],
      },
    }),
  },
  sampleData: {
    triggeredAt: '2026-02-03T09:00:00Z',
    scheduledAt: '2026-02-03T09:00:00Z',
  },
  type: WatcherStrategy.POLLING, // Schedule uses polling internally

  async test(context) {
    return [{
      triggeredAt: new Date().toISOString(),
      scheduledAt: new Date().toISOString(),
    }];
  },

  async onEnable(context) {
    // Store schedule configuration
    await context.store.put('cronExpression', context.propsValue.cronExpression);
    await context.store.put('timezone', context.propsValue.timezone);
  },

  async onDisable(context) {
    await context.store.delete('cronExpression');
    await context.store.delete('timezone');
  },

  async run(context) {
    // Cortex handles cron scheduling; this runs when triggered
    return [{
      triggeredAt: new Date().toISOString(),
      scheduledAt: context.payload?.scheduledTime || new Date().toISOString(),
    }];
  },
});
```

### File System Watcher Example

```typescript
// bits/fs/file-watcher.ts
import { createWatcher, Property, WatcherStrategy } from '@ha-bits/bits';

export const fileSystemWatcher = createWatcher({
  name: 'file_system_watcher',
  auth: undefined,
  displayName: 'File System Watcher',
  description: 'Triggers when files change in a directory',
  capabilities: ['fs:read'],
  props: {
    path: Property.ShortText({
      displayName: 'Directory Path',
      description: 'Absolute path to the directory to watch',
      required: true,
    }),
    events: Property.StaticMultiSelectDropdown({
      displayName: 'Events',
      description: 'File system events to watch for',
      required: true,
      options: {
        options: [
          { label: 'File Created', value: 'create' },
          { label: 'File Modified', value: 'modify' },
          { label: 'File Deleted', value: 'delete' },
        ],
      },
    }),
    pattern: Property.ShortText({
      displayName: 'File Pattern',
      description: 'Glob pattern to filter files (e.g., "*.json")',
      required: false,
    }),
  },
  sampleData: {
    event: 'create',
    path: '/data/uploads/document.pdf',
    filename: 'document.pdf',
    timestamp: '2026-02-03T10:30:00Z',
  },
  type: WatcherStrategy.APP_WEBHOOK, // Uses system-level file watching

  async onEnable(context) {
    const { path, events, pattern } = context.propsValue;
    
    // Register with Cortex file watcher service
    await context.store.put('watchConfig', { path, events, pattern });
    context.log.info(`File watcher enabled on ${path}`);
  },

  async onDisable(context) {
    await context.store.delete('watchConfig');
    context.log.info('File watcher disabled');
  },

  async run(context) {
    const event = context.payload.body;
    return [{
      event: event.type,
      path: event.path,
      filename: event.filename,
      timestamp: event.timestamp,
    }];
  },
});
```

---

## Script Bits

For quick transformations or when you need a specific runtime, bits can execute inline scripts in various languages.

### Python Script Doer

```typescript
// bits/python/analyze-sentiment.ts
import { createDoer, Property } from '@ha-bits/bits';
import { scriptRunner } from '@ha-bits/bits-common';

export const analyzeSentiment = createDoer({
  name: 'analyze_sentiment',
  auth: undefined,
  displayName: 'Analyze Sentiment',
  description: 'Analyzes text sentiment using Python and TextBlob',
  capabilities: ['exec:run'],
  props: {
    text: Property.LongText({
      displayName: 'Text',
      description: 'Text to analyze for sentiment',
      required: true,
    }),
  },
  async run(context) {
    const { text } = context.propsValue;

    const script = `
from textblob import TextBlob
import json

def main(text: str) -> dict:
    blob = TextBlob(text)
    polarity = blob.sentiment.polarity
    
    if polarity > 0.1:
        sentiment = "positive"
    elif polarity < -0.1:
        sentiment = "negative"
    else:
        sentiment = "neutral"
    
    return {
        "sentiment": sentiment,
        "confidence": abs(polarity),
        "scores": {
            "polarity": polarity,
            "subjectivity": blob.sentiment.subjectivity
        }
    }

print(json.dumps(main(${JSON.stringify(text)})))
`;

    const result = await scriptRunner.python({
      script,
      dependencies: ['textblob'],
    });

    return JSON.parse(result.stdout);
  },
});
```

### Deno Script Doer

```typescript
// bits/transform/jmespath-transform.ts
import { createDoer, Property } from '@ha-bits/bits';
import { scriptRunner } from '@ha-bits/bits-common';

export const jmespathTransform = createDoer({
  name: 'jmespath_transform',
  auth: undefined,
  displayName: 'JMESPath Transform',
  description: 'Transforms JSON data using JMESPath expressions',
  capabilities: ['exec:run'],
  props: {
    data: Property.Json({
      displayName: 'Data',
      description: 'JSON data to transform',
      required: true,
    }),
    expression: Property.ShortText({
      displayName: 'JMESPath Expression',
      description: 'The JMESPath query expression',
      required: true,
    }),
  },
  async run(context) {
    const { data, expression } = context.propsValue;

    const script = `
import jmespath from "npm:jmespath";

const data = ${JSON.stringify(data)};
const expression = ${JSON.stringify(expression)};

const result = jmespath.search(data, expression);
console.log(JSON.stringify(result));
`;

    const result = await scriptRunner.deno({ script });
    return JSON.parse(result.stdout);
  },
});
```

---

## Exposing Bits in a Bit Package

After creating your bits, expose them in the package definition:

```typescript
// src/index.ts
import { createBitPackage, BitAuth } from '@ha-bits/bits';
import { sendSlackMessage } from './lib/doers/send-message';
import { newSlackMessage } from './lib/watchers/new-message';

export const slackAuth = BitAuth.SecretText({
  displayName: 'Bot Token',
  description: 'Slack Bot OAuth Token (xoxb-...)',
  required: true,
});

export const slack = createBitPackage({
  displayName: 'Slack',
  description: 'Slack messaging integration',
  logoUrl: 'https://example.com/bits/slack.png',
  authors: ['habits-team'],
  auth: slackAuth,
  doers: [sendSlackMessage],      // Actions
  watchers: [newSlackMessage],    // Triggers
});
```

---

## Testing Requirements

Every bit **must** include at least one end-to-end test that:

1. Runs the bit's main flow
2. Mocks all external resources (HTTP, filesystem, etc.)
3. Validates the expected output

### Test Structure for Doers

```typescript
// bits/slack/send-message.test.ts
import { sendSlackMessage } from './send-message';
import { createMockContext } from '@ha-bits/bits/testing';

describe('Slack Send Message Doer', () => {
  let context: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    context = createMockContext();
  });

  describe('metadata', () => {
    it('should have correct name and type', () => {
      expect(sendSlackMessage.name).toBe('send_slack_message');
      expect(sendSlackMessage.displayName).toBe('Send Slack Message');
    });

    it('should declare required capabilities', () => {
      expect(sendSlackMessage.capabilities).toContain('http:request');
      expect(sendSlackMessage.capabilities).toContain('secrets:read');
    });

    it('should define required props', () => {
      expect(sendSlackMessage.props.channel.required).toBe(true);
      expect(sendSlackMessage.props.text.required).toBe(true);
      expect(sendSlackMessage.props.thread_ts.required).toBe(false);
    });
  });

  describe('run', () => {
    it('should send a message successfully', async () => {
      // Mock the HTTP response
      context.http.post.mockResolvedValue({
        status: 200,
        body: {
          ok: true,
          ts: '1234567890.123456',
          channel: 'C01234567',
        },
      });

      // Set up context
      context.auth = 'xoxb-test-token';
      context.propsValue = {
        channel: 'C01234567',
        text: 'Hello from test!',
      };

      const result = await sendSlackMessage.run(context);

      // Verify the result
      expect(result.ok).toBe(true);
      expect(result.ts).toBe('1234567890.123456');
      expect(result.channel).toBe('C01234567');

      // Verify the HTTP call
      expect(context.http.post).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        expect.objectContaining({
          channel: 'C01234567',
          text: 'Hello from test!',
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer xoxb-test-token',
          }),
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      context.http.post.mockResolvedValue({
        status: 200,
        body: {
          ok: false,
          error: 'channel_not_found',
        },
      });

      context.auth = 'xoxb-test-token';
      context.propsValue = {
        channel: 'invalid-channel',
        text: 'This should fail',
      };

      const result = await sendSlackMessage.run(context);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('channel_not_found');
    });

    it('should support thread replies', async () => {
      context.http.post.mockResolvedValue({
        status: 200,
        body: { ok: true, ts: '1234567890.654321', channel: 'C01234567' },
      });

      context.auth = 'xoxb-test-token';
      context.propsValue = {
        channel: 'C01234567',
        text: 'Thread reply',
        thread_ts: '1234567890.123456',
      };

      await sendSlackMessage.run(context);

      expect(context.http.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          thread_ts: '1234567890.123456',
        }),
        expect.any(Object)
      );
    });
  });
});
```

### Test Structure for Watchers

```typescript
// bits/github/new-issue.test.ts
import { newGithubIssue } from './new-issue';
import { createMockContext } from '@ha-bits/bits/testing';

describe('GitHub New Issue Watcher', () => {
  let context: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    context = createMockContext();
  });

  describe('metadata', () => {
    it('should have correct name and type', () => {
      expect(newGithubIssue.name).toBe('new_github_issue');
      expect(newGithubIssue.type).toBe('POLLING');
    });

    it('should declare required capabilities', () => {
      expect(newGithubIssue.capabilities).toContain('http:request');
      expect(newGithubIssue.capabilities).toContain('cache:read');
    });
  });

  describe('test method', () => {
    it('should return sample issues', async () => {
      context.http.get.mockResolvedValue({
        status: 200,
        body: [
          { id: 1, title: 'Issue 1', created_at: '2026-02-03T10:00:00Z' },
          { id: 2, title: 'Issue 2', created_at: '2026-02-03T11:00:00Z' },
        ],
      });

      context.auth = 'ghp_test_token';
      context.propsValue = { owner: 'habits-dev', repo: 'bits' };

      const result = await newGithubIssue.test(context);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Issue 1');
    });
  });

  describe('onEnable/onDisable lifecycle', () => {
    it('should set up polling state on enable', async () => {
      context.auth = 'ghp_test_token';
      context.propsValue = { owner: 'habits-dev', repo: 'bits' };

      await newGithubIssue.onEnable(context);

      expect(context.store.put).toHaveBeenCalled();
    });

    it('should clean up on disable', async () => {
      await newGithubIssue.onDisable(context);

      expect(context.store.delete).toHaveBeenCalled();
    });
  });

  describe('run method', () => {
    it('should fetch and dedupe new issues', async () => {
      context.http.get.mockResolvedValue({
        status: 200,
        body: [
          { id: 3, title: 'New Issue', created_at: '2026-02-03T12:00:00Z' },
        ],
      });

      context.auth = 'ghp_test_token';
      context.propsValue = { owner: 'habits-dev', repo: 'bits' };

      const result = await newGithubIssue.run(context);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('New Issue');
    });
  });
});
```

### Mock Context API

The testing utilities provide a pre-configured mock context:

```typescript
import { createMockContext } from '@ha-bits/bits/testing';

const context = createMockContext();

// HTTP client mocks
context.http.get       // jest.fn()
context.http.post      // jest.fn()
context.http.put       // jest.fn()
context.http.delete    // jest.fn()

// Store mocks (for watchers)
context.store.get      // jest.fn()
context.store.put      // jest.fn()
context.store.delete   // jest.fn()

// Files mocks (requires 'fs' permission)
context.files.read     // jest.fn()
context.files.write    // jest.fn()
context.files.exists   // jest.fn()
context.files.list     // jest.fn()

// Logging mocks
context.log.debug      // jest.fn()
context.log.info       // jest.fn()
context.log.warn       // jest.fn()
context.log.error      // jest.fn()

// Set auth and props for testing
context.auth = 'test-api-key';
context.propsValue = { channel: '#test', text: 'Hello' };
```

---

## API Reference

### createRoutine (Primary) / createDoer / createAction (Deprecated)

```typescript
import { createRoutine, Property } from '@ha-bits/bits';

export const myRoutine = createRoutine({
  // Required
  name: string;                    // Unique identifier (snake_case)
  displayName: string;             // UI display name
  description: string;             // What this routine does
  props: Record<string, Property>; // Input properties
  run: (context: RoutineContext) => Promise<unknown>;

  // Optional
  auth?: PieceAuth;               // Authentication requirement
  capabilities?: Capability[];    // Required capabilities (namespace:action)
  sampleData?: unknown;           // Example output for UI
  errorHandlingOptions?: {        // Error handling config
    continueOnFailure?: boolean;
    retryOnFailure?: boolean;
  };
});

// Deprecated aliases (still work for backward compatibility)
export const createDoer = createRoutine;
export const createAction = createRoutine;
```

### createCue (Primary) / createWatcher / createTrigger (Deprecated)

```typescript
import { createCue, Property, CueStrategy } from '@ha-bits/bits';

export const myCue = createCue({
  // Required
  name: string;                    // Unique identifier (snake_case)
  displayName: string;             // UI display name
  description: string;             // What this cue monitors
  props: Record<string, Property>; // Configuration properties
  type: CueStrategy;               // POLLING | WEBHOOK | APP_WEBHOOK
  run: (context: CueContext) => Promise<unknown[]>;

  // Required for POLLING
  test: (context: CueContext) => Promise<unknown[]>;
  onEnable: (context: CueContext) => Promise<void>;
  onDisable: (context: CueContext) => Promise<void>;

  // Optional
  auth?: PieceAuth;               // Authentication requirement
  capabilities?: Capability[];    // Required capabilities (namespace:action)
  sampleData?: unknown;           // Example output for UI
});

// Deprecated aliases (still work for backward compatibility)
export const createWatcher = createCue;
export const createTrigger = createCue;
```

### Property Types

```typescript
import { Property } from '@ha-bits/bits';

// Text inputs
Property.ShortText({ displayName, description, required, defaultValue })
Property.LongText({ displayName, description, required, defaultValue })

// Numeric
Property.Number({ displayName, description, required, defaultValue })

// Boolean
Property.Checkbox({ displayName, description, required, defaultValue })

// Selection
Property.StaticDropdown({ displayName, description, required, options })
Property.StaticMultiSelectDropdown({ displayName, description, required, options })
Property.DynamicDropdown({ displayName, description, required, refreshers, options })

// Complex types
Property.Json({ displayName, description, required })
Property.Object({ displayName, description, required })
Property.Array({ displayName, description, required })
Property.File({ displayName, description, required })
Property.DateTime({ displayName, description, required })

// Special
Property.Markdown({ value })  // Display-only markdown text
```

### BitAuth Types

```typescript
import { BitAuth } from '@ha-bits/bits';

// Simple API key
BitAuth.SecretText({ displayName, description, required })

// Username/password
BitAuth.BasicAuth({ displayName, description })

// OAuth2
BitAuth.OAuth2({
  displayName,
  description,
  authUrl,
  tokenUrl,
  scope,
})

// Custom auth object
BitAuth.CustomAuth({
  displayName,
  description,
  props: {
    apiKey: Property.SecretText({ ... }),
    subdomain: Property.ShortText({ ... }),
  },
})

// No auth required
BitAuth.None()
```

---

## Using Bits in Habits

Reference bits in your habit YAML just like any other node:

```yaml
# habit: automated-reporting
id: automated-reporting
name: Automated Daily Report

nodes:
  - id: schedule
    type: bit
    data:
      framework: bits
      module: "@ha-bits/bits-schedule"
      operation: cron_schedule
      label: Daily Schedule
      isTrigger: true
      params:
        cronExpression: "0 9 * * 1-5"
        timezone: America/New_York

  - id: fetch-data
    type: bit
    data:
      framework: bits
      module: "@ha-bits/bits-http"
      operation: resilient_http_request
      label: Fetch Metrics
      params:
        url: https://api.example.com/metrics
        method: GET
        retries: 3

  - id: analyze
    type: bit
    data:
      framework: bits
      module: "@ha-bits/bits-python"
      operation: analyze_sentiment
      label: Analyze Sentiment
      params:
        text: "{{fetch-data.data.summary}}"

  - id: notify
    type: bit
    data:
      framework: bits
      module: "@ha-bits/bits-slack"
      operation: send_slack_message
      label: Send to Slack
      params:
        channel: "#reports"
        text: "Daily report: {{analyze.sentiment}}"
      credentials:
        SLACK_BOT_TOKEN: "{{habits.env.SLACK_BOT_TOKEN}}"

edges:
  - source: schedule
    target: fetch-data
  - source: fetch-data
    target: analyze
  - source: analyze
    target: notify
```

<HabitViewer :content="automatedReportingYaml" :hide-controls="true" :fit-view="true" :height="400" />

---

## Best Practices

### 1. Use Descriptive Names
Follow snake_case for `name` and clear display names:
- <Icon name="check-circle" /> `send_slack_message` / "Send Slack Message"
- <Icon name="check-circle" /> `new_github_issue` / "New GitHub Issue"  
- <Icon name="x-circle" /> `slack1` / "Slack"
- <Icon name="x-circle" /> `handler` / "Handler"

### 2. Minimal Capabilities
Request only the capabilities your bit actually needs:
```typescript
// Good - specific capabilities with namespace:action format
capabilities: ['http:request', 'secrets:read']

// Bad - requesting unnecessary capabilities
capabilities: ['http:request', 'http:webhook', 'secrets:read', 'secrets:write', 'fs:read', 'fs:write', 'exec:run', 'cache:read', 'cache:write']
```

### 3. Comprehensive Tests
Every bit must have tests covering:
- <Icon name="check-circle" /> Happy path execution
- <Icon name="check-circle" /> Error handling
- <Icon name="check-circle" /> Edge cases
- <Icon name="check-circle" /> Capability requirements verified
- <Icon name="check-circle" /> All required props validated

### 4. Semantic Versioning
When publishing bit packages, follow semver strictly. Breaking changes require major version bumps.

### 5. Provide Sample Data
Always include realistic `sampleData` for UI testing and user guidance:
```typescript
sampleData: {
  ok: true,
  ts: '1234567890.123456',
  channel: 'C01234567',
  message: { text: 'Hello, world!' },
},
```

---

## Terminology Aliases

The framework has evolved its terminology to better align with the habit loop metaphor. The new primary terms are **Routine** and **Cue**, but deprecated aliases are fully supported for backward compatibility:

| Primary Term | Deprecated Aliases |
|-------------|-------------------|
| `createRoutine` | `createDoer`, `createAction` |
| `createCue` | `createWatcher`, `createTrigger` |
| `routines` | `doers`, `actions` |
| `cues` | `watchers`, `triggers` |
| `CueStrategy` | `WatcherStrategy`, `TriggerStrategy` |

All terms work interchangeably:

```typescript
// New primary terms (recommended)
import { createRoutine } from '@ha-bits/bits';
import { createCue } from '@ha-bits/bits';

// Deprecated aliases (still supported)
import { createDoer, createAction } from '@ha-bits/bits';
import { createWatcher, createTrigger } from '@ha-bits/bits';
```

<script setup>
import automatedReportingYaml from '../../showcase/docs/automated-reporting/habit.yaml?raw'
</script>

