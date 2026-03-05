/**
 * Security Controller
 * Handles: GET /api/security/capabilities, POST /api/security/generate-policy
 */

import { Request, Response } from 'express';
import { createResponse } from '../helpers';

// Cache the result of the intersect package check
let intersectPackageAvailable: boolean | null = null;
let intersectPackageError: string | null = null;

/**
 * Check if @codenteam/intersect package is available
 */
async function checkIntersectPackage(): Promise<{ available: boolean; error?: string }> {
  if (intersectPackageAvailable !== null) {
    return { available: intersectPackageAvailable, error: intersectPackageError || undefined };
  }

  try {
    // @ts-ignore - @codenteam/intersect is an optional private package
    const intersect = await import('@codenteam/intersect');
    if (typeof intersect.generateNodePolicy === 'function') {
      intersectPackageAvailable = true;
      return { available: true };
    } else {
      intersectPackageAvailable = false;
      intersectPackageError = 'generateNodePolicy function not found in @codenteam/intersect';
      return { available: false, error: intersectPackageError };
    }
  } catch (error: any) {
    intersectPackageAvailable = false;
    intersectPackageError =
      error.code === 'ERR_MODULE_NOT_FOUND' || error.code === 'MODULE_NOT_FOUND'
        ? '@codenteam/intersect package is not installed. This is a private package requiring access to the private registry.'
        : `Failed to load @codenteam/intersect: ${error.message}`;
    return { available: false, error: intersectPackageError };
  }
}

export class SecurityController {
  /**
   * GET /api/security/capabilities
   * Check available security capabilities
   */
  getCapabilities = async (req: Request, res: Response): Promise<void> => {
    try {
      const { available, error } = await checkIntersectPackage();
      res.json(
        createResponse(true, {
          intersectAvailable: available,
          capabilities: {
            generateNodePolicy: available,
            dlpScanning: available,
            piiProtection: available,
            contentModeration: available,
            supplyChainIntegrity: available,
          },
          error: error,
          registryInfo: !available
            ? 'Security features require @codenteam/intersect package from the private Codenteam registry.'
            : undefined,
        }),
      );
    } catch (error: any) {
      res.json(createResponse(false, undefined, error.message));
    }
  };

  /**
   * POST /api/security/generate-policy
   * Generate node policy for a set of habits/nodes
   */
  generatePolicy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { available, error } = await checkIntersectPackage();
      if (!available) {
        res.status(400).json(
          createResponse(false, undefined, error || '@codenteam/intersect package is not available'),
        );
        return;
      }

      const { nodes, habits } = req.body;
      if (!nodes && !habits) {
        res.status(400).json(
          createResponse(false, undefined, 'nodes or habits array is required'),
        );
        return;
      }

      // @ts-ignore - @codenteam/intersect is an optional private package
      const intersect = await import('@codenteam/intersect');
      const policy = await intersect.generateNodePolicy(nodes || habits);
      res.json(createResponse(true, { policy }));
    } catch (error: any) {
      res.json(createResponse(false, undefined, error.message));
    }
  };
}
