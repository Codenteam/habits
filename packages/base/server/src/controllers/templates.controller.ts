/**
 * Templates Controller
 * Handles: GET /api/templates/:templateName/*
 */

import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { createResponse } from '../helpers';
import { getTemplatesBasePath } from '@ha-bits/core';

export class TemplatesController {
  /**
   * GET /api/templates/:templateName/*
   * Serve template files
   */
  serveTemplate = (req: Request, res: Response): void => {
    const templatesPath = getTemplatesBasePath();
    const templateName = req.params.templateName;
    // filePath can be an array (Express wildcard param) or string, ensure it's a string
    const filePath = Array.isArray(req.params.filePath)
      ? req.params.filePath.join('/')
      : req.params.filePath;

    const fullPath = path.join(templatesPath, templateName, filePath);

    // Security: prevent path traversal
    const resolvedPath = path.resolve(fullPath);
    const resolvedTemplatesPath = path.resolve(templatesPath);
    if (!resolvedPath.startsWith(resolvedTemplatesPath)) {
      res.status(403).json(createResponse(false, undefined, 'Access denied'));
      return;
    }

    if (fs.existsSync(fullPath)) {
      const ext = path.extname(fullPath).toLowerCase();
      const basename = path.basename(fullPath);
      const mimeTypes: Record<string, string> = {
        '.json': 'application/json',
        '.yaml': 'text/yaml',
        '.yml': 'text/yaml',
        '.html': 'text/html',
        '.htm': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.env': 'text/plain',
        '.gitignore': 'text/plain',
        '.npmrc': 'text/plain',
      };

      // Determine MIME type: check extension first, then basename for dotfiles
      const mimeType = mimeTypes[ext] || mimeTypes[basename] || 'text/plain';
      res.setHeader('Content-Type', mimeType);

      // Use readFileSync for all template files (they're small config files)
      const content = fs.readFileSync(fullPath, 'utf-8');
      res.send(content);
    } else {
      res.status(404).json(
        createResponse(false, undefined, `Template file not found: ${templateName}/${filePath}`),
      );
    }
  };
}
