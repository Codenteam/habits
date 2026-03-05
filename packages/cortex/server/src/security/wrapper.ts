#!/usr/bin/env node
/**
 * Habits Cortex Security Wrapper
 * 
 * This wrapper checks for security configurations and spawns Node.js with
 * appropriate flags for:
 * - Supply Chain Integrity (--experimental-policy)
 * - Capabilities & Permissions (--experimental-permission)
 * 
 * Environment Variables:
 * - HABITS_SECURITY_POLICY_ENABLED: Enable policy file enforcement
 * - HABITS_SECURITY_CAPABILITIES_ENABLED: Enable Node.js permissions model
 * 
 * Security Files (relative to config directory):
 * - security/policy.json: Node.js policy file with integrity hashes
 * - security/config.json: Permissions configuration (fs, net, env access)
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

/**
 * Node.js permission configuration format
 * See: https://nodejs.org/api/permissions.html
 */
interface PermissionsConfig {
  permission?: {
    'allow-fs-read'?: string[];
    'allow-fs-write'?: string[];
    'allow-child-process'?: boolean;
    'allow-worker'?: boolean;
    'allow-net'?: boolean | string[];
    'allow-addons'?: boolean;
  };
}

interface SecurityWrapperConfig {
  policyEnabled: boolean;
  capabilitiesEnabled: boolean;
  policyPath: string | null;
  permissionsConfig: PermissionsConfig | null;
  configDir: string;
}

// ============================================================================
// Security File Detection
// ============================================================================

/**
 * Find the config directory from command line arguments
 */
function findConfigDir(args: string[]): string {
  // Look for --config or -c argument
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' || args[i] === '-c') {
      if (args[i + 1]) {
        return path.dirname(path.resolve(args[i + 1]));
      }
    }
    if (args[i].startsWith('--config=')) {
      return path.dirname(path.resolve(args[i].split('=')[1]));
    }
  }
  // Default to current working directory
  return process.cwd();
}

/**
 * Check for security files and environment variables
 */
async function detectSecurityConfig(configDir: string): Promise<SecurityWrapperConfig> {
  const policyEnabled = process.env.HABITS_SECURITY_POLICY_ENABLED === 'true';
  const capabilitiesEnabled = process.env.HABITS_SECURITY_CAPABILITIES_ENABLED === 'true';
  
  const securityDir = path.join(configDir, 'security');
  const policyPath = path.join(securityDir, 'policy.json');
  const configPath = path.join(securityDir, 'config.json');
  
  let finalPolicyPath: string | null = null;
  let permissionsConfig: PermissionsConfig | null = null;
  
  // Check for policy file
  if (policyEnabled && fs.existsSync(policyPath)) {
    console.log(`🔐 [Security] Policy file found: ${policyPath}`);
    finalPolicyPath = policyPath;
    
    // Optionally evaluate/validate policy with @codenteam/intersect
    try {
      // @ts-ignore - Package is from private registry
      const intersect = await import('@codenteam/intersect');
      if (intersect.policy?.validate) {
        const policyContent = JSON.parse(fs.readFileSync(policyPath, 'utf-8'));
        const validationResult = await intersect.policy.validate(policyContent);
        if (validationResult.valid) {
          console.log(`🔐 [Security] Policy file validated successfully`);
        } else {
          console.warn(`⚠️ [Security] Policy validation warnings: ${validationResult.warnings?.join(', ')}`);
        }
      }
    } catch (importError: any) {
      // @codenteam/intersect not available, continue without validation
      console.log(`🔐 [Security] Policy file will be disabled: validation failed`);

      // disable policy enforcement if validation cannot be performed
        finalPolicyPath = null;
        
    }
  } else if (policyEnabled) {
    console.warn(`⚠️ [Security] HABITS_SECURITY_POLICY_ENABLED=true but no policy file found at: ${policyPath}`);
  }
  
  // Check for permissions config
  if (capabilitiesEnabled && fs.existsSync(configPath)) {
    console.log(`🔐 [Security] Permissions config found: ${configPath}`);
    try {
      permissionsConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      
      // Optionally evaluate/validate config with @codenteam/intersect
      try {
        // @ts-ignore - Package is from private registry
        const intersect = await import('@codenteam/intersect');
        if (intersect.permissions?.validate) {
          const validationResult = await intersect.permissions.validate(permissionsConfig);
          if (validationResult.valid) {
            console.log(`🔐 [Security] Permissions config validated successfully`);
          } else {
            console.warn(`⚠️ [Security] Permissions validation warnings: ${validationResult.warnings?.join(', ')}`);
          }
        }
      } catch (importError: any) {
        // @codenteam/intersect not available, continue without validation
        console.log(`🔐 [Security] Permissions config will be used (validation skipped)`);
      }
    } catch (parseError: any) {
      console.error(`❌ [Security] Failed to parse permissions config: ${parseError.message}`);
      permissionsConfig = null;
    }
  } else if (capabilitiesEnabled) {
    console.warn(`⚠️ [Security] HABITS_SECURITY_CAPABILITIES_ENABLED=true but no config file found at: ${configPath}`);
  }
  
  return {
    policyEnabled,
    capabilitiesEnabled,
    policyPath: finalPolicyPath,
    permissionsConfig,
    configDir,
  };
}

// ============================================================================
// Node.js Flag Generation
// ============================================================================

/**
 * Build Node.js command line arguments for security features
 */
function buildNodeSecurityArgs(config: SecurityWrapperConfig): string[] {
  const args: string[] = [];
  
  // Policy file (Supply Chain Integrity)
  if (config.policyPath) {
    args.push(`--experimental-policy=${config.policyPath}`);
    console.log(`🔐 [Security] Enabling policy enforcement`);
  }
  
  // Permissions model (Capabilities)
  if (config.permissionsConfig?.permission) {
    args.push('--experimental-permission');
    console.log(`🔐 [Security] Enabling permissions model`);
    
    const perms = config.permissionsConfig.permission;
    
    // Filesystem read permissions
    if (perms['allow-fs-read']) {
      for (const readPath of perms['allow-fs-read']) {
        const absolutePath = path.isAbsolute(readPath) 
          ? readPath 
          : path.resolve(config.configDir, readPath);
        args.push(`--allow-fs-read=${absolutePath}`);
        console.log(`   ✓ allow-fs-read: ${absolutePath}`);
      }
    }
    
    // Filesystem write permissions
    if (perms['allow-fs-write']) {
      for (const writePath of perms['allow-fs-write']) {
        const absolutePath = path.isAbsolute(writePath) 
          ? writePath 
          : path.resolve(config.configDir, writePath);
        args.push(`--allow-fs-write=${absolutePath}`);
        console.log(`   ✓ allow-fs-write: ${absolutePath}`);
      }
    }
    
    // Network permissions
    if (perms['allow-net']) {
      if (perms['allow-net'] === true) {
        // Allow all network access
        args.push('--allow-net');
        console.log(`   ✓ allow-net: all`);
      } else if (Array.isArray(perms['allow-net'])) {
        for (const host of perms['allow-net']) {
          args.push(`--allow-net=${host}`);
          console.log(`   ✓ allow-net: ${host}`);
        }
      }
    }
    
    // Child process permission
    if (perms['allow-child-process']) {
      args.push('--allow-child-process');
      console.log(`   ✓ allow-child-process`);
    }
    
    // Worker permission
    if (perms['allow-worker']) {
      args.push('--allow-worker');
      console.log(`   ✓ allow-worker`);
    }
    
    // Addons permission
    if (perms['allow-addons']) {
      args.push('--allow-addons');
      console.log(`   ✓ allow-addons`);
    }
  }
  
  return args;
}

// ============================================================================
// Cortex Spawner
// ============================================================================

/**
 * Spawn Cortex with security flags
 */
function spawnCortexWithSecurity(
  nodeArgs: string[],
  cortexArgs: string[]
): Promise<number> {
  return new Promise((resolve, reject) => {
    // Find the cortex entry point
    const cortexEntry = require.resolve('@ha-bits/cortex');
    
    // Build full command
    const fullArgs = [...nodeArgs, cortexEntry, ...cortexArgs];
    
    console.log(`\n🚀 Starting Cortex with security flags...`);
    if (nodeArgs.length > 0) {
      console.log(`   Node.js flags: ${nodeArgs.join(' ')}`);
    }
    console.log('');
    
    const child = spawn(process.execPath, fullArgs, {
      stdio: 'inherit',
      env: process.env,
    });
    
    child.on('error', (error) => {
      console.error(`❌ Failed to start Cortex: ${error.message}`);
      reject(error);
    });
    
    child.on('exit', (code) => {
      resolve(code ?? 0);
    });
  });
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  // Find config directory from arguments
  const configDir = findConfigDir(args);
  
  console.log('🔐 [Security] Habits Security Wrapper');
  console.log(`   Config directory: ${configDir}`);
  
  // Detect security configuration
  const securityConfig = await detectSecurityConfig(configDir);
  
  // Build Node.js security arguments
  const nodeArgs = buildNodeSecurityArgs(securityConfig);
  
  // Check if any security features are enabled
  if (nodeArgs.length === 0) {
    console.log('   No security features enabled, running Cortex directly\n');
  }
  
  // Spawn Cortex with security flags
  try {
    const exitCode = await spawnCortexWithSecurity(nodeArgs, args);
    process.exit(exitCode);
  } catch (error) {
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error('❌ Security wrapper failed:', error);
  process.exit(1);
});
