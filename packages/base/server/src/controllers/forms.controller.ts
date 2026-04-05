/**
 * Forms Controller
 * Handles: POST /api/forms/validate, POST /api/forms/verify-auth, POST /api/forms/populate-options
 * 
 * Supports: bits framework
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
import { extractBitsPieceFromModule } from "@ha-bits/cortex/bits/bitsDoer";
import { LoggerFactory } from '@ha-bits/core/logger';

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
   * 
   * Supports: bits framework
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

      if (framework === "bits") {
        // Load bits piece and call its method to get options
        const modulePathDir = getModulePath(moduleDefinition);
        const mainFile = getModuleMainFile(moduleDefinition);

        if (!mainFile) {
          throw new Error("Module main file not found");
        }

        const module = customRequire(mainFile, modulePathDir);
        
        // Extract bits piece from module
        const piece = extractBitsPieceFromModule(module);
        if (!piece) {
          throw new Error(`Failed to extract bits piece from module ${getModuleName(moduleDefinition)}`);
        }

        const actions = piece.actions() || {};
        const action = actions[actionName];

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

        if (typeof property.options !== 'function') {
          throw new Error(
            `Property '${fieldName}' does not have dynamic options`,
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

      res.json(createResponse(false, undefined, `Unsupported framework: ${framework}. Supported frameworks: bits`));
    } catch (error: any) {
      res.json(createResponse(false, undefined, error.message));
    }
  };
}
