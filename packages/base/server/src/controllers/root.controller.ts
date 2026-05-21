/**
 * Root Controller
 * Handles: GET /api/
 */

import { Request, Response } from 'express';
import { createResponse } from '../helpers';
import { getServerFlags } from '../flags';

export class RootController {
  /**
   * GET /api/
   * Returns API info and documentation link
   */
  getRoot = (req: Request, res: Response): void => {
    res.json({
      message: "Habits API",
      version: "1.0.0",
      documentation: "/docs",
    });
  };

  /**
   * GET /api/flags
   * Returns the current feature flags so the UI can disable guarded controls.
   */
  getFlags = (_req: Request, res: Response): void => {
    res.json(createResponse(true, getServerFlags()));
  };
}
