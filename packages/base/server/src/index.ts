// NOTE: Do NOT re-export from './main' here - it has side effects (starts express server on import)
// The base server main.ts should only be loaded explicitly via customRequire() in startBaseServer()

// Export SEA (Single Executable Application) generator functions
export {
  generateSeaBinary,
  checkSeaSupport,
  getSupportedPlatforms,
  getCurrentPlatform,
  SeaConfig,
  SeaGenerationResult,
} from './sea-generator';

// Export Pack command functions and types
export {
  // Types
  PackFormat,
  PackCommandOptions,
  PackResult,
  HabitData,
  ParsedConfig,
  DesktopPlatform,
  MobileTarget,
  SeaPlatform,
  // Functions
  runPackCommand,
  getSupportedPackFormats,
  getSupportedDesktopPlatforms,
  getSupportedMobileTargets,
  loadHabits,
  packSingleExecutable,
  packDesktop,
  packMobile,
} from './pack';
