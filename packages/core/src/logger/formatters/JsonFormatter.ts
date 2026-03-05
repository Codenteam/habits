/**
 * JSON formatter for structured log output
 * Outputs NDJSON (newline-delimited JSON) format suitable for log aggregation
 */

import { Formatter } from './Formatter';
import { LogEntry } from '../types';

export interface JsonFormatterOptions {
  /** Include stack trace for error objects in data */
  includeStackTrace?: boolean;
  /** Pretty print JSON (adds indentation) - not recommended for production */
  prettyPrint?: boolean;
}

export class JsonFormatter extends Formatter {
  private includeStackTrace: boolean;
  private prettyPrint: boolean;

  constructor(options: JsonFormatterOptions = {}) {
    super();
    this.includeStackTrace = options.includeStackTrace ?? true;
    this.prettyPrint = options.prettyPrint ?? false;
  }

  format(entry: LogEntry): string {
    const output: Record<string, unknown> = {
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      message: entry.message,
    };

    // Add context fields if present
    if (entry.context.workflowId) output.workflowId = entry.context.workflowId;
    if (entry.context.nodeId) output.nodeId = entry.context.nodeId;
    if (entry.context.bitName) output.bitName = entry.context.bitName;
    if (entry.context.actionName) output.actionName = entry.context.actionName;
    if (entry.context.executionId) output.executionId = entry.context.executionId;

    // Add data if present, handling Error objects specially
    if (entry.data && Object.keys(entry.data).length > 0) {
      output.data = this.serializeData(entry.data);
    }

    return this.prettyPrint 
      ? JSON.stringify(output, null, 2) 
      : JSON.stringify(output);
  }

  private serializeData(data: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Error) {
        result[key] = {
          name: value.name,
          message: value.message,
          ...(this.includeStackTrace && value.stack ? { stack: value.stack } : {}),
        };
      } else if (value !== undefined) {
        result[key] = value;
      }
    }
    
    return result;
  }
}
