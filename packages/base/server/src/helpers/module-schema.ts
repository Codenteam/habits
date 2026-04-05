/**
 * Module schema extraction helpers for bits framework
 */

import * as fs from "fs";
import * as path from "path";
import { customRequire } from "@ha-bits/cortex/utils/customRequire";
import { extractBitsPieceFromModule } from "@ha-bits/cortex/bits/bitsDoer";

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
