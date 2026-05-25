/**
 * UI Spec Controller
 * Handles: POST /api/ui/compile-yaml — compile a UiSpec YAML to HTML
 * for the live preview pane in the YAML UI builder.
 */

import { Request, Response } from 'express';
import { compileUiYaml } from '@ha-bits/cortex-core';
import { createResponse } from '../helpers';

export class UiController {
  /**
   * POST /api/ui/compile-yaml
   * Body: { yaml: string }
   * Returns: { html: string } on success, or { error } on failure.
   */
  compileYaml = (req: Request, res: Response): void => {
    try {
      const { yaml, builderPreview } = req.body ?? {};
      if (typeof yaml !== 'string' || !yaml.trim()) {
        res.status(400).json(createResponse(false, undefined, 'yaml string is required'));
        return;
      }
      const { html } = compileUiYaml(yaml, { builderPreview: !!builderPreview });
      res.json(createResponse(true, { html }));
    } catch (err: any) {
      const message = err && err.message ? err.message : String(err);
      res.status(200).json(createResponse(false, undefined, message));
    }
  };
}
