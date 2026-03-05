/**
 * File transport - writes logs to a file with rotation support
 */

import * as fs from 'fs';
import * as path from 'path';
import { Transport } from './Transport';
import { LogEntry } from '../types';
import { Formatter } from '../formatters/Formatter';

export interface FileTransportOptions {
  /** Path to the log file */
  path: string;
  /** Maximum file size in bytes before rotation. Default: 10MB */
  maxSize?: number;
  /** Maximum number of rotated files to keep. Default: 5 */
  maxFiles?: number;
  /** File mode (permissions). Default: 0o644 */
  mode?: number;
}

export class FileTransport extends Transport {
  private filePath: string;
  private maxSize: number;
  private maxFiles: number;
  private mode: number;
  private stream: fs.WriteStream | null = null;
  private currentSize: number = 0;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(formatter: Formatter, options: FileTransportOptions) {
    super(formatter);
    this.filePath = path.resolve(options.path);
    this.maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
    this.maxFiles = options.maxFiles || 5;
    this.mode = options.mode || 0o644;
    this.initStream();
  }

  private initStream(): void {
    // Ensure directory exists
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Get current file size if file exists
    if (fs.existsSync(this.filePath)) {
      try {
        this.currentSize = fs.statSync(this.filePath).size;
      } catch {
        this.currentSize = 0;
      }
    }

    // Create write stream in append mode
    this.stream = fs.createWriteStream(this.filePath, {
      flags: 'a',
      mode: this.mode,
      encoding: 'utf8',
    });

    // Handle stream errors
    this.stream.on('error', (err) => {
      console.error(`[Logger] File transport error: ${err.message}`);
    });
  }

  private async rotate(): Promise<void> {
    if (!this.stream) return;

    // Close current stream
    await new Promise<void>((resolve) => {
      this.stream?.end(() => resolve());
    });
    this.stream = null;

    // Rotate existing files: .log.4 -> .log.5, .log.3 -> .log.4, etc.
    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const oldPath = `${this.filePath}.${i}`;
      const newPath = `${this.filePath}.${i + 1}`;

      if (fs.existsSync(oldPath)) {
        if (i === this.maxFiles - 1) {
          // Delete oldest file
          try {
            fs.unlinkSync(oldPath);
          } catch {
            // Ignore deletion errors
          }
        } else {
          // Rename to next number
          try {
            fs.renameSync(oldPath, newPath);
          } catch {
            // Ignore rename errors
          }
        }
      }
    }

    // Rename current file to .1
    try {
      fs.renameSync(this.filePath, `${this.filePath}.1`);
    } catch {
      // If rename fails, we'll just append to the file
    }

    // Reset size and create new stream
    this.currentSize = 0;
    this.initStream();
  }

  log(entry: LogEntry): void {
    const formatted = this.formatter.format(entry) + '\n';
    const bytes = Buffer.byteLength(formatted, 'utf8');

    // Queue the write to ensure sequential execution
    this.writeQueue = this.writeQueue.then(async () => {
      // Check if rotation needed
      if (this.currentSize + bytes > this.maxSize) {
        await this.rotate();
      }

      // Write to stream
      if (this.stream && !this.stream.destroyed) {
        this.stream.write(formatted);
        this.currentSize += bytes;
      }
    });
  }

  async flush(): Promise<void> {
    // Wait for write queue to complete
    await this.writeQueue;

    // Ensure stream is drained
    return new Promise((resolve) => {
      if (!this.stream || this.stream.writableLength === 0) {
        resolve();
      } else {
        this.stream.once('drain', () => resolve());
      }
    });
  }

  async close(): Promise<void> {
    await this.flush();
    
    return new Promise((resolve) => {
      if (!this.stream) {
        resolve();
        return;
      }

      this.stream.end(() => {
        this.stream = null;
        resolve();
      });
    });
  }

  /**
   * Get the current log file path
   */
  getFilePath(): string {
    return this.filePath;
  }

  /**
   * Get the current file size
   */
  getCurrentSize(): number {
    return this.currentSize;
  }
}
