/**
 * ActivePieces JIT (Just-In-Time) Loader
 * 
 * This module provides lazy loading of @activepieces packages.
 * Dependencies are installed on-demand when first needed, rather than
 * being bundled with the package. This reduces install size for users
 * who don't use ActivePieces modules.
 * 
 * Usage:
 *   const { extractPieceFromModule } = await getActivepiecesShared();
 *   const piece = extractPieceFromModule<Piece>({ module, pieceName, pieceVersion });
 */

import { ensureActivepiecesReady } from '@ha-bits/cortex/utils/moduleCloner';

// Cached modules - loaded once on first use
let sharedModule: typeof import('@activepieces/shared') | null = null;
let frameworkModule: typeof import('@activepieces/pieces-framework') | null = null;

/**
 * Ensures ActivePieces dependencies are installed and loads @activepieces/shared.
 * Call this before using extractPieceFromModule or other shared utilities.
 * 
 * @returns The @activepieces/shared module
 * @throws Error if installation or loading fails
 */
export async function getActivepiecesShared(): Promise<typeof import('@activepieces/shared')> {
  if (sharedModule) return sharedModule;
  
  // Ensure dependencies are installed (JIT installation)
  const nodeModulesPath = await ensureActivepiecesReady();
  if (!nodeModulesPath) {
    throw new Error(
      'Failed to install ActivePieces dependencies. ' +
      'Check network connectivity and npm registry access.'
    );
  }
  
  // Dynamic import after dependencies are ready
  sharedModule = await import('@activepieces/shared');
  return sharedModule;
}

/**
 * Ensures ActivePieces dependencies are installed and loads @activepieces/pieces-framework.
 * Call this before using Piece, Action, or other framework types at runtime.
 * 
 * @returns The @activepieces/pieces-framework module
 * @throws Error if installation or loading fails
 */
export async function getActivepiecesFramework(): Promise<typeof import('@activepieces/pieces-framework')> {
  if (frameworkModule) return frameworkModule;
  
  // Ensure dependencies are installed (JIT installation)
  const nodeModulesPath = await ensureActivepiecesReady();
  if (!nodeModulesPath) {
    throw new Error(
      'Failed to install ActivePieces dependencies. ' +
      'Check network connectivity and npm registry access.'
    );
  }
  
  // Dynamic import after dependencies are ready
  frameworkModule = await import('@activepieces/pieces-framework');
  return frameworkModule;
}

/**
 * Convenience function to extract a piece from a loaded module.
 * Handles the JIT loading of @activepieces/shared automatically.
 * 
 * @param params - Parameters for extractPieceFromModule
 * @returns The extracted Piece
 */
export async function extractPiece<T>(params: {
  module: any;
  pieceName: string;
  pieceVersion: string;
}): Promise<T> {
  const { extractPieceFromModule } = await getActivepiecesShared();
  return extractPieceFromModule<T>(params);
}

/**
 * Check if ActivePieces dependencies are already loaded (cached).
 * Useful for avoiding unnecessary async calls in hot paths.
 */
export function isActivepiecesLoaded(): boolean {
  return sharedModule !== null;
}
