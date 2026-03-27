/**
 * Forms Controller
 * Handles: POST /api/forms/validate, POST /api/forms/verify-auth, POST /api/forms/populate-options
 */

import { Request, Response } from 'express';
import { createResponse, validateFormData, verifyAuthCredentials } from '../helpers';
import {
  getModuleByPath,
  getModuleName,
  isModuleCloned,
  isModuleBuilt,
} from "@ha-bits/cortex/utils/moduleLoader";
import {
  getModuleMainFile,
  getModulePath,
} from "@ha-bits/cortex/utils/moduleCloner";
import { customRequire } from "@ha-bits/cortex/utils/customRequire";
import { extractPiece } from '../helpers/activepieces-loader';
import { LoggerFactory } from '@ha-bits/core/logger';

// Type imports (compile-time only, not bundled)
import type { Action, Piece } from "@activepieces/pieces-framework";

const logger = LoggerFactory.getRoot();

export class FormsController {
  /**
   * POST /api/forms/validate
   * Validate form data for a module action
   */
  validate = async (req: Request, res: Response): Promise<void> => {
    const { framework, moduleName, action, formData, auth, fieldId } = req.body;

    try {
      if (!framework || !moduleName || !action || !formData) {
        res.json(
          createResponse(
            false,
            undefined,
            "Framework, module name, action, and form data are required",
          ),
        );
        return;
      }

      const modulePath = `${framework}/${moduleName}`;
      const moduleDefinition = getModuleByPath(modulePath);

      if (!moduleDefinition) {
        res.json(
          createResponse(false, undefined, `Module '${modulePath}' not found`),
        );
        return;
      }

      if (!isModuleCloned(moduleDefinition) || !isModuleBuilt(moduleDefinition)) {
        res.json(
          createResponse(
            false,
            undefined,
            `Module '${modulePath}' is not installed`,
          ),
        );
        return;
      }

      if (fieldId) {
        // Validate single field
        const validationResult = await validateFormData(
          framework,
          moduleDefinition,
          action,
          formData,
          auth,
          fieldId,
        );
        res.json(createResponse(true, validationResult));
        return;
      }

      const validationResult = await validateFormData(
        framework,
        moduleDefinition,
        action,
        formData,
        auth,
      );

      res.json(createResponse(true, validationResult));
    } catch (error: any) {
      res.json(createResponse(false, undefined, error.message));
    }
  };

  /**
   * POST /api/forms/verify-auth
   * Verify authentication credentials for a module
   */
  verifyAuth = async (req: Request, res: Response): Promise<void> => {
    const { framework, moduleName, auth } = req.body;

    try {
      if (!framework || !moduleName || !auth) {
        res.json(
          createResponse(
            false,
            undefined,
            "Framework, module name, and auth are required",
          ),
        );
        return;
      }

      const modulePath = `${framework}/${moduleName}`;
      const moduleDefinition = getModuleByPath(modulePath);

      if (!moduleDefinition) {
        res.json(
          createResponse(false, undefined, `Module '${modulePath}' not found`),
        );
        return;
      }

      if (!isModuleCloned(moduleDefinition) || !isModuleBuilt(moduleDefinition)) {
        res.json(
          createResponse(
            false,
            undefined,
            `Module '${modulePath}' is not installed`,
          ),
        );
        return;
      }

      const verificationResult = await verifyAuthCredentials(
        framework,
        moduleDefinition,
        auth,
      );

      res.json(createResponse(true, verificationResult));
    } catch (error: any) {
      res.json(createResponse(false, undefined, error.message));
    }
  };

  /**
   * POST /api/forms/populate-options
   * Populate options for a form field dropdown
   */
  populateOptions = async (req: Request, res: Response): Promise<void> => {
    const { framework, moduleId, actionName, fieldName, currentValues } = req.body;

    try {
      // Load module and get options
      const moduleDefinition = getModuleByPath(`${framework}/${moduleId}`);
      if (!moduleDefinition) {
        throw new Error(
          `Module definition not found for ${framework}/${moduleId}`,
        );
      }

      if (framework === "n8n") {
        const modulePathDir = getModulePath(moduleDefinition);
        const mainFile = getModuleMainFile(moduleDefinition);

        if (!mainFile) {
          throw new Error("Module main file not found");
        }

        const module = customRequire(mainFile, modulePathDir);
        const nodeClass = module.default;
        const nodeInstance = new nodeClass();

        if (typeof nodeInstance.getOptions === "function") {
          const options = await nodeInstance.getOptions(fieldName, currentValues);
          const mappedOptions = options.map((opt: any) => ({
            label: opt.name || opt.label || opt.value,
            value: opt.value,
          }));
          res.json(createResponse(true, { options: mappedOptions }));
          return;
        }

        throw new Error("getOptions method not found on n8n node");
      } else if (framework === "activepieces") {
        // Load Activepieces piece and call its method to get options
        const modulePathDir = getModulePath(moduleDefinition);
        const mainFile = getModuleMainFile(moduleDefinition);

        if (!mainFile) {
          throw new Error("Module main file not found");
        }

        const module = customRequire(mainFile, modulePathDir);
        const packageJsonPath = require("path").join(modulePathDir, "package.json");
        const packageJson = JSON.parse(
          require("fs").readFileSync(packageJsonPath, "utf8"),
        );

        const piece = await extractPiece<Piece>({
          module,
          pieceName: getModuleName(moduleDefinition),
          pieceVersion: packageJson.version,
        });

        const actions = piece.actions() || {};
        const action = actions[actionName] as Action<any>;

        if (!action) {
          throw new Error(`Action '${actionName}' not found`);
        }

        const props = action.props || {};
        const property = props[fieldName];

        if (!property) {
          throw new Error(
            `Property '${fieldName}' not found in action '${actionName}'`,
          );
        }

        const options = await property.options(currentValues);
        logger.log(currentValues, options);

        const mappedOptions = options.options.map((opt: any) => ({
          label: opt.label,
          value: opt.value,
        }));

        res.json(createResponse(true, { options: mappedOptions }));
        return;
      }

      res.json(createResponse(false, undefined, "No options found"));
    } catch (error: any) {
      res.json(createResponse(false, undefined, error.message));
    }
  };
}
