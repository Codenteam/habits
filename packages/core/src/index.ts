// @ha-bits/core - Shared types and utilities for Habits ecosystem
// This package is shared between Cortex (executor) and Base (builder)

export * from './types';
export * from './converters';
export * from './normalizeUtils';  // Browser-safe normalize utilities
export * from './variableUtils';

// NOTE: Logger module is NOT exported from main index for browser compatibility.
// For server-side code that needs logger, import from '@ha-bits/core/logger' directly:
//   import { LoggerFactory, ILogger } from '@ha-bits/core/logger';
// Or use the re-export from server bundle.