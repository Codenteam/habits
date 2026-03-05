/**
 * Habits Logger Module
 * 
 * A multilevel, OOP-based logging system with:
 * - 6 log levels: trace, debug, info, warn, error, fatal
 * - Multiple outputs: console, file, JSON
 * - Hierarchical config: .env > stack.yaml > habit.yaml
 * - Per-bit log level overrides
 * - Child loggers with inherited config
 * 
 * @example
 * ```typescript
 * import { LoggerFactory, ILogger } from '@habits/core/logger';
 * 
 * // Initialize root logger from stack config
 * const logger = LoggerFactory.initRoot(stackConfig.logging);
 * 
 * // Create child logger for a bit
 * const bitLogger = logger.child({ bitName: 'bit-http', actionName: 'request' });
 * 
 * // Log messages
 * bitLogger.info('Request started', { url: 'https://api.example.com' });
 * bitLogger.debug('Request headers', { headers });
 * bitLogger.error('Request failed', { error: err.message });
 * ```
 */

// Types
export type {
  LogLevel,
  LogEntry,
  LogContext,
  LoggerConfig,
  OutputConfig,
  ConsoleOutputConfig,
  FileOutputConfig,
  JsonOutputConfig,
  ILogger,
  HabitLoggingConfig,
  StackLoggingConfig,
} from './types';

// Constants
export {
  LOG_LEVEL_PRIORITY,
  LOG_ENV_VARS,
} from './types';

// Core classes
export { Logger, NullLogger } from './Logger';
export { LoggerFactory } from './LoggerFactory';
export { ConfigResolver } from './ConfigResolver';

// Formatters
export { Formatter } from './formatters/Formatter';
export { TextFormatter } from './formatters/TextFormatter';
export { JsonFormatter } from './formatters/JsonFormatter';

// Transports
export { Transport } from './transports/Transport';
export { ConsoleTransport } from './transports/ConsoleTransport';
export { FileTransport } from './transports/FileTransport';
export { JsonTransport } from './transports/JsonTransport';
