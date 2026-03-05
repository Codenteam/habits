/**
 * LoggerFactory - Factory for creating configured logger instances
 * 
 * Handles:
 * - Creating loggers from merged configuration sources
 * - Managing the root logger singleton
 * - Creating child loggers for specific bits/workflows
 * - Building appropriate transports based on configuration
 */

import { Logger, NullLogger } from './Logger';
import { 
  LoggerConfig, 
  OutputConfig, 
  LogContext, 
  ILogger,
  HabitLoggingConfig,
  StackLoggingConfig 
} from './types';
import { ConfigResolver } from './ConfigResolver';
import { Transport } from './transports/Transport';
import { ConsoleTransport } from './transports/ConsoleTransport';
import { FileTransport } from './transports/FileTransport';
import { JsonTransport } from './transports/JsonTransport';
import { TextFormatter } from './formatters/TextFormatter';
import { JsonFormatter } from './formatters/JsonFormatter';
import { Formatter } from './formatters/Formatter';

/**
 * Global root logger instance
 */
let rootLogger: Logger | null = null;

export class LoggerFactory {
  /**
   * Create a new logger from configuration sources
   * 
   * @param habitConfig - Per-workflow logging config from habit.yaml
   * @param stackConfig - Stack-level logging config from stack.yaml
   * @param context - Initial context for this logger
   * @returns Configured logger instance
   */
  static create(
    habitConfig?: HabitLoggingConfig,
    stackConfig?: StackLoggingConfig,
    context?: LogContext
  ): ILogger {
    const config = ConfigResolver.resolve(
      habitConfig,
      stackConfig,
      process.env
    );

    const transports = this.createTransports(config);
    
    return new Logger({
      config,
      transports,
      context,
    });
  }

  /**
   * Create a logger directly from a LoggerConfig
   */
  static createFromConfig(config: LoggerConfig, context?: LogContext): ILogger {
    const transports = this.createTransports(config);
    return new Logger({ config, transports, context });
  }

  /**
   * Initialize the root logger (called once at server startup)
   * 
   * @param stackConfig - Stack-level logging configuration
   * @returns The root logger instance
   */
  static initRoot(stackConfig?: StackLoggingConfig): ILogger {
    if (rootLogger) {
      // Close existing root logger
      rootLogger.close().catch(() => {});
    }

    rootLogger = this.create(undefined, stackConfig) as Logger;
    return rootLogger;
  }

  /**
   * Get the current root logger, or create a default one
   */
  static getRoot(): ILogger {
    if (!rootLogger) {
      rootLogger = this.create() as Logger;
    }
    return rootLogger;
  }

  /**
   * Create a child logger for a specific bit execution
   * Inherits from the root logger with bit-specific context
   * 
   * @param bitName - Name of the bit (e.g., 'bit-http')
   * @param actionName - Name of the action being executed
   * @param workflowId - ID of the workflow
   * @param nodeId - ID of the current node
   * @param executionId - Unique execution ID
   */
  static forBit(
    bitName: string,
    actionName: string,
    workflowId?: string,
    nodeId?: string,
    executionId?: string
  ): ILogger {
    const root = this.getRoot();
    
    return root.child({
      bitName,
      actionName,
      workflowId,
      nodeId,
      executionId,
    });
  }

  /**
   * Create a child logger for workflow execution
   */
  static forWorkflow(workflowId: string, executionId?: string): ILogger {
    const root = this.getRoot();
    
    return root.child({
      workflowId,
      executionId,
    });
  }

  /**
   * Create a null logger that discards all messages
   * Useful for testing or when logging should be disabled
   */
  static createNull(): ILogger {
    return new NullLogger();
  }

  /**
   * Shutdown the root logger and release resources
   */
  static async shutdown(): Promise<void> {
    if (rootLogger) {
      await rootLogger.close();
      rootLogger = null;
    }
  }

  // ---------- Internal methods ----------

  /**
   * Create transports based on configuration
   */
  private static createTransports(config: LoggerConfig): Transport[] {
    return config.outputs.map(output => this.createTransport(output));
  }

  /**
   * Create a single transport from output configuration
   */
  private static createTransport(output: OutputConfig): Transport {
    switch (output.type) {
      case 'file':
        return new FileTransport(
          this.createFormatter(output.format || 'text'),
          {
            path: output.path,
            maxSize: ConfigResolver.parseSize(output.maxSize),
            maxFiles: output.maxFiles,
          }
        );

      case 'json':
        return new JsonTransport({
          stream: output.stream,
        });

      case 'console':
      default:
        return new ConsoleTransport(
          this.createFormatter(output.format || 'text'),
          { colorize: output.colorize }
        );
    }
  }

  /**
   * Create a formatter based on format type
   */
  private static createFormatter(format: 'text' | 'json'): Formatter {
    return format === 'json' 
      ? new JsonFormatter() 
      : new TextFormatter();
  }
}
