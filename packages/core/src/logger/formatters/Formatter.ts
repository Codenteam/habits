/**
 * Abstract base class for log formatters
 * Formatters transform LogEntry objects into string representations
 */

import { LogEntry } from '../types';

export abstract class Formatter {
  /**
   * Format a log entry into a string
   * @param entry The log entry to format
   * @returns Formatted string representation
   */
  abstract format(entry: LogEntry): string;
}
