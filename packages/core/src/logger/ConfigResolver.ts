/**
 * ConfigResolver - Resolves logger configuration from multiple sources
 * 
 * Priority (highest to lowest):
 * 1. Environment variables (.env)
 * 2. Stack configuration (stack.yaml)
 * 3. Habit configuration (habit.yaml)
 * 4. Default values
 */

import { 
  LoggerConfig, 
  LogLevel, 
  OutputConfig,
  HabitLoggingConfig,
  StackLoggingConfig,
  LOG_ENV_VARS,
  LOG_LEVEL_PRIORITY
} from './types';

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: 'info',
  outputs: [{ type: 'console', colorize: true, format: 'text' }],
  bitOverrides: {},
};

/**
 * Valid log levels for validation
 */
const VALID_LOG_LEVELS = new Set<LogLevel>(Object.keys(LOG_LEVEL_PRIORITY) as LogLevel[]);

export class ConfigResolver {
  /**
   * Resolve logger configuration from all sources
   * 
   * @param habitConfig - Configuration from habit.yaml (lowest priority)
   * @param stackConfig - Configuration from stack.yaml
   * @param env - Environment variables (highest priority)
   * @returns Merged LoggerConfig
   */
  static resolve(
    habitConfig?: HabitLoggingConfig,
    stackConfig?: StackLoggingConfig,
    env: Record<string, string | undefined> = process.env
  ): LoggerConfig {
    // Start with defaults
    let config: LoggerConfig = this.deepClone(DEFAULT_CONFIG);

    // Layer 1: Apply habit.yaml config
    if (habitConfig) {
      config = this.mergeHabitConfig(config, habitConfig);
    }

    // Layer 2: Apply stack.yaml config (overrides habit)
    if (stackConfig) {
      config = this.mergeStackConfig(config, stackConfig);
    }

    // Layer 3: Apply environment variables (highest priority)
    config = this.applyEnvOverrides(config, env);

    return config;
  }

  /**
   * Merge habit-level config into base config
   */
  private static mergeHabitConfig(
    base: LoggerConfig,
    habit: HabitLoggingConfig
  ): LoggerConfig {
    const result = this.deepClone(base);

    if (habit.level && this.isValidLogLevel(habit.level)) {
      result.level = habit.level;
    }

    if (habit.outputs && Array.isArray(habit.outputs)) {
      result.outputs = habit.outputs
        .filter(o => ['console', 'file', 'json'].includes(o))
        .map(o => this.createOutputConfig(o));
    }

    if (habit.bitOverrides) {
      result.bitOverrides = {
        ...result.bitOverrides,
        ...this.filterValidBitOverrides(habit.bitOverrides),
      };
    }

    return result;
  }

  /**
   * Merge stack-level config into base config
   */
  private static mergeStackConfig(
    base: LoggerConfig,
    stack: StackLoggingConfig
  ): LoggerConfig {
    let result = this.mergeHabitConfig(base, stack);

    // Handle file configuration
    if (stack.file?.path) {
      const fileOutput: OutputConfig = {
        type: 'file',
        path: stack.file.path,
        maxSize: stack.file.maxSize,
        maxFiles: stack.file.maxFiles,
        format: stack.format,
      };

      // Add file output if not already present
      const hasFileOutput = result.outputs.some(o => o.type === 'file');
      if (!hasFileOutput) {
        result.outputs.push(fileOutput);
      } else {
        // Update existing file output
        result.outputs = result.outputs.map(o =>
          o.type === 'file' ? fileOutput : o
        );
      }
    }

    // Apply format to console outputs
    if (stack.format) {
      result.outputs = result.outputs.map(o =>
        o.type === 'console' ? { ...o, format: stack.format } : o
      );
    }

    // Apply colorize to console outputs
    if (stack.colorize !== undefined) {
      result.outputs = result.outputs.map(o =>
        o.type === 'console' ? { ...o, colorize: stack.colorize } : o
      );
    }

    return result;
  }

  /**
   * Apply environment variable overrides
   */
  private static applyEnvOverrides(
    config: LoggerConfig,
    env: Record<string, string | undefined>
  ): LoggerConfig {
    const result = this.deepClone(config);

    // HABITS_LOG_LEVEL
    const levelEnv = env[LOG_ENV_VARS.LEVEL];
    if (levelEnv && this.isValidLogLevel(levelEnv as LogLevel)) {
      result.level = levelEnv as LogLevel;
    }

    // HABITS_LOG_OUTPUT (comma-separated: console,file,json)
    const outputEnv = env[LOG_ENV_VARS.OUTPUT];
    if (outputEnv) {
      const outputs = outputEnv.split(',').map(o => o.trim().toLowerCase());
      result.outputs = outputs
        .filter(o => ['console', 'file', 'json'].includes(o))
        .map(type => this.createOutputConfigFromEnv(type, env));
    }

    // HABITS_LOG_FILE_PATH
    const filePathEnv = env[LOG_ENV_VARS.FILE_PATH];
    if (filePathEnv) {
      const existingFile = result.outputs.find(o => o.type === 'file');
      if (existingFile && existingFile.type === 'file') {
        existingFile.path = filePathEnv;
      } else {
        result.outputs.push(this.createOutputConfigFromEnv('file', env));
      }
    }

    // HABITS_LOG_COLORIZE
    const colorizeEnv = env[LOG_ENV_VARS.COLORIZE];
    if (colorizeEnv !== undefined) {
      const colorize = colorizeEnv.toLowerCase() !== 'false';
      result.outputs = result.outputs.map(o =>
        o.type === 'console' ? { ...o, colorize } : o
      );
    }

    // HABITS_LOG_FORMAT
    const formatEnv = env[LOG_ENV_VARS.FORMAT];
    if (formatEnv && ['text', 'json'].includes(formatEnv.toLowerCase())) {
      const format = formatEnv.toLowerCase() as 'text' | 'json';
      result.outputs = result.outputs.map(o =>
        o.type === 'console' || o.type === 'file' ? { ...o, format } : o
      );
    }

    // Per-bit level overrides: HABITS_LOG_BIT_{BITNAME}_LEVEL
    for (const [key, value] of Object.entries(env)) {
      const match = key.match(LOG_ENV_VARS.BIT_LEVEL_PATTERN);
      if (match && value && this.isValidLogLevel(value as LogLevel)) {
        // Convert BITNAME to bit-name format (e.g., HTTP -> bit-http)
        const bitName = `bit-${match[1].toLowerCase().replace(/_/g, '-')}`;
        result.bitOverrides![bitName] = value as LogLevel;
      }
    }

    return result;
  }

  /**
   * Create a basic output config from type string
   */
  private static createOutputConfig(type: string): OutputConfig {
    switch (type) {
      case 'file':
        return { type: 'file', path: './logs/habits.log' };
      case 'json':
        return { type: 'json' };
      case 'console':
      default:
        return { type: 'console', colorize: true, format: 'text' };
    }
  }

  /**
   * Create output config from env vars
   */
  private static createOutputConfigFromEnv(
    type: string,
    env: Record<string, string | undefined>
  ): OutputConfig {
    switch (type) {
      case 'file':
        const maxFilesEnv = env[LOG_ENV_VARS.FILE_MAX_FILES];
        return {
          type: 'file',
          path: env[LOG_ENV_VARS.FILE_PATH] || './logs/habits.log',
          maxSize: env[LOG_ENV_VARS.FILE_MAX_SIZE],
          maxFiles: maxFilesEnv ? parseInt(maxFilesEnv, 10) : undefined,
        };
      case 'json':
        return { type: 'json' };
      case 'console':
      default:
        return {
          type: 'console',
          colorize: env[LOG_ENV_VARS.COLORIZE]?.toLowerCase() !== 'false',
          format: (env[LOG_ENV_VARS.FORMAT] as 'text' | 'json') || 'text',
        };
    }
  }

  /**
   * Filter and validate bit overrides
   */
  private static filterValidBitOverrides(
    overrides: Record<string, LogLevel>
  ): Record<string, LogLevel> {
    const result: Record<string, LogLevel> = {};
    for (const [bit, level] of Object.entries(overrides)) {
      if (this.isValidLogLevel(level)) {
        result[bit] = level;
      }
    }
    return result;
  }

  /**
   * Check if a value is a valid log level
   */
  private static isValidLogLevel(level: string): level is LogLevel {
    return VALID_LOG_LEVELS.has(level as LogLevel);
  }

  /**
   * Deep clone an object
   */
  private static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Parse size string to bytes (e.g., "10mb" -> 10485760)
   */
  static parseSize(size?: string): number | undefined {
    if (!size) return undefined;

    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
    if (!match) return undefined;

    const value = parseFloat(match[1]);
    const unit = match[2] || 'b';

    const multipliers: Record<string, number> = {
      b: 1,
      kb: 1024,
      mb: 1024 * 1024,
      gb: 1024 * 1024 * 1024,
    };

    return Math.floor(value * multipliers[unit]);
  }
}
