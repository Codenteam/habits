/**
 * Abstract base class for log transports
 * Transports are responsible for delivering formatted log entries to their destination
 */

import { LogEntry } from '../types';
import { Formatter } from '../formatters/Formatter';

export abstract class Transport {
  protected formatter: Formatter;

  constructor(formatter: Formatter) {
    this.formatter = formatter;
  }

  /**
   * Log an entry to this transport's destination
   * @param entry The log entry to write
   */
  abstract log(entry: LogEntry): void;

  /**
   * Flush any buffered output
   * @returns Promise that resolves when flush is complete
   */
  abstract flush(): Promise<void>;

  /**
   * Close the transport and release resources
   * @returns Promise that resolves when closed
   */
  abstract close(): Promise<void>;

  /**
   * Replace the formatter used by this transport
   * @param formatter New formatter to use
   */
  setFormatter(formatter: Formatter): void {
    this.formatter = formatter;
  }

  /**
   * Get the current formatter
   */
  getFormatter(): Formatter {
    return this.formatter;
  }
}
