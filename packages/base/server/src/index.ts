// NOTE: Do NOT re-export from './main' here - it has side effects (starts express server on import)
// The base server main.ts should only be loaded explicitly via customRequire() in startBaseServer()

// Export Pack command functions and types
export {
  PackFormat,
  PackCommandOptions,
  PackResult,
  HabitData,
  ParsedConfig,
  runPackCommand,
  getSupportedPackFormats,
  loadHabits,
  generateBundle,
  BundleGeneratorOptions,
  BundleGeneratorResult,
} from './pack';
