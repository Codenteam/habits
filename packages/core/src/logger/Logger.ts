/**
 * Logger - Main logger class
 * 
 * A hierarchical, OOP-based logger with support for:
 * - 6 log levels (trace, debug, info, warn, error, fatal)
 * - Multiple transports (console, file, JSON)
 * - Per-bit log level overrides
 * - Child loggers with inherited configuration
 */

import { 
  ILogger, 
  LogLevel, 
  LogEntry, 
  LogContext, 
  LoggerConfig,
  LOG_LEVEL_PRIORITY 
} from './types';
import { Transport } from './transports/Transport';

export interface LoggerOptions {
  /** Logger configuration */
  config: LoggerConfig;
  /** Transports to output to */
  transports: Transport[];
  /** Initial context */
  context?: LogContext;
}

export class Logger implements ILogger {
  private level: LogLevel;
  private context: LogContext;
  private transports: Transport[];
  private bitOverrides: Record<string, LogLevel>;
  private closed: boolean = false;

  constructor(options: LoggerOptions) {
    this.level = options.config.level;
    this.transports = options.transports;
    this.context = options.context || {};
    this.bitOverrides = options.config.bitOverrides || {};
  }

  /**
   * Determine if a message at the given level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    if (this.closed) return false;
    const effectiveLevel = this.getEffectiveLevel();
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[effectiveLevel];
  }

  /**
   * Get the effective log level, accounting for bit-specific overrides
   */
  private getEffectiveLevel(): LogLevel {
    // Check for bit-specific override
    if (this.context.bitName) {
      const override = this.bitOverrides[this.context.bitName];
      if (override) return override;
    }
    return this.level;
  }

  /**
   * Core logging method - routes to all transports
   */
  private logInternal(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: { ...this.context },
      data,
    };

    for (const transport of this.transports) {
      try {
        transport.log(entry);
      } catch (err) {
        // Don't let transport errors break the application
        console.error(`[Logger] Transport error: ${err}`);
      }
    }
  }

  // ---------- Public logging methods ----------

  /** Alias for info() - for console.log compatibility */
  log(message: string, data?: Record<string, unknown>): void {
    this.logInternal('info', message, data);
  }

  trace(message: string, data?: Record<string, unknown>): void {
    this.logInternal('trace', message, data);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.logInternal('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.logInternal('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.logInternal('warn', message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.logInternal('error', message, data);
  }

  fatal(message: string, data?: Record<string, unknown>): void {
    this.logInternal('fatal', message, data);
  }

  // ---------- Configuration methods ----------

  /**
   * Create a child logger that inherits this logger's configuration
   * but with additional context fields
   */
  child(additionalContext: Partial<LogContext>): ILogger {
    return new Logger({
      config: {
        level: this.level,
        outputs: [],
        bitOverrides: this.bitOverrides,
      },
      transports: this.transports, // Share transports with parent
      context: { ...this.context, ...additionalContext },
    });
  }

  /**
   * Dynamically change the log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get the current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Get the current context
   */
  getContext(): LogContext {
    return { ...this.context };
  }

  /**
   * Update context fields
   */
  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Set a bit-specific log level override
   */
  setBitOverride(bitName: string, level: LogLevel): void {
    this.bitOverrides[bitName] = level;
  }

  /**
   * Remove a bit-specific log level override
   */
  removeBitOverride(bitName: string): void {
    delete this.bitOverrides[bitName];
  }

  /**
   * Get all bit overrides
   */
  getBitOverrides(): Record<string, LogLevel> {
    return { ...this.bitOverrides };
  }

  // ---------- Lifecycle methods ----------

  /**
   * Flush all transports
   */
  async flush(): Promise<void> {
    await Promise.all(this.transports.map(t => t.flush()));
  }

  /**
   * Close all transports and prevent further logging
   */
  async close(): Promise<void> {
    this.closed = true;
    await Promise.all(this.transports.map(t => t.close()));
  }

  /**
   * Check if the logger is closed
   */
  isClosed(): boolean {
    return this.closed;
  }
}

/**
 * No-op logger that discards all log messages
 * Useful for testing or when logging should be disabled
 */
export class NullLogger implements ILogger {
  log(_message: string, _data?: Record<string, unknown>): void {}
  trace(_message: string, _data?: Record<string, unknown>): void {}
  debug(_message: string, _data?: Record<string, unknown>): void {}
  info(_message: string, _data?: Record<string, unknown>): void {}
  warn(_message: string, _data?: Record<string, unknown>): void {}
  error(_message: string, _data?: Record<string, unknown>): void {}
  fatal(_message: string, _data?: Record<string, unknown>): void {}
  child(_context: Partial<LogContext>): ILogger { return this; }
  setLevel(_level: LogLevel): void {}
  getLevel(): LogLevel { return 'none'; }
}
