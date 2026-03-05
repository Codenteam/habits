/**
 * JSON transport - writes NDJSON (newline-delimited JSON) to a stream
 * Useful for log aggregation systems like ELK, Datadog, etc.
 */

import { Transport } from './Transport';
import { LogEntry } from '../types';
import { JsonFormatter } from '../formatters/JsonFormatter';

export interface JsonTransportOptions {
  /** Writable stream to output to. Default: process.stdout */
  stream?: NodeJS.WritableStream;
}

export class JsonTransport extends Transport {
  private stream: NodeJS.WritableStream;

  constructor(options: JsonTransportOptions = {}) {
    // Always use JsonFormatter for this transport
    super(new JsonFormatter());
    this.stream = options.stream || process.stdout;
  }

  log(entry: LogEntry): void {
    const formatted = this.formatter.format(entry);
    this.stream.write(formatted + '\n');
  }

  async flush(): Promise<void> {
    return new Promise((resolve) => {
      const writable = this.stream as NodeJS.WriteStream;
      if (writable.writableLength === 0) {
        resolve();
      } else {
        writable.once('drain', () => resolve());
      }
    });
  }

  async close(): Promise<void> {
    await this.flush();
    // Don't close process.stdout/stderr
    if (this.stream !== process.stdout && this.stream !== process.stderr) {
      return new Promise((resolve) => {
        (this.stream as any).end?.(() => resolve()) || resolve();
      });
    }
  }

  /**
   * Get the output stream
   */
  getStream(): NodeJS.WritableStream {
    return this.stream;
  }
}
