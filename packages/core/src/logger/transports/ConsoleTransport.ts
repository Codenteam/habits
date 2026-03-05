/**
 * Console transport - writes logs to stdout/stderr with optional colors
 */

import { Transport } from './Transport';
import { LogEntry, LogLevel } from '../types';
import { Formatter } from '../formatters/Formatter';

/**
 * ANSI color codes for each log level
 */
const LEVEL_COLORS: Record<LogLevel, string> = {
  trace: '\x1b[90m',   // Gray
  debug: '\x1b[36m',   // Cyan
  info: '\x1b[32m',    // Green
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m',   // Red
  fatal: '\x1b[35m',   // Magenta (bold)
  none: '',
};

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

export interface ConsoleTransportOptions {
  /** Enable ANSI color codes. Auto-detected from TTY if not specified */
  colorize?: boolean;
  /** Use stderr for error and fatal levels. Default: true */
  useStderr?: boolean;
}

export class ConsoleTransport extends Transport {
  private colorize: boolean;
  private useStderr: boolean;

  constructor(formatter: Formatter, options: ConsoleTransportOptions = {}) {
    super(formatter);
    // Auto-detect TTY for colorize if not explicitly set
    this.colorize = options.colorize ?? (process.stdout.isTTY ?? false);
    this.useStderr = options.useStderr ?? true;
  }

  log(entry: LogEntry): void {
    const formatted = this.formatter.format(entry);
    let output: string;

    if (this.colorize) {
      const color = LEVEL_COLORS[entry.level];
      const bold = entry.level === 'fatal' ? BOLD : '';
      output = `${bold}${color}${formatted}${RESET}`;
    } else {
      output = formatted;
    }

    // Route error/fatal to stderr
    const stream = this.useStderr && (entry.level === 'error' || entry.level === 'fatal')
      ? process.stderr
      : process.stdout;

    stream.write(output + '\n');
  }

  async flush(): Promise<void> {
    // Console is synchronous, but we handle any pending writes
    return new Promise((resolve) => {
      if (process.stdout.writableLength === 0 && process.stderr.writableLength === 0) {
        resolve();
      } else {
        // Wait for drain event
        const checkDrain = () => {
          if (process.stdout.writableLength === 0 && process.stderr.writableLength === 0) {
            resolve();
          } else {
            setImmediate(checkDrain);
          }
        };
        checkDrain();
      }
    });
  }

  async close(): Promise<void> {
    await this.flush();
    // Nothing to close for console
  }

  /**
   * Enable or disable colorization at runtime
   */
  setColorize(enabled: boolean): void {
    this.colorize = enabled;
  }

  /**
   * Check if colorization is enabled
   */
  isColorized(): boolean {
    return this.colorize;
  }
}
