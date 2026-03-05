import { ensureModuleInstalled, getModuleName } from '../utils/moduleLoader';
import { getModuleMainFile, ModuleDefinition, ensureActivepiecesReady } from '../utils/moduleCloner';
import * as path from 'path';
import { simpleRequire } from '../utils/customRequire';

// Lazy-loaded activepieces modules - will be loaded after ensureActivepiecesReady() is called
let extractPieceFromModule: any;
let TriggerStrategy: any;
let trimVersionFromAlias: any;

/**
 * Ensures activepieces dependencies are installed and loads the required modules.
 * Must be called before using any activepieces functionality.
 */
async function ensureActivepiecesModulesLoaded(): Promise<void> {
  if (extractPieceFromModule) return; // Already loaded
  
  // Ensure deps are installed first
  await ensureActivepiecesReady();
  
  // Now dynamically import the modules
  const shared = await import('@activepieces/shared');
  
  extractPieceFromModule = shared.extractPieceFromModule;
  TriggerStrategy = shared.TriggerStrategy;
  trimVersionFromAlias = shared.trimVersionFromAlias;
}

import { LoggerFactory } from '@ha-bits/core';
const logger = LoggerFactory.getRoot();



export async function executeActivepiecesModule(
params: {  source: string,
  framework: string,
  moduleName: string,
  params: Record<string, any>}
): Promise<any> {
  // Ensure activepieces dependencies are installed and loaded
  await ensureActivepiecesModulesLoaded();

  // Get module definition from config
  const moduleDefinition: ModuleDefinition = {
    framework: params.framework,
    source: params.source as 'github' | 'npm',
    repository: params.moduleName,
  };
  



  
  if (!moduleDefinition) {
    throw new Error(`Activepieces module '${params.moduleName}' not found in modules.json`);
  }

  // Ensure module is cloned and built
  const inferredModuleName = getModuleName(moduleDefinition);
  console.log(`\n🔍 Ensuring module is ready: ${inferredModuleName}`);
  await ensureModuleInstalled(moduleDefinition);



  

  try {
    return await executeGenericActivepiecesPiece(params, moduleDefinition);

  } catch (error: any) {
    throw new Error(`Failed to load Activepieces module from '${moduleDefinition.repository}': ${error.message}`);
  }

  // Generic execution fallback
}
async function pieceFromModule(
  moduleDefinition: ModuleDefinition
): Promise<any> {
  const moduleName = getModuleName(moduleDefinition);


  // Get the main file path
  const mainFilePath = getModuleMainFile(moduleDefinition);
  if (!mainFilePath) {
    throw new Error(`Could not locate main file for module: ${moduleName}`);
  }

  console.log(`📦 Module ready at: ${mainFilePath}`);

  // Import module using require for CommonJS compatibility  
  // Save current working directory and change to module directory for proper resolution
  const originalCwd = process.cwd();
  const moduleDir = path.dirname(mainFilePath);
  
  // Find the node_modules directory containing the module
  // For /tmp/habits-nodes/node_modules/@activepieces/piece-openai/src/index.js
  // we want /tmp/habits-nodes/node_modules
  let nodeModulesDir = moduleDir;
  while (nodeModulesDir && !nodeModulesDir.endsWith('/node_modules') && nodeModulesDir !== path.dirname(nodeModulesDir)) {
    nodeModulesDir = path.dirname(nodeModulesDir);
  }
  
  try {
    process.chdir(moduleDir);
    // Use simpleRequire which creates require from the node_modules context
    // This avoids module resolution path manipulation that can cause circular dependency issues
    const loadedModule = simpleRequire(mainFilePath, nodeModulesDir);
    
    // Find the piece export in the module
    const pieceName = Object.keys(loadedModule).find(key => {
      const exported = loadedModule[key];
      return exported && typeof exported === 'object' && 'actions' in exported && 'triggers' in exported;
    });
    
    const piece = (extractPieceFromModule as any)({module: loadedModule, pieceName: pieceName!, pieceVersion: trimVersionFromAlias('2.0' )});
    process.chdir(originalCwd);
    return piece;
  } catch (error: any) {
    process.chdir(originalCwd);
    logger.error(error.stack);
    throw error;
  }


}
async function hookTriggers(
  moduleDefinition: ModuleDefinition
){
  // Ensure activepieces modules are loaded before using TriggerStrategy
  await ensureActivepiecesModulesLoaded();
  
  const piece = await pieceFromModule(moduleDefinition);

  const triggers = piece.triggers();
  for (const [triggerKey, trigger] of Object.entries(triggers)) {
    console.log(`🔔 Hooking trigger: ${triggerKey}`);
    const triggerObj = trigger as any;

    // Check trigger type: polling, webhook, app-webhook
    if(triggerObj.type == TriggerStrategy.POLLING){
    // If Polling trigger, Check strategy either timebased or 


    }

    if(triggerObj.type == TriggerStrategy.WEBHOOK){
    // If Webhook trigger
    // Here you would add logic to actually hook the trigger into your system
    // For example, setting up webhooks, polling mechanisms, etc.
  }
  if(triggerObj.type == TriggerStrategy.APP_WEBHOOK){
    // If App Webhook trigger
    // Here you would add logic to actually hook the trigger into your system
    // For example, setting up webhooks, polling mechanisms, etc.
  }
}
}
async function executeGenericActivepiecesPiece(
  params: Record<string, any>,
  moduleDefinition: ModuleDefinition
): Promise<any> {

  try {

    
    const piece = await pieceFromModule(moduleDefinition);

    
    logger.log(`🚀 Executing Activepieces piece: ${piece.displayName}`);
    const actionName = params.params.operation;
    const pieceActions = piece.actions();
    logger.log(`Available actions: ${Object.keys(pieceActions).join(', ')}`);
    logger.log(`Requested action: ${actionName}`);
    const action = piece.actions()[actionName] as any;
    
    // if action is not found, throw error with available actions
    if (!action) {
      throw new Error(`Action '${actionName}' not found in piece '${piece.displayName}'. Available actions: ${Object.keys(pieceActions).join(', ')}`);
    }
    // Extract auth from credentials if present
    // The piece expects auth to be passed separately from propsValue
    // Credentials are typically in params.params.credentials.<pieceName>
    let auth: any = undefined;
    const { credentials, ...actionProps } = params.params;
    if (credentials) {
      // Find the first credential object (e.g., credentials.intersect, credentials.openai, etc.)
      const credentialKeys = Object.keys(credentials);
      if (credentialKeys.length > 0) {
        // Pass auth data directly - pieces access auth properties directly (e.g., auth.host, auth.apiKey)
        // Some pieces may wrap in auth.props but most modern pieces access directly
        auth = credentials[credentialKeys[0]];
        logger.log(`🔐 Using credentials for: ${credentialKeys[0]}`);
      }
    }
    
    const result = await action.run({
      auth,
      propsValue: {
        ...actionProps
      } as any
    } as any);
    logger.log(`✅ Successfully executed Activepieces piece action: ${actionName}`, result);
    
    
    return {
      success: true,
      module: moduleDefinition.repository,
      pieceLoaded: true,
      params,
      result,
      executedAt: new Date().toISOString(),
      data: {
        message: `Successfully executed Activepieces piece: ${piece.displayName}`,
        status: 'completed',
        pieceExports: Object.keys(module),
      },
    };
    
  } catch (error: any) {
    // Print stack
    logger.error(error.stack);
    throw error;
  }



}
