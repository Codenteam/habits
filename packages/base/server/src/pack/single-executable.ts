/**
 * Single Executable (SEA) Pack Handler
 * 
 * Generates a standalone Node.js Single Executable Application (SEA) binary
 * that contains the backend server and can run on server, desktop, or serverless.
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateSeaBinary, checkSeaSupport, getSupportedPlatforms } from '../sea-generator';
import { HabitData, ParsedConfig, PackResult } from './types';

export interface SingleExecutableOptions {
  configPath: string;
  configDir: string;
  config: ParsedConfig;
  habits: HabitData[];
  envContent: string;
  platform: string;
  output?: string;
}

/**
 * Generate a single executable binary from habits config
 */
export async function packSingleExecutable(options: SingleExecutableOptions): Promise<PackResult> {
  const { configPath, configDir, config, habits, envContent, platform, output } = options;

  console.log('📦 Packing habits into single executable binary...\n');
  console.log(`   Config: ${configPath}`);
  console.log(`   Loaded ${habits.length} habit(s)`);

  // Check SEA support
  const support = checkSeaSupport();
  if (!support.supported) {
    return {
      success: false,
      error: support.message || 'SEA is not supported on this Node.js version',
      format: 'single-executable',
    };
  }

  console.log(`   Node version: ${support.version}`);

  // Validate platform
  const supportedPlatforms = getSupportedPlatforms();
  if (!supportedPlatforms.includes(platform)) {
    return {
      success: false,
      error: `Unsupported platform: ${platform}. Supported: ${supportedPlatforms.join(', ')}`,
      format: 'single-executable',
    };
  }

  console.log(`   Platform: ${platform}`);
  console.log('\n⏳ Generating binary (this may take a minute)...\n');

  // Get server config
  const serverConfig = {
    port: config.server?.port || 3000,
    openapi: config.server?.openapi || false,
    webhookTimeout: config.server?.webhookTimeout || 30000,
  };

  // Load frontend HTML if specified
  let frontendHtml: string | undefined;
  if (config.server?.frontend) {
    const frontendPath = path.isAbsolute(config.server.frontend)
      ? config.server.frontend
      : path.resolve(configDir, config.server.frontend);
    
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      frontendHtml = fs.readFileSync(indexPath, 'utf8');
      console.log('   📄 Including frontend');
    }
  }

  // Generate the binary
  const result = await generateSeaBinary({
    habits,
    serverConfig,
    envContent,
    frontendHtml,
    platform: platform as any,
  });

  if (!result.success || !result.binaryPath) {
    return {
      success: false,
      error: result.error || 'Binary generation failed',
      format: 'single-executable',
    };
  }

  // Copy binary to output location
  const defaultOutputName = platform.startsWith('win') ? 'habits.exe' : 'habits';
  const outputPath = output
    ? path.resolve(output)
    : path.join(configDir, defaultOutputName);

  fs.copyFileSync(result.binaryPath, outputPath);
  fs.chmodSync(outputPath, 0o755);

  // Cleanup temp binary
  try {
    const tempDir = path.dirname(result.binaryPath);
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (e) {
    // Ignore cleanup errors
  }

  // Get binary size
  const stats = fs.statSync(outputPath);

  console.log('✅ Single executable generated successfully!\n');
  console.log(`   Output: ${outputPath}`);
  console.log(`   Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`   Platform: ${result.platform || platform}`);
  console.log('\n🚀 Run it with:');
  console.log(`   ${outputPath.startsWith('/') ? outputPath : './' + path.basename(outputPath)}`);

  return {
    success: true,
    outputPath,
    format: 'single-executable',
    size: stats.size,
    platform: result.platform || platform,
  };
}
