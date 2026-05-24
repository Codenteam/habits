import { Request, Response } from 'express';
import {
  validateHabitLab,
  validateHabitLabDryRun,
  type HabitLabValidationReport,
  type HabitLabDryRunReport,
} from '@ha-bits/cortex-lab';
import type { BuildHabitGraphInput } from '@ha-bits/cortex-lab/graph';
import { buildEditorGraphInput } from '../../../ui/src/lib/validation/buildEditorGraphInput';
import { createResponse } from '../helpers';

function parseGraphInput(body: unknown): BuildHabitGraphInput | { error: string } {
  const { habits, frontendYaml, envContent, graphInput } = (body ?? {}) as Record<string, unknown>;

  if (graphInput && typeof graphInput === 'object') {
    return graphInput as BuildHabitGraphInput;
  }

  if (!Array.isArray(habits) || habits.length === 0) {
    return { error: 'habits array or graphInput is required' };
  }

  return buildEditorGraphInput({
    habits: habits as Parameters<typeof buildEditorGraphInput>[0]['habits'],
    frontendYaml: (frontendYaml as string | null | undefined) ?? null,
    envContent: (envContent as string | undefined) ?? '',
  });
}

export class LabController {
  validate = async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = parseGraphInput(req.body);
      if ('error' in parsed) {
        res.status(400).json(createResponse(false, undefined, parsed.error));
        return;
      }

      const { strict } = req.body ?? {};
      const report: HabitLabValidationReport = await validateHabitLab(parsed, {
        strict: strict === true,
      });

      res.status(report.ok ? 200 : 422).json(createResponse(report.ok, report));
    } catch (error: any) {
      res.status(500).json(createResponse(false, undefined, error?.message || String(error)));
    }
  };

  dryRun = async (req: Request, res: Response): Promise<void> => {
    try {
      const parsed = parseGraphInput(req.body);
      if ('error' in parsed) {
        res.status(400).json(createResponse(false, undefined, parsed.error));
        return;
      }

      const report: HabitLabDryRunReport = await validateHabitLabDryRun(parsed);
      res.status(report.ok ? 200 : 422).json(createResponse(report.ok, report));
    } catch (error: any) {
      res.status(500).json(createResponse(false, undefined, error?.message || String(error)));
    }
  };
}
