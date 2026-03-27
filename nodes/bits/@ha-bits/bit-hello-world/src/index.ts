/**
 * @ha-bits/bit-hello-world
 * 
 * A simple hello world bit for demonstration and testing.
 * Returns "hello there" if param1="hello" and param2="world", otherwise "Nah!"
 * 
 * Demonstrates stub usage: Uses `to-constant-case` for text transformation.
 * In browser bundles, the stub appends "stub" instead of converting.
 */

import toConstantCase = require('to-constant-case');
import * as fs from 'fs';

// ============================================================================
// Types
// ============================================================================

interface HelloWorldContext {
  propsValue: {
    param1: string;
    param2: string;
  };
}

interface PollingStore {
  hasSeenItem: (itemId: string) => Promise<boolean>;
  markItemSeen: (itemId: string, sourceDate: string) => Promise<void>;
  getLastPolledDate: () => Promise<string | null>;
  setLastPolledDate: (date: string) => Promise<void>;
}

interface FileWatcherContext {
  propsValue: {
    filePath?: string;
    cronExpression?: string;
  };
  pollingStore?: PollingStore;
  setSchedule?: (options: { cronExpression: string; timezone?: string }) => void;
}

const helloWorldBit = {
  displayName: 'Hello World',
  description: 'A simple demonstration bit that greets the world',
  logoUrl: 'lucide:Hand',
  
  actions: {
    /**
     * Greet action - returns greeting based on input parameters
     */
    greet: {
      name: 'greet',
      displayName: 'Greet',
      description: 'Returns "hello there" if param1="hello" and param2="world", otherwise "Nah!"',
      props: {
        param1: {
          type: 'SHORT_TEXT',
          displayName: 'Parameter 1',
          description: 'First parameter (use "hello" for greeting)',
          required: true,
        },
        param2: {
          type: 'SHORT_TEXT',
          displayName: 'Parameter 2',
          description: 'Second parameter (use "world" for greeting)',
          required: true,
        },
      },
      async run(context: HelloWorldContext) {
        const { param1, param2 } = context.propsValue;
        const greeting = toConstantCase('hello there');
        
        if (param1 === 'hello' && param2 === 'world') {
          return greeting;
        }
        
        return 'Nah!';
      },
    },
  },

  // Empty triggers
  triggers: {
    /**
     * File Watcher Polling Trigger
     * Watches a text file for new lines, triggers for each new line added.
     */
    newLines: {
      name: 'newLines',
      displayName: 'New Lines in File',
      description: 'Polls a text file for new lines. Returns each new line as a separate trigger event.',
      type: 'POLLING',
      props: {
        filePath: {
          type: 'SHORT_TEXT',
          displayName: 'File Path',
          description: 'Path to the text file to watch (default: /tmp/hello-world.trigger.txt)',
          required: false,
          defaultValue: '/tmp/hello-world.trigger.txt',
        },
        cronExpression: {
          type: 'SHORT_TEXT',
          displayName: 'Poll Interval',
          description: 'Cron expression for polling (default: every 10 seconds)',
          required: false,
          defaultValue: '*/10 * * * * *',
        },
      },

      async onEnable(context: FileWatcherContext): Promise<void> {
        const { cronExpression = '*/10 * * * * *' } = context.propsValue;
        context.setSchedule?.({ cronExpression });
      },

      async onDisable(_context: FileWatcherContext): Promise<void> {
        // Server handles stopping cron jobs
      },

      async run(context: FileWatcherContext): Promise<any[]> {
        const filePath = context.propsValue.filePath || '/tmp/hello-world.trigger.txt';
        // Use the pollingStore which persists across requests (via SQLite or in-memory fallback)
        const pollingStore = context.pollingStore;

        // Check if file exists
        if (!fs.existsSync(filePath)) {
          console.log(`📄 File not found: ${filePath}`);
          return [];
        }

        // Read all lines from file
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim().length > 0);

        console.log(`📄 Found ${lines.length} line(s) in ${filePath}`);

        // Get previously seen line count from store
        const seenCountStr = pollingStore ? (await pollingStore.getLastPolledDate()) : null;
        const seenCount: number = seenCountStr ? parseInt(seenCountStr, 10) : 0;
        console.log(`📄 Previously seen ${seenCount} line(s)`);

        const newLines: any[] = [];
        const now = new Date().toISOString();

        // Only return lines we haven't seen before (by index)
        for (let i = seenCount; i < lines.length; i++) {
          const line = lines[i].trim();

          newLines.push({
            lineNumber: i + 1,
            content: line,
            filePath,
            timestamp: now,
          });
        }

        // Update seen count in store using lastPolledDate as the count
        if (pollingStore && lines.length > seenCount) {
          await pollingStore.setLastPolledDate(String(lines.length));
        }

        console.log(`📄 Returning ${newLines.length} new line(s)`);
        return newLines;
      },
    },
  },
};

export const helloWorld = helloWorldBit;
export default helloWorldBit;
