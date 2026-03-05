/**
 * n8n Module Executor
 * Main entry point for executing n8n nodes
 */

import { ensureModuleInstalled, getModuleName } from '../utils/moduleLoader';
import { getModuleMainFile, getModulePath, ModuleDefinition } from '../utils/moduleCloner';
import * as path from 'path';
import * as fs from 'fs';

// Re-export types and functions from sub-modules
export { createExecutionContext, N8nNodeExecutionOptions } from './executionContext';
export { executeGenericN8nNode, executeRoutingBasedNode, loadNodeFromModule, hasRoutingInDescription } from './nodeExecution';
export { httpRequest, convertN8nRequestToAxios } from './httpRequest';
export { loadCredentialType, applyCredentialAuthentication, applyFallbackAuthentication, applyCredentialsToHeaders, resolveCredentialExpression } from './credentialLoader';
import { LoggerFactory } from '@ha-bits/core';

const logger = LoggerFactory.getRoot();

// ============================================================================
// Types
// ============================================================================

export interface N8nExecutionParams {
  source: string;
  framework: string;
  moduleName: string;
  params: Record<string, any>;
}

// ============================================================================
// N8n Module Path Resolution
// ============================================================================

/**
 * Find the main node file for an n8n module
 * N8n modules specify their nodes in package.json under "n8n.nodes"
 */
function getN8nNodeFile(moduleDefinition: ModuleDefinition): string | null {
  const modulePath = getModulePath(moduleDefinition);
  logger.log(`\n🔍 getN8nNodeFile looking for module at: ${modulePath}`);
  logger.log(`   Source: ${moduleDefinition.source}`);
  
  const packageJsonPath = path.join(modulePath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    logger.error(`package.json not found at: ${packageJsonPath}`);
    return null;
  }
  
  logger.log(`   Found package.json at: ${packageJsonPath}`);

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    // N8n modules specify nodes in the "n8n" section
    if (packageJson.n8n?.nodes && packageJson.n8n.nodes.length > 0) {
      // Get the first node file
      const nodeFile = packageJson.n8n.nodes[0];
      const fullPath = path.join(modulePath, nodeFile);
      
      if (fs.existsSync(fullPath)) {
        logger.log(`🔍 Found n8n node at: ${fullPath}`);
        return fullPath;
      }
    }

    // Fallback: Try to find .node.js files in common locations
    const fallbackPaths = [
      'dist/nodes',
      'nodes',
      'dist',
    ];

    for (const fallbackPath of fallbackPaths) {
      const dir = path.join(modulePath, fallbackPath);
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        const nodeFile = findNodeFileInDirectory(dir);
        if (nodeFile) {
          logger.log(`🔍 Found n8n node via search at: ${nodeFile}`);
          return nodeFile;
        }
      }
    }

    return null;
  } catch (error: any) {
    logger.error(`Error reading package.json: ${error.message}`);
    return null;
  }
}

/**
 * Recursively search for .node.js files in a directory
 */
function findNodeFileInDirectory(dir: string): string | null {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isFile() && entry.name.endsWith('.node.js')) {
      return fullPath;
    }
    
    if (entry.isDirectory()) {
      const found = findNodeFileInDirectory(fullPath);
      if (found) {
        return found;
      }
    }
  }
  
  return null;
}

// ============================================================================
// Main Execution Function
// ============================================================================

// Import executeGenericN8nNode here to avoid circular dependency
import { executeGenericN8nNode } from './nodeExecution';

/**
 * Execute an n8n module with real HTTP calls and proper execution context
 */
export async function executeN8nModule(
  params: N8nExecutionParams
): Promise<any>;
export async function executeN8nModule(
  moduleName: string,
  params: Record<string, any>
): Promise<any>;
export async function executeN8nModule(
  paramsOrModuleName: N8nExecutionParams | string,
  maybeParams?: Record<string, any>
): Promise<any> {
  // Handle both function signatures
  let moduleDefinition: ModuleDefinition;
  let executionParams: Record<string, any>;

  if (typeof paramsOrModuleName === 'string') {
    // Called as executeN8nModule(moduleName, params)
    logger.log(`\n📋 executeN8nModule called with string: ${paramsOrModuleName}`);
    moduleDefinition = {
      framework: 'n8n',
      source: 'npm',
      repository: paramsOrModuleName,
    };
    executionParams = maybeParams || {};
  } else {
    // Called as executeN8nModule(params: N8nExecutionParams)
    logger.log(`\n📋 executeN8nModule called with params object:`);
    logger.log(`   Framework: ${paramsOrModuleName.framework}`);
    logger.log(`   Source: ${paramsOrModuleName.source}`);
    logger.log(`   ModuleName: ${paramsOrModuleName.moduleName}`);
    moduleDefinition = {
      framework: paramsOrModuleName.framework,
      source: paramsOrModuleName.source as 'github' | 'npm' | 'local',
      repository: paramsOrModuleName.moduleName,
    };
    executionParams = paramsOrModuleName.params;
  }

  // Ensure module is installed
  const inferredModuleName = getModuleName(moduleDefinition);
  logger.log(`\n🔍 Ensuring n8n module is ready: ${inferredModuleName}`);
  await ensureModuleInstalled(moduleDefinition);

  // Get the n8n node file path using n8n-specific resolution
  let mainFilePath = getN8nNodeFile(moduleDefinition);
  
  // Fallback to generic resolution if n8n-specific fails
  if (!mainFilePath) {
    mainFilePath = getModuleMainFile(moduleDefinition);
  }
  
  if (!mainFilePath) {
    throw new Error(`Could not locate node file for n8n module: ${inferredModuleName}`);
  }

  logger.log(`📦 n8n node file at: ${mainFilePath}`);

  try {
    return await executeGenericN8nNode(executionParams, moduleDefinition, mainFilePath);
  } catch (error: any) {
    throw new Error(`Failed to execute n8n module '${moduleDefinition.repository}': ${error.message}`);
  }
}
