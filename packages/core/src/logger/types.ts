/**
 * Habits Logger - Type Definitions
 * 
 * A multilevel logging system with hierarchical config resolution:
 * .env (highest) > stack.yaml > habit.yaml > defaults (lowest)
 */

/**
 * Log levels ordered by severity (trace=0 is most verbose, fatal=5 is most severe)
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'none';

/**
 * Priority map for log level comparison
 * Lower number = more verbose, higher number = more severe
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
  none: 6, // Disables all logging
};

/**
 * A single log entry with all metadata
 */
export interface LogEntry {
  /** When the log was created */
  timestamp: Date;
  /** Severity level */
  level: LogLevel;
  /** The log message */
  message: string;
  /** Contextual information about where this log originated */
  context: LogContext;
  /** Optional structured data to include with the log */
  data?: Record<string, unknown>;
}

/**
 * Context information attached to each log entry
 * Enables filtering and tracing across workflows and bits
 */
export interface LogContext {
  /** ID of the workflow being executed */
  workflowId?: string;
  /** ID of the current node in the workflow */
  nodeId?: string;
  /** Name of the bit (e.g., 'bit-http', 'bit-openai') */
  bitName?: string;
  /** Name of the action within the bit */
  actionName?: string;
  /** Unique ID for this execution instance */
  executionId?: string;
}

/**
 * Configuration for console output
 */
export interface ConsoleOutputConfig {
  type: 'console';
  /** Enable ANSI colors in output (auto-detected if not specified) */
  colorize?: boolean;
  /** Output format */
  format?: 'text' | 'json';
}

/**
 * Configuration for file output with rotation support
 */
export interface FileOutputConfig {
  type: 'file';
  /** Path to the log file */
  path: string;
  /** Maximum file size before rotation (e.g., '10mb', '1gb') */
  maxSize?: string;
  /** Maximum number of rotated files to keep */
  maxFiles?: number;
  /** Output format */
  format?: 'text' | 'json';
}

/**
 * Configuration for JSON output (NDJSON format)
 */
export interface JsonOutputConfig {
  type: 'json';
  /** Custom writable stream (defaults to stdout) */
  stream?: NodeJS.WritableStream;
}

/**
 * Union type for all output configurations
 */
export type OutputConfig = ConsoleOutputConfig | FileOutputConfig | JsonOutputConfig;

/**
 * Complete logger configuration
 */
export interface LoggerConfig {
  /** Default log level for all loggers */
  level: LogLevel;
  /** Output destinations */
  outputs: OutputConfig[];
  /** Per-bit log level overrides (e.g., { 'bit-http': 'debug' }) */
  bitOverrides?: Record<string, LogLevel>;
}

/**
 * Logger interface that all logger implementations must satisfy
 */
export interface ILogger {
  /** Alias for info() - for console.log compatibility */
  log(message: string, data?: Record<string, unknown>): void;
  /** Log at trace level (most verbose, for detailed debugging) */
  trace(message: string, data?: Record<string, unknown>): void;
  /** Log at debug level (debugging information) */
  debug(message: string, data?: Record<string, unknown>): void;
  /** Log at info level (general information) */
  info(message: string, data?: Record<string, unknown>): void;
  /** Log at warn level (warnings, potential issues) */
  warn(message: string, data?: Record<string, unknown>): void;
  /** Log at error level (errors, failures) */
  error(message: string, data?: Record<string, unknown>): void;
  /** Log at fatal level (critical errors, system failures) */
  fatal(message: string, data?: Record<string, unknown>): void;
  
  /** Create a child logger with additional context */
  child(context: Partial<LogContext>): ILogger;
  
  /** Dynamically change the log level */
  setLevel(level: LogLevel): void;
  /** Get the current log level */
  getLevel(): LogLevel;
}

/**
 * Logging configuration as it appears in habit.yaml
 */
export interface HabitLoggingConfig {
  level?: LogLevel;
  outputs?: ('console' | 'file' | 'json')[];
  bitOverrides?: Record<string, LogLevel>;
}

/**
 * Logging configuration as it appears in stack.yaml
 * Extends habit config with additional server-level options
 */
export interface StackLoggingConfig extends HabitLoggingConfig {
  file?: {
    path?: string;
    maxSize?: string;
    maxFiles?: number;
  };
  format?: 'text' | 'json';
  colorize?: boolean;
}

/**
 * Environment variable names for logging configuration
 */
export const LOG_ENV_VARS = {
  /** Global log level override */
  LEVEL: 'HABITS_LOG_LEVEL',
  /** Comma-separated output types (console,file,json) */
  OUTPUT: 'HABITS_LOG_OUTPUT',
  /** File output path */
  FILE_PATH: 'HABITS_LOG_FILE_PATH',
  /** File max size */
  FILE_MAX_SIZE: 'HABITS_LOG_FILE_MAX_SIZE',
  /** File max rotation count */
  FILE_MAX_FILES: 'HABITS_LOG_FILE_MAX_FILES',
  /** Enable/disable colors */
  COLORIZE: 'HABITS_LOG_COLORIZE',
  /** Output format */
  FORMAT: 'HABITS_LOG_FORMAT',
  /** Pattern for per-bit level overrides: HABITS_LOG_BIT_{BITNAME}_LEVEL */
  BIT_LEVEL_PATTERN: /^HABITS_LOG_BIT_(.+)_LEVEL$/,
} as const;
