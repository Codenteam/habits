/**
 * Module schema extraction helpers for bits framework
 */

import * as fs from "fs";
import * as path from "path";
import { customRequire } from "@ha-bits/cortex/utils/customRequire";
import { extractBitsPieceFromModule } from "@ha-bits/cortex/bits/bitsRoutine";

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
  // routines/cues can be either functions or plain objects depending on the bit framework version
  const routines = typeof piece.routines === 'function' ? piece.routines() : (piece.routines || {});
  const cues = typeof piece.cues === 'function' ? piece.cues() : (piece.cues || {});

  // Process routines to resolve dynamic options if needed
  for (const key of Object.keys(routines || {})) {
    const routine = routines[key];
    if (routine && routine.props) {
      for (const prop of Object.values(routine.props) as any[]) {
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

  // Process cues to resolve dynamic options if needed
  for (const key of Object.keys(cues || {})) {
    const cue = cues[key];
    if (cue && cue.props) {
      for (const prop of Object.values(cue.props) as any[]) {
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
    triggers: cues,
    actions: routines,
    pieces: piece,
    auth,
  };
}
