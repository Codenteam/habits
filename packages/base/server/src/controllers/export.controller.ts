/**
 * Export Controller
 * Handles: POST /api/export/pack/habit
 */

import { Request, Response } from 'express';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createResponse } from '../helpers';
import { runPackCommand } from '../pack';

export class ExportController {
  /**
   * POST /api/export/pack/habit
   * Generate .habit file via the same pack pipeline as `habits pack --format habit`
   */
  packHabit = async (req: Request, res: Response): Promise<void> => {
    let tmpDir: string | null = null;

    try {
      const { stackYaml, habitFiles, stackName, envContent, frontendHtml, frontendYaml } = req.body;

      if (!stackYaml) {
        res.status(400).json(createResponse(false, undefined, 'stackYaml is required'));
        return;
      }

      if (!habitFiles || !Array.isArray(habitFiles) || habitFiles.length === 0) {
        res.status(400).json(createResponse(false, undefined, 'habitFiles array is required'));
        return;
      }

      for (const h of habitFiles) {
        if (!h.filename || typeof h.filename !== 'string') {
          res.status(400).json(createResponse(false, undefined, 'Each habitFile must have a valid filename'));
          return;
        }
        if (h.filename.includes('..') || h.filename.includes('\\') || /^[a-zA-Z]:/.test(h.filename) || h.filename.startsWith('/')) {
          res.status(400).json(createResponse(false, undefined, `Invalid filename: ${h.filename}. Filenames must be safe relative paths.`));
          return;
        }
      }

      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'habit-export-'));
      const configPath = path.join(tmpDir, 'stack.yaml');
      fs.writeFileSync(configPath, stackYaml);

      for (const h of habitFiles) {
        const habitPath = path.join(tmpDir, h.filename);
        fs.mkdirSync(path.dirname(habitPath), { recursive: true });
        fs.writeFileSync(habitPath, h.content);
      }

      if (envContent) {
        fs.writeFileSync(path.join(tmpDir, '.env'), envContent);
      }

      if (frontendHtml || frontendYaml) {
        const frontendDir = path.join(tmpDir, 'frontend');
        fs.mkdirSync(frontendDir, { recursive: true });
        if (frontendYaml) {
          fs.writeFileSync(path.join(frontendDir, 'index.yaml'), frontendYaml);
        }
        if (frontendHtml) {
          fs.writeFileSync(path.join(frontendDir, 'index.html'), frontendHtml);
        }

        const stackLines = stackYaml.split('\n');
        const hasFrontendRef = stackLines.some((line: string) => /^\s*frontend\s*:/.test(line));
        if (!hasFrontendRef) {
          const serverIdx = stackLines.findIndex((line: string) => /^server\s*:/.test(line));
          if (serverIdx >= 0) {
            stackLines.splice(serverIdx + 1, 0, '  frontend: ./frontend');
          } else {
            stackLines.push('server:', '  frontend: ./frontend');
          }
          fs.writeFileSync(configPath, stackLines.join('\n'));
        }
      }

      const outputPath = path.join(tmpDir, 'output.habit');
      const result = await runPackCommand({
        config: configPath,
        format: 'habit',
        output: outputPath,
        includeEnv: !!envContent,
        appName: stackName,
      });

      if (!result.success || !result.outputPath) {
        res.status(500).json(createResponse(false, undefined, result.error || 'Habit export failed'));
        return;
      }

      const buffer = fs.readFileSync(result.outputPath);
      const safeName = (stackName || 'habits').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}.habit"`);
      res.send(buffer);
    } catch (e: any) {
      console.error('Habit export error:', e);
      res.status(500).json(createResponse(false, undefined, e.message));
    } finally {
      if (tmpDir) {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  };
}
