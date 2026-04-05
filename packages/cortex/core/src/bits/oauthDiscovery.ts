/**
 * OAuth2 Discovery
 * 
 * Scans workflows and bits to discover OAuth2 PKCE authentication requirements.
 * Used at server startup to display authorization URLs to users.
 */

import { Workflow, WorkflowNode } from '@habits/shared/types';
import { OAuth2Status, OAuth2Config } from './oauth2Types';
import { oauthTokenStore } from './oauthTokenStore';
import { pieceFromModule, extractBitsPieceFromModule } from './bitsRoutine';
import { getModuleName, getBundledModule, isBundledModule } from '../utils/moduleLoader';
import { getModuleMainFile, ModuleDefinition } from '../utils/moduleCloner';
import { simpleRequire } from '../utils/customRequire';
import { ILogger, LoggerFactory } from '@ha-bits/core/logger';
import * as path from '@ha-bits/bindings/path';

const logger = LoggerFactory.create(undefined, undefined, { bitName: 'OAuthDiscovery' });

/**
 * Resolve {{habits.env.VAR}} expressions in a value to actual env values
 */
function resolveEnvExpression(value: any): any {
  if (typeof value !== 'string') return value;
  
  // Match {{habits.env.VAR_NAME}} pattern
  const envPattern = /\{\{habits\.env\.([A-Za-z_][A-Za-z0-9_]*)\}\}/g;
  return value.replace(envPattern, (match, envVar) => {
    return process.env[envVar] || '';
  });
}

/**
 * Extract clientId and clientSecret from node's auth configuration
 * Handles both camelCase (clientId) and UPPER_CASE (CLIENT_ID) formats
 */
function extractAuthCredentials(nodeAuth: Record<string, any> | undefined): { clientId?: string; clientSecret?: string } {
  if (!nodeAuth) return {};
  
  // Look for clientId (camelCase or UPPER_CASE)
  let clientId = nodeAuth.clientId || nodeAuth.CLIENT_ID || nodeAuth.client_id;
  let clientSecret = nodeAuth.clientSecret || nodeAuth.CLIENT_SECRET || nodeAuth.client_secret;
  
  // Resolve any env expressions
  if (clientId) clientId = resolveEnvExpression(clientId);
  if (clientSecret) clientSecret = resolveEnvExpression(clientSecret);
  
  return { clientId, clientSecret };
}

/**
 * OAuth2 requirement for a bit in the workflow
 */
export interface OAuthRequirement {
  /** Bit ID (derived from module name) */
  bitId: string;
  /** Module name (e.g., "@ha-bits/bit-oauth-mock") */
  moduleName: string;
  /** Display name of the bit */
  displayName: string;
  /** OAuth2 configuration */
  config: OAuth2Config;
  /** Whether a valid token already exists */
  hasValidToken: boolean;
  /** Status: 'needed', 'valid', or 'expired' */
  status: 'needed' | 'valid' | 'expired';
}

/**
 * Extract bit ID from module name
 * e.g., "@ha-bits/bit-oauth-mock" -> "bit-oauth-mock"
 */
function extractBitId(moduleName: string): string {
  const parts = moduleName.split('/');
  return parts[parts.length - 1];
}

/**
 * Get auth definition from a loaded bit module
 */
async function getAuthFromModule(moduleDefinition: ModuleDefinition): Promise<{ auth: any; displayName: string } | null> {
  const moduleName = getModuleName(moduleDefinition);

  try {
    // Check if module is pre-bundled
    if (isBundledModule(moduleDefinition.repository)) {
      const loadedModule = getBundledModule(moduleDefinition.repository);
      if (loadedModule) {
        const piece = extractBitsPieceFromModule(loadedModule);
        return { auth: piece.auth, displayName: piece.displayName };
      }
      return null;
    }

    // For non-bundled modules, use filesystem-based loading
    const mainFilePath = getModuleMainFile(moduleDefinition);
    if (!mainFilePath) {
      return null;
    }

    const originalCwd = process.cwd();
    const moduleDir = path.dirname(mainFilePath);
    let nodeModulesDir = moduleDir;
    while (nodeModulesDir && !nodeModulesDir.endsWith('/node_modules') && nodeModulesDir !== path.dirname(nodeModulesDir)) {
      nodeModulesDir = path.dirname(nodeModulesDir);
    }

    try {
      process.chdir(moduleDir);
      const loadedModule = simpleRequire(mainFilePath, nodeModulesDir);
      const piece = extractBitsPieceFromModule(loadedModule);
      process.chdir(originalCwd);
      return { auth: piece.auth, displayName: piece.displayName };
    } catch (error) {
      process.chdir(originalCwd);
      throw error;
    }
  } catch (error) {
    logger.warn('Failed to load auth from module', { moduleName, error: String(error) });
    return null;
  }
}

/**
 * Check if an auth definition is OAuth2
 */
function isOAuth2(auth: any): auth is { type: 'OAUTH2' } & OAuth2Config {
  return auth && (auth.type === 'OAUTH2' || auth.type === 'OAUTH2_PKCE');
}

/**
 * Discover OAuth2 requirements from workflows
 * @param workflows - Map of workflow ID to workflow definition
 * @returns Array of OAuth requirements
 */
export async function discoverOAuthRequirements(
  workflows: Map<string, Workflow>
): Promise<OAuthRequirement[]> {
  const requirements: OAuthRequirement[] = [];
  const processedModules = new Set<string>();

  for (const [workflowId, workflow] of workflows) {
    for (const node of workflow.nodes) {
      const nodeData = node.data;
      
      // Only process bits framework nodes
      if (nodeData?.framework !== 'bits') {
        continue;
      }

      const moduleName = nodeData.module;
      if (!moduleName || processedModules.has(moduleName)) {
        continue;
      }

      processedModules.add(moduleName);

      // Create module definition
      const moduleDefinition: ModuleDefinition = {
        repository: moduleName,
        source: 'npm',
        framework: 'bits',
      };

      // Get auth from module
      const moduleAuth = await getAuthFromModule(moduleDefinition);
      if (!moduleAuth || !isOAuth2(moduleAuth.auth)) {
        continue;
      }

      const bitId = extractBitId(moduleName);
      const hasValidToken = oauthTokenStore.hasValidToken(bitId);
      const isExpired = oauthTokenStore.isExpired(bitId);

      let status: 'needed' | 'valid' | 'expired';
      if (hasValidToken && !isExpired) {
        status = 'valid';
      } else if (hasValidToken && isExpired) {
        status = 'expired';
      } else {
        status = 'needed';
      }

      // Extract auth credentials from node's auth config (supports {{habits.env.VAR}} expressions)
      const nodeAuthCredentials = extractAuthCredentials(nodeData.auth);
      
      // Merge: node auth credentials take precedence over bit's static config
      const clientId = nodeAuthCredentials.clientId || moduleAuth.auth.clientId;
      const clientSecret = nodeAuthCredentials.clientSecret || moduleAuth.auth.clientSecret;

      requirements.push({
        bitId,
        moduleName,
        displayName: moduleAuth.displayName,
        config: {
          displayName: moduleAuth.auth.displayName,
          description: moduleAuth.auth.description,
          required: moduleAuth.auth.required,
          authorizationUrl: moduleAuth.auth.authorizationUrl,
          tokenUrl: moduleAuth.auth.tokenUrl,
          clientId,
          clientSecret,
          scopes: moduleAuth.auth.scopes,
          extraAuthParams: moduleAuth.auth.extraAuthParams,
        },
        hasValidToken,
        status,
      });
    }
  }

  return requirements;
}

/**
 * Print OAuth requirements to terminal
 * @param requirements - OAuth requirements to print
 * @param getAuthUrl - Function to generate authorization URL for a requirement (can be async)
 */
export async function printOAuthRequirements(
  requirements: OAuthRequirement[],
  getAuthUrl: (req: OAuthRequirement) => string | Promise<string>
): Promise<void> {
  const neededRequirements = requirements.filter(r => r.status !== 'valid');

  if (neededRequirements.length === 0) {
    logger.info('All OAuth2 tokens are valid');
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('🔐 OAuth2 Authorization Required');
  console.log('='.repeat(60));

  for (const req of neededRequirements) {
    const statusIcon = req.status === 'expired' ? '⚠️  (expired)' : '❌ (missing)';
    console.log(`\n📦 ${req.displayName} ${statusIcon}`);
    console.log(`   Module: ${req.moduleName}`);
    console.log(`   Scopes: ${req.config.scopes.join(', ')}`);
    const authUrl = await getAuthUrl(req);
    console.log(`   ➜ Visit: ${authUrl}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Open the URLs above in your browser to authorize access.');
  console.log('After authorization, the tokens will be stored automatically.');
  console.log('='.repeat(60) + '\n');
}
