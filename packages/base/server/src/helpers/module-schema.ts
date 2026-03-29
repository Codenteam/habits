/**
 * Module schema extraction helpers for n8n, activepieces, and bits frameworks
 */

import * as fs from "fs";
import * as path from "path";
import { getModulePath, getModuleMainFile } from "@ha-bits/cortex/utils/moduleCloner";
import { getModuleName } from "@ha-bits/cortex/utils/moduleLoader";
import { customRequire } from "@ha-bits/cortex/utils/customRequire";
import { extractBitsPieceFromModule } from "@ha-bits/cortex/bits/bitsDoer";
import { extractPiece } from './activepieces-loader';
import { LoggerFactory } from '@ha-bits/core/logger';

// Type imports (compile-time only, not bundled)
import type { Piece } from "@activepieces/pieces-framework";

const logger = LoggerFactory.getRoot();

/**
 * Extract schema from n8n module
 */
export async function extractN8nSchema(
  modulePathDir: string,
  moduleName: string,
): Promise<any> {
  // Read package.json to get node path
  const packageJsonPath = path.join(modulePathDir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  // Get the node file path from n8n.nodes[0]
  const nodeFilePath = packageJson.n8n?.nodes?.[0];
  const nodeFullPath = nodeFilePath
    ? path.join(modulePathDir, nodeFilePath)
    : null;

  if (!nodeFullPath || !fs.existsSync(nodeFullPath)) {
    return null;
  }

  let nodeJson: any;
  console.log("Reading node from:", nodeFullPath);

  // Check if it's a .node.json or .node.js file
  if (nodeFullPath.endsWith(".node.json")) {
    nodeJson = JSON.parse(fs.readFileSync(nodeFullPath, "utf8"));
  } else if (nodeFullPath.endsWith(".node.js")) {
    console.log("js file detected");
    // Use customRequire to load the module with its runtime dependencies
    const nodeModule = customRequire(nodeFullPath, modulePathDir);
    console.log("Node module exports:", Object.keys(nodeModule));

    // Find the node class export and extract its description
    for (const key of Object.keys(nodeModule)) {
      const exported = nodeModule[key];
      console.log("Module export key:", key);

      // Check if it's a class/constructor with a description property
      if (typeof exported === "function" && exported.prototype) {
        // Try to get description from prototype or static property
        let description =
          exported.prototype?.description || exported.description;

        // If no static description, try instantiating the class
        if (!description) {
          try {
            const instance = new exported();
            description = instance.description;
          } catch (e) {
            console.log("Could not instantiate node class:", e);
          }
        }

        if (description) {
          console.log("Found node description:", description.displayName);
          nodeJson = description;
          break;
        }
      } else if (typeof exported === "object" && exported !== null) {
        // Check if it's a node description object directly
        if (exported.displayName && exported.name && exported.properties) {
          nodeJson = exported;
          break;
        }
        // Check if it has a description property (e.g., module.exports.description)
        if (exported.description && exported.description.displayName) {
          nodeJson = exported.description;
          break;
        }
      }
    }
  }

  if (!nodeJson) {
    return null;
  }

  return {
    framework: "n8n",
    displayName: nodeJson.displayName,
    name: nodeJson.name,
    group: nodeJson.group || ["transform"],
    version: nodeJson.version || 1,
    description: nodeJson.description,
    defaults: nodeJson.defaults || {},
    inputs: nodeJson.inputs || ["main"],
    outputs: nodeJson.outputs || ["main"],
    properties: nodeJson.properties || [],
    credentials: nodeJson.credentials || [],
  };
}

/**
 * Extract schema from activepieces module
 */
export async function extractActivepiecesSchema(
  modulePathDir: string,
  mainFile: string,
  moduleName: string,
): Promise<any> {
  const packageJsonPath = path.join(modulePathDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  // Import module using customRequire to handle external paths
  const module = customRequire(mainFile, modulePathDir);

  // JIT load activepieces and extract piece
  const piece = await extractPiece<Piece>({
    module,
    pieceName: moduleName,
    pieceVersion: packageJson.version,
  });

  if (!piece) {
    throw new Error(`Failed to extract piece from module ${moduleName}`);
  }

  const auth = piece.auth;
  const actions = piece.actions();
  const triggers = piece.triggers();

  // Process actions to resolve dynamic options
  for (const keys of Object.keys(actions || {})) {
    const action = actions[keys];
    if (action && action.props) {
      for (const prop of Object.values(action.props) as any[]) {
        logger.log(prop);
        logger.log(prop.options);
        if (typeof prop.options === "function") {
          try {
            const options = await prop.options();
            prop.resolvedOptions = options;
          } catch (error) {
            // Ignore option resolution errors
          }
        }
      }
    }
  }

  // Process triggers to resolve dynamic options
  for (const keys of Object.keys(triggers || {})) {
    const trigger = triggers[keys];
    if (trigger && trigger.props) {
      for (const prop of Object.values(trigger.props) as any[]) {
        logger.log(prop);
        logger.log(prop.options);
        if (typeof prop.options === "function") {
          try {
            const options = await prop.options();
            prop.resolvedOptions = options;
          } catch (error) {
            // Ignore option resolution errors
          }
        }
      }
    }
  }

  return {
    framework: "activepieces",
    displayName: packageJson.displayName || moduleName,
    name: packageJson.name || moduleName,
    description: packageJson.description,
    version: packageJson.version,
    properties: {},
    triggers: triggers,
    actions,
    pieces: piece,
    auth,
  };
}

/**
 * Extract schema from bits module
 */
export async function extractBitsSchema(
  modulePathDir: string,
  mainFile: string,
  moduleName: string,
): Promise<any> {
  const packageJsonPath = path.join(modulePathDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  // Import module using customRequire to handle external paths
  const loadedModule = customRequire(mainFile, modulePathDir);

  // Extract bits piece from module
  const piece = extractBitsPieceFromModule(loadedModule);
  if (!piece) {
    throw new Error(`Failed to extract bits piece from module ${moduleName}`);
  }

  const auth = piece.auth;
  const actions = piece.actions();
  const triggers = piece.triggers();

  // Process actions to resolve dynamic options if needed
  for (const key of Object.keys(actions || {})) {
    const action = actions[key];
    if (action && action.props) {
      for (const prop of Object.values(action.props) as any[]) {
        if (typeof prop.options === "function") {
          try {
            const options = await prop.options();
            prop.resolvedOptions = options;
          } catch (error) {
            // Ignore option resolution errors
          }
        }
      }
    }
  }

  // Process triggers to resolve dynamic options if needed
  for (const key of Object.keys(triggers || {})) {
    const trigger = triggers[key];
    if (trigger && trigger.props) {
      for (const prop of Object.values(trigger.props) as any[]) {
        if (typeof prop.options === "function") {
          try {
            const options = await prop.options();
            prop.resolvedOptions = options;
          } catch (error) {
            // Ignore option resolution errors
          }
        }
      }
    }
  }

  return {
    framework: "bits",
    displayName: piece.displayName || packageJson.displayName || moduleName,
    name: packageJson.name || moduleName,
    logoUrl: piece.logoUrl,
    description: piece.description || packageJson.description,
    version: packageJson.version,
    properties: {},
    triggers: triggers,
    actions,
    pieces: piece,
    auth,
  };
}
