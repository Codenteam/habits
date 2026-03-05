/**
 * Execution Controller
 * Handles: POST /api/execute, GET /api/status/:execution_id
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createResponse, executeModule, executeModuleAsync, executionResults } from '../helpers';
import { ExecuteRequest } from '../types';

export class ExecutionController {
  /**
   * POST /api/execute
   * Execute a module synchronously or asynchronously
   */
  execute = async (req: Request, res: Response): Promise<void> => {
    const {
      framework,
      module,
      params = {},
      async_exec = false,
    }: ExecuteRequest = req.body;
    const executionId = uuidv4();

    try {
      if (!module) {
        res.json(createResponse(false, undefined, "Module path is required"));
        return;
      }

      if (async_exec) {
        // Execute asynchronously
        executeModuleAsync(executionId, framework, module, params);
        res.json(
          createResponse(
            true,
            { message: "Execution started", status: "running" },
            undefined,
            executionId,
          ),
        );
        return;
      } else {
        // Execute synchronously
        const result = await executeModule(framework, module, params);
        res.json(createResponse(true, result, undefined, executionId));
        return;
      }
    } catch (error: any) {
      res.json(createResponse(false, undefined, error.message));
    }
  };

  /**
   * GET /api/status/:execution_id
   * Get status of async execution
   */
  getStatus = (req: Request, res: Response): void => {
    const { execution_id } = req.params;

    if (!executionResults.has(execution_id)) {
      res.json(
        createResponse(false, undefined, "Execution not found or still running"),
      );
      return;
    }

    const result = executionResults.get(execution_id)!;
    res.json(
      createResponse(result.success, result.data, result.error, execution_id),
    );
  };
}
