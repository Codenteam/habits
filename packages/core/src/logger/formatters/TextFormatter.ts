/**
 * Text formatter for human-readable log output
 * 
 * Output format: [timestamp] [LEVEL] [context] message {data}
 * Example: [2026-02-15T10:30:00.123Z] [INFO ] [wf:my-workflow/bit-http] Request completed {"status":200}
 */

import { Formatter } from './Formatter';
import { LogEntry, LogContext } from '../types';

export interface TextFormatterOptions {
  /** Timestamp format: 'iso' (full), 'unix' (milliseconds), 'short' (time only) */
  timestampFormat?: 'iso' | 'unix' | 'short';
  /** Include milliseconds in short format */
  includeMs?: boolean;
}

export class TextFormatter extends Formatter {
  private timestampFormat: 'iso' | 'unix' | 'short';
  private includeMs: boolean;

  constructor(options: TextFormatterOptions = {}) {
    super();
    this.timestampFormat = options.timestampFormat || 'iso';
    this.includeMs = options.includeMs ?? true;
  }

  format(entry: LogEntry): string {
    const ts = this.formatTimestamp(entry.timestamp);
    const level = entry.level.toUpperCase().padEnd(5);
    const ctx = this.formatContext(entry.context);
    const data = entry.data && Object.keys(entry.data).length > 0 
      ? ` ${JSON.stringify(entry.data)}` 
      : '';
    
    return `[${ts}] [${level}]${ctx} ${entry.message}${data}`;
  }

  private formatTimestamp(date: Date): string {
    switch (this.timestampFormat) {
      case 'unix':
        return String(date.getTime());
      case 'short':
        // HH:MM:SS.mmm or HH:MM:SS
        const time = date.toISOString().slice(11, this.includeMs ? 23 : 19);
        return time;
      case 'iso':
      default:
        return date.toISOString();
    }
  }

  private formatContext(ctx: LogContext): string {
    const parts: string[] = [];
    
    if (ctx.workflowId) {
      parts.push(`wf:${ctx.workflowId}`);
    }
    if (ctx.nodeId) {
      parts.push(`node:${ctx.nodeId}`);
    }
    if (ctx.bitName) {
      parts.push(ctx.bitName);
    }
    if (ctx.actionName) {
      parts.push(ctx.actionName);
    }
    if (ctx.executionId) {
      parts.push(`exec:${ctx.executionId.slice(0, 8)}`);
    }
    
    return parts.length > 0 ? ` [${parts.join('/')}]` : '';
  }
}
