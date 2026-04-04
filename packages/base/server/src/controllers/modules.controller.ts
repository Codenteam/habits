/**
 * Modules Controller
 * Handles: GET /api/modules, POST /api/modules/install, POST /api/modules/add,
 *          GET /api/modules/check/:framework/:moduleName, GET /api/modules/schema/:framework/:moduleName
 */

import { Request, Response } from 'express';
import { createResponse, extractBitsSchema } from '../helpers';
import { listModules } from "@ha-bits/cortex-core/utils/moduleManager";
import {
  installModule,
  getModuleByPath,
  addModule,
  getModuleName,
  isModuleCloned,
  isModuleBuilt,
} from "@ha-bits/cortex-core/utils/moduleLoader";
import {
  ensureModuleReady,
  getModuleMainFile,
  getModulePath,
  ModuleDefinition,
} from "@ha-bits/cortex/utils/moduleCloner";
import { LoggerFactory } from '@ha-bits/core/logger';

const logger = LoggerFactory.getRoot();

export class ModulesController {
  /**
   * GET /api/modules
   * List all available modules, optionally filtered by framework
   */
  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const framework = req.query.framework as string | undefined;
      const modules = await listModules(framework);
      res.json(createResponse(true, modules));
    } catch (error: any) {
      res.json(createResponse(false, undefined, error.message));
    }
  };

  /**
   * POST /api/modules/install
   * Install a module by cloning and building
   */
  install = async (req: Request, res: Response): Promise<void> => {
    const { framework, module } = req.body;

    try {
      if (!module) {
        res.json(createResponse(false, undefined, "Module path is required"));
        return;
      }
      const modulePath = `${framework}/${module}`;
      const moduleDefinition = getModuleByPath(modulePath);

      if (!moduleDefinition) {
        res.json(
          createResponse(
            false,
            undefined,
            `Module '${module}' not found in modules.json`,
          ),
        );
        return;
      }

      // Install by cloning and building the module
      await ensureModuleReady(moduleDefinition);

      const moduleName = getModuleName(moduleDefinition);
      res.json(
        createResponse(true, {
          message: `Module ${moduleName} installed successfully`,
          module: moduleDefinition,
        }),
      );
    } catch (error: any) {
      res.json(createResponse(false, undefined, error.message));
    }
  };

  /**
   * POST /api/modules/add
   * Add a new module to the registry
   */
  add = async (req: Request, res: Response): Promise<void> => {
    const { framework, source, repository } = req.body;

    try {
      if (!framework || !source || !repository) {
        res.json(
          createResponse(
            false,
            undefined,
            "Framework, source, and repository are required",
          ),
        );
        return;
      }

      if (!["github", "npm"].includes(source)) {
        res.json(
          createResponse(
            false,
            undefined,
            'Source must be either "github" or "npm"',
          ),
        );
        return;
      }

      const moduleDefinition: ModuleDefinition = {
        framework,
        source: source as "github" | "npm",
        repository,
      };

      addModule(moduleDefinition);

      // Install the module (clone and build)
      await ensureModuleReady(moduleDefinition);

      const moduleName = getModuleName(moduleDefinition);

      res.json(
        createResponse(true, {
          message: `Module ${moduleName} added and installed successfully`,
          module: moduleDefinition,
        }),
      );
    } catch (error: any) {
      res.json(createResponse(false, undefined, error.message));
    }
  };

  /**
   * GET /api/modules/check/:framework/:moduleName
   * Check if a module is available (cloned and built)
   */
  check = async (req: Request, res: Response): Promise<void> => {
    const { framework, moduleName } = req.params;

    try {
      const modulePath = `${framework}/${moduleName}`;
      let moduleDefinition = getModuleByPath(modulePath);

      // If module is not in config, create a temporary definition assuming npm source
      if (!moduleDefinition) {
        moduleDefinition = {
          framework,
          source: 'npm' as const,
          repository: moduleName,
        };
      }
      const cloned = isModuleCloned(moduleDefinition)
      const built = isModuleBuilt(moduleDefinition);
      const available =
         cloned && built;

      res.json(
        createResponse(true, {
          cloned, 
          built,
          available,
          module: moduleDefinition,
        }),
      );
    } catch (error: any) {
      res.json(createResponse(false, undefined, error.message));
    }
  };

  /**
   * GET /api/modules/schema/:framework/:moduleName
   * Get the schema for a module
   */
  schema = async (req: Request, res: Response): Promise<void> => {
    const { framework, moduleName } = req.params;

    try {
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

      // Try to extract schema from module
      const modulePathDir = getModulePath(moduleDefinition);
      const mainFile = getModuleMainFile(moduleDefinition);

      if (!mainFile) {
        res.json(
          createResponse(
            false,
            undefined,
            `Module main file not found for '${modulePath}'`,
          ),
        );
        return;
      }


      let schema: any = {};

      if (framework === "bits") {
        try {
          schema = await extractBitsSchema(modulePathDir, mainFile, moduleName);
        } catch (error) {
          logger.error("Error extracting bits schema:", { error: String(error) });
          // Fallback schema
          schema = {
            framework: "bits",
            displayName: moduleName,
            name: moduleName,
            description: `${moduleName} bits module`,
            properties: [],
          };
        }
      } else {
        res.json(
          createResponse(
            false,
            undefined,
            `Unsupported framework '${framework}'. Supported frameworks: bits`,
          ),
        );
        return;
      }

      logger.debug("Schema generated", { schema: JSON.stringify(schema) });
      res.json(createResponse(true, { schema }));
    } catch (error: any) {
      console.error("Errorrr:", error);
      res.json(createResponse(false, undefined, error.message));
    }
  };
}
