#!/usr/bin/env node
/**
 * Habits SEA Binary - Auto-generated standalone executable
 * Generated at: {{GENERATED_AT}}
 * 
 * This binary contains embedded workflow configuration and starts
 * a Cortex server with the configured habits.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

// Embedded workflow data (base64 encoded)
const EMBEDDED_DATA = {{EMBEDDED_DATA}};

/**
 * Decode base64 string to UTF-8
 */
function decode(base64) {
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Extract embedded files to temp directory
 */
function extractEmbeddedFiles() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'habits-sea-'));
  
  console.log('📦 Extracting embedded workflow files to:', tmpDir);
  
  // Write stack.yaml
  fs.writeFileSync(
    path.join(tmpDir, 'stack.yaml'),
    decode(EMBEDDED_DATA.stackYaml)
  );
  
  // Write habit files
  for (const habit of EMBEDDED_DATA.habits) {
    fs.writeFileSync(
      path.join(tmpDir, habit.slug + '.yaml'),
      decode(habit.content)
    );
  }
  
  // Write .env if present
  if (EMBEDDED_DATA.envContent) {
    fs.writeFileSync(
      path.join(tmpDir, '.env'),
      decode(EMBEDDED_DATA.envContent)
    );
  }
  
  // Write frontend if present
  if (EMBEDDED_DATA.frontendHtml) {
    const frontendDir = path.join(tmpDir, 'frontend');
    fs.mkdirSync(frontendDir, { recursive: true });
    fs.writeFileSync(
      path.join(frontendDir, 'index.html'),
      decode(EMBEDDED_DATA.frontendHtml)
    );
  }
  
  return tmpDir;
}

/**
 * Get the directory where the binary is located
 * Works for both SEA binaries and regular node scripts
 */
function getBinaryDir() {
  // For SEA, process.execPath is the binary itself
  // For regular node, it's the node executable
  const execPath = process.execPath;
  
  // Check if we're running as a SEA binary by checking if execPath ends with our binary name
  // or if we're in a temp directory (ncc bundled)
  if (process.pkg || process.sea) {
    // Running as SEA - use the binary's directory
    return path.dirname(execPath);
  }
  
  // Fallback: check if there's a .env next to the binary anyway
  const execDir = path.dirname(execPath);
  if (fs.existsSync(path.join(execDir, '.env'))) {
    return execDir;
  }
  
  // Last resort: use current working directory
  return process.cwd();
}

/**
 * Load environment variables with override support
 * Priority: local .env beside binary > bundled .env
 */
function loadEnvironmentVariables(configDir) {
  const bundledEnvPath = path.join(configDir, '.env');
  const binaryDir = getBinaryDir();
  const localEnvPath = path.join(binaryDir, '.env');
  
  // First, load the bundled .env (lower priority)
  if (fs.existsSync(bundledEnvPath)) {
    require('dotenv').config({ path: bundledEnvPath });
    console.log('📄 Loaded bundled environment variables');
  }
  
  // Then, override with local .env beside the binary (higher priority)
  if (fs.existsSync(localEnvPath) && localEnvPath !== bundledEnvPath) {
    // Read local env and override process.env
    const localEnvContent = fs.readFileSync(localEnvPath, 'utf-8');
    const localEnvVars = {};
    
    // Parse .env file manually to ensure override
    for (const line of localEnvContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      localEnvVars[key] = value;
      process.env[key] = value;
    }
    
    const overrideCount = Object.keys(localEnvVars).length;
    console.log(`📄 Loaded local .env from: ${localEnvPath}`);
    console.log(`   Overriding ${overrideCount} environment variable(s)`);
  }
}

/**
 * Open browser with the given URL
 * Uses platform-specific commands: macOS (open), Linux (xdg-open), Windows (start)
 */
function openBrowser(url) {
  const platform = process.platform;
  let command;
  
  switch (platform) {
    case 'darwin':
      command = `open "${url}"`;
      break;
    case 'win32':
      command = `start "" "${url}"`;
      break;
    default:
      // Linux and others
      command = `xdg-open "${url}"`;
      break;
  }
  
  exec(command, (error) => {
    if (error) {
      console.log(`   ℹ️  Could not open browser automatically: ${error.message}`);
      console.log(`   Open manually: ${url}`);
    }
  });
}

/**
 * Start the Cortex server with embedded configuration
 */
async function main() {
  console.log('');
  console.log('🚀 Habits SEA Binary Starting...');
  console.log('');
  
  // Extract embedded files
  const configDir = extractEmbeddedFiles();
  const configPath = path.join(configDir, 'stack.yaml');
  
  // Load environment variables with local override support
  loadEnvironmentVariables(configDir);
  
  // Set config path for cortex
  process.env.HABITS_CONFIG_PATH = configPath;
  process.env.HABITS_CONFIG_DIR = configDir;
  
  try {
    // Import and start cortex server
    // The cortex server is bundled alongside this entry point
    const { startServer } = require('./cortex-server.cjs');
    
    const port = parseInt(process.env.PORT || '{{DEFAULT_PORT}}', 10);
    const server = await startServer(configPath, port);
    
    const serverUrl = `http://localhost:${port}/`;
    
    console.log('');
    console.log('✅ Server started successfully!');
    console.log(`   API: ${serverUrl}`);
    console.log(`   Health: http://localhost:${port}/health`);
    console.log('');
    
    // Auto-open browser unless NO_BROWSER env var is set
    if (!process.env.NO_BROWSER) {
      console.log('🌐 Opening browser...');
      openBrowser(serverUrl);
    } else {
      console.log('ℹ️  Browser auto-open disabled (NO_BROWSER is set)');
    }
    
    console.log('');
    console.log('💡 Tip: Place a .env file beside this binary to override settings');
    console.log('   Set NO_BROWSER=1 to disable auto-opening browser');
    console.log('Press Ctrl+C to stop');
    
    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down...');
      await server.stop();
      
      // Cleanup temp directory
      try {
        fs.rmSync(configDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
      
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await server.stop();
      try {
        fs.rmSync(configDir, { recursive: true, force: true });
      } catch (e) {}
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
