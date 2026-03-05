/**
 * Base Routes - API routes for module management and execution
 * 
 * Provides routes for:
 * - Module listing, installation, and schema retrieval
 * - Form validation and auth verification
 * - Workflow server start/stop
 */

import { Application, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { executeN8nModule } from '@ha-bits/cortex/n8n/n8nExecutor';
import { executeActivepiecesModule } from '@ha-bits/cortex/activepieces/activepiecesExecutor';
import { listModules } from '@ha-bits/cortex/utils/moduleManager';
import { WorkflowExecutor, generateOpenAPISpec, WorkflowExecutorServer } from '@ha-bits/cortex';
import {
  getModuleByPath,
  addModule,
  getModuleName,
  isModuleCloned,
  isModuleBuilt,
} from '@ha-bits/cortex/utils/moduleLoader';
import {
  ensureModuleReady,
  getModuleMainFile,
  getModulePath,
  ModuleDefinition,
} from '@ha-bits/cortex/utils/moduleCloner';
import { customRequire } from '@ha-bits/cortex/utils/customRequire';
import { getNodesBasePath } from '@ha-bits/cortex/utils/utils';
import { extractPieceFromModule } from '@activepieces/shared';
import { Piece, Action } from '@activepieces/pieces-framework';

export interface BaseRoutesConfig {
  /** Base path for API routes (default: /api) */
  apiPrefix?: string;
  /** Logger instance */
  logger?: Console;
}

interface StandardResponse {
  success: boolean;
  data?: any;
  error?: string;
  execution_id?: string;
  timestamp: string;
}

// Store async execution results
const executionResults = new Map<string, any>();

// Workflow server instance management
let workflowServerInstance: WorkflowExecutorServer | null = null;
let workflowServerPort: number = 0;

function createResponse(
  success: boolean,
  data?: any,
  error?: string,
  execution_id?: string,
): StandardResponse {
  return {
    success,
    data,
    error,
    execution_id,
    timestamp: new Date().toISOString(),
  };
}

async function executeModule(
  framework: string,
  moduleName: string,
  params: Record<string, any>,
): Promise<any> {
  if (framework === 'n8n') {
    return await executeN8nModule(moduleName, params);
  } else if (framework === 'activepieces') {
    return await executeActivepiecesModule({
      source: 'npm',
      framework,
      moduleName,
      params,
    });
  } else {
    throw new Error(`Unknown framework: ${framework}`);
  }
}

async function executeModuleAsync(
  executionId: string,
  framework: string,
  module: string,
  params: Record<string, any>,
) {
  try {
    const result = await executeModule(framework, module, params);
    executionResults.set(executionId, {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    executionResults.set(executionId, {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Setup base routes on an Express application
 */
export function setupBaseRoutes(app: Application, config: BaseRoutesConfig = {}): void {
  const base = config.apiPrefix || '/api';
  const logger = config.logger || console;

  // Root endpoint
  app.get(base + '/', (req: Request, res: Response) => {
    res.json({
      message: 'Habits Automation API',
      version: '1.0.0',
      documentation: '/docs',
    });
  });

  // Execute module
  app.post(base + '/execute', async (req: Request, res: Response) => {
    const { framework, module, params = {}, async_exec = false } = req.body;
    const executionId = uuidv4();

    try {
      if (!module) {
        return res.json(createResponse(false, undefined, 'Module path is required'));
      }

      if (async_exec) {
        executeModuleAsync(executionId, framework, module, params);
        return res.json(
          createResponse(
            true,
            { message: 'Execution started', status: 'running' },
            undefined,
            executionId,
          ),
        );
      } else {
        const result = await executeModule(framework, module, params);
        return res.json(createResponse(true, result, undefined, executionId));
      }
    } catch (error: any) {
      return res.json(createResponse(false, undefined, error.message));
    }
  });

  // List modules
  app.get(base + '/modules', async (req: Request, res: Response) => {
    try {
      const framework = req.query.framework as string | undefined;
      const modules = await listModules(framework);
      return res.json(createResponse(true, modules));
    } catch (error: any) {
      return res.json(createResponse(false, undefined, error.message));
    }
  });

  // Get execution status
  app.get(base + '/status/:execution_id', (req: Request, res: Response) => {
    const { execution_id } = req.params;

    if (!executionResults.has(execution_id)) {
      return res.json(
        createResponse(false, undefined, 'Execution not found or still running'),
      );
    }

    const result = executionResults.get(execution_id);
    return res.json(
      createResponse(result.success, result.data, result.error, execution_id),
    );
  });

  // Install module
  app.post(base + '/modules/install', async (req: Request, res: Response) => {
    const { framework, module } = req.body;

    try {
      if (!module) {
        return res.json(createResponse(false, undefined, 'Module path is required'));
      }
      const modulePath = `${framework}/${module}`;
      const moduleDefinition = getModuleByPath(modulePath);

      if (!moduleDefinition) {
        return res.json(
          createResponse(false, undefined, `Module '${module}' not found in modules.json`),
        );
      }

      await ensureModuleReady(moduleDefinition);
      const moduleName = getModuleName(moduleDefinition);
      
      return res.json(
        createResponse(true, {
          message: `Module ${moduleName} installed successfully`,
          module: moduleDefinition,
        }),
      );
    } catch (error: any) {
      return res.json(createResponse(false, undefined, error.message));
    }
  });

  // Add module
  app.post(base + '/modules/add', async (req: Request, res: Response) => {
    const { framework, source, repository } = req.body;

    try {
      if (!framework || !source || !repository) {
        return res.json(
          createResponse(false, undefined, 'Framework, source, and repository are required'),
        );
      }

      if (!['github', 'npm'].includes(source)) {
        return res.json(
          createResponse(false, undefined, 'Source must be either "github" or "npm"'),
        );
      }

      const moduleDefinition: ModuleDefinition = {
        framework,
        source: source as 'github' | 'npm',
        repository,
      };

      addModule(moduleDefinition);
      await ensureModuleReady(moduleDefinition);
      const moduleName = getModuleName(moduleDefinition);

      return res.json(
        createResponse(true, {
          message: `Module ${moduleName} added and installed successfully`,
          module: moduleDefinition,
        }),
      );
    } catch (error: any) {
      return res.json(createResponse(false, undefined, error.message));
    }
  });

  // Check module availability
  app.get(base + '/modules/check/:framework/:moduleName', async (req: Request, res: Response) => {
    const { framework, moduleName } = req.params;

    try {
      const modulePath = `${framework}/${moduleName}`;
      let moduleDefinition = getModuleByPath(modulePath);

      // If module is not in config, create a temporary definition assuming npm source
      if (!moduleDefinition) {
        moduleDefinition = {
          framework,
          source: 'npm' as const,
          repository: moduleName
        };
      }

      const available = isModuleCloned(moduleDefinition) && isModuleBuilt(moduleDefinition);
      return res.json(createResponse(true, { available, module: moduleDefinition }));
    } catch (error: any) {
      return res.json(createResponse(false, undefined, error.message));
    }
  });

  // Get module schema
  app.get(base + '/modules/schema/:framework/:moduleName', async (req: Request, res: Response) => {
    const { framework, moduleName } = req.params;

    try {
      const modulePath = `${framework}/${moduleName}`;
      const moduleDefinition = getModuleByPath(modulePath);

      if (!moduleDefinition) {
        return res.json(createResponse(false, undefined, `Module '${modulePath}' not found`));
      }

      if (!isModuleCloned(moduleDefinition) || !isModuleBuilt(moduleDefinition)) {
        return res.json(createResponse(false, undefined, `Module '${modulePath}' is not installed`));
      }

      const modulePathDir = getModulePath(moduleDefinition);
      const mainFile = getModuleMainFile(moduleDefinition);

      if (!mainFile) {
        return res.json(createResponse(false, undefined, `Module main file not found for '${modulePath}'`));
      }

      let schema: any = {};

      if (framework === 'n8n') {
        schema = await extractN8nSchema(modulePathDir, mainFile, moduleName);
      } else if (framework === 'activepieces' || framework === 'bits') {
        schema = await extractBitsSchema(modulePathDir, mainFile, moduleName, logger, framework);
      }

      return res.json(createResponse(true, { schema }));
    } catch (error: any) {
      logger.error('Error:', error);
      return res.json(createResponse(false, undefined, error.message));
    }
  });

  // Form validation
  app.post(base + '/forms/validate', async (req: Request, res: Response) => {
    const { framework, moduleName, action, formData, auth, fieldId } = req.body;

    try {
      if (!framework || !moduleName || !action || !formData) {
        return res.json(
          createResponse(false, undefined, 'Framework, module name, action, and form data are required'),
        );
      }

      const modulePath = `${framework}/${moduleName}`;
      const moduleDefinition = getModuleByPath(modulePath);

      if (!moduleDefinition) {
        return res.json(createResponse(false, undefined, `Module '${modulePath}' not found`));
      }

      if (!isModuleCloned(moduleDefinition) || !isModuleBuilt(moduleDefinition)) {
        return res.json(createResponse(false, undefined, `Module '${modulePath}' is not installed`));
      }

      const validationResult = await validateFormData(
        framework,
        moduleDefinition,
        action,
        formData,
        auth,
        fieldId,
      );

      return res.json(createResponse(true, validationResult));
    } catch (error: any) {
      return res.json(createResponse(false, undefined, error.message));
    }
  });

  // Auth verification
  app.post(base + '/forms/verify-auth', async (req: Request, res: Response) => {
    const { framework, moduleName, auth } = req.body;

    try {
      if (!framework || !moduleName || !auth) {
        return res.json(
          createResponse(false, undefined, 'Framework, module name, and auth are required'),
        );
      }

      const modulePath = `${framework}/${moduleName}`;
      const moduleDefinition = getModuleByPath(modulePath);

      if (!moduleDefinition) {
        return res.json(createResponse(false, undefined, `Module '${modulePath}' not found`));
      }

      if (!isModuleCloned(moduleDefinition) || !isModuleBuilt(moduleDefinition)) {
        return res.json(createResponse(false, undefined, `Module '${modulePath}' is not installed`));
      }

      const verificationResult = await verifyAuthCredentials(framework, moduleDefinition, auth);
      return res.json(createResponse(true, verificationResult));
    } catch (error: any) {
      return res.json(createResponse(false, undefined, error.message));
    }
  });

  // Populate options
  app.post(base + '/forms/populate-options', async (req: Request, res: Response) => {
    const { framework, moduleId, actionName, fieldName, currentValues } = req.body;
    
    try {
      const moduleDefinition = getModuleByPath(`${framework}/${moduleId}`);
      if (!moduleDefinition) {
        throw new Error(`Module definition not found for ${framework}/${moduleId}`);
      }
      
      if (framework === 'n8n') {
        const modulePathDir = getModulePath(moduleDefinition);
        const mainFile = getModuleMainFile(moduleDefinition);
        if (!mainFile) {
          throw new Error('Module main file not found');
        }

        const module = customRequire(mainFile, modulePathDir);
        const nodeClass = module.default;
        const nodeInstance = new nodeClass();

        if (typeof nodeInstance.getOptions === 'function') {
          const options = await nodeInstance.getOptions(fieldName, currentValues);
          return res.json(createResponse(true, {
            options: options.map((opt: any) => ({
              label: opt.name || opt.label || opt.value,
              value: opt.value,
            }))
          }));
        }

        throw new Error('getOptions method not found on n8n node');
      } else if (framework === 'activepieces') {
        const modulePathDir = getModulePath(moduleDefinition);
        const mainFile = getModuleMainFile(moduleDefinition);
        if (!mainFile) {
          throw new Error('Module main file not found');
        }

        const module = customRequire(mainFile, modulePathDir);
        const packageJsonPath = path.join(modulePathDir, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        const piece = extractPieceFromModule<Piece>({
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
          throw new Error(`Property '${fieldName}' not found in action '${actionName}'`);
        }

        const options = await property.options(currentValues);
        const mappedOptions = options.options.map((opt: any) => ({
          label: opt.label,
          value: opt.value,
        }));
        
        return res.json(createResponse(true, { options: mappedOptions }));
      }
      
      return res.json(createResponse(false, undefined, 'No options found'));
    } catch (error: any) {
      return res.json(createResponse(false, undefined, error.message));
    }
  });

  // Serve start
  app.post(base + '/serve/start', async (req: Request, res: Response) => {
    try {
      // Check if serving is allowed in this instance
      const allowServe = process.env.HABITS_ALLOW_SERVE === 'true';
      if (!allowServe) {
        return res.json(
          createResponse(
            false,
            undefined,
            'Serving is not enabled on this instance. Set HABITS_ALLOW_SERVE=true to enable, or try self-hosting.',
          ),
        );
      }

      const { workflow, config, env } = req.body;

      if (!workflow || !config) {
        return res.json(createResponse(false, undefined, 'workflow and config are required'));
      }

      // Stop existing server if running
      if (workflowServerInstance) {
        await workflowServerInstance.stop();
        workflowServerInstance = null;
      }

      workflowServerPort = config.server?.port || 3001;

      // Parse env string to Record if provided as string
      let envRecord: Record<string, string> | undefined;
      if (env) {
        if (typeof env === 'string') {
          envRecord = {};
          for (const line of env.split('\n')) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
              const eqIndex = trimmed.indexOf('=');
              if (eqIndex > 0) {
                const key = trimmed.slice(0, eqIndex).trim();
                let value = trimmed.slice(eqIndex + 1).trim();
                if ((value.startsWith('"') && value.endsWith('"')) || 
                    (value.startsWith("'") && value.endsWith("'"))) {
                  value = value.slice(1, -1);
                }
                envRecord[key] = value;
              }
            }
          }
        } else {
          envRecord = env;
        }
      }

      // Build workflows map from the provided workflow
      const workflowId = workflow.id || config.workflows?.[0]?.id || 'workflow';
      const workflows = new Map<string, any>();
      workflows.set(workflowId, workflow);

      // Ensure config.workflows references the workflow correctly
      const configWithWorkflows = {
        ...config,
        workflows: config.workflows?.map((w: any) => ({
          ...w,
          id: w.id || workflowId,
          path: w.id || workflowId, // path is used as key in initFromData
        })) || [{ id: workflowId, path: workflowId }],
      };

      // Start the workflow executor server directly (no spawn)
      workflowServerInstance = new WorkflowExecutorServer();
      await workflowServerInstance.initFromData({
        config: configWithWorkflows,
        workflows,
        env: envRecord,
      });
      await workflowServerInstance.start(workflowServerPort);

      logger.log('[Workflow Server]: Started on port', workflowServerPort);

      return res.json(
        createResponse(true, {
          message: 'Workflow server started',
          port: workflowServerPort,
        }),
      );
    } catch (error: any) {
      return res.json(createResponse(false, undefined, error.message));
    }
  });

  // Serve stop
  app.post(base + '/serve/stop', async (req: Request, res: Response) => {
    try {
      if (!workflowServerInstance) {
        return res.json(createResponse(false, undefined, 'No workflow server is running'));
      }

      await workflowServerInstance.stop();
      workflowServerInstance = null;
      workflowServerPort = 0;

      return res.json(createResponse(true, { message: 'Workflow server stopped' }));
    } catch (error: any) {
      return res.json(createResponse(false, undefined, error.message));
    }
  });

  // Serve status
  app.get(base + '/serve/status', (req: Request, res: Response) => {
    return res.json(
      createResponse(true, {
        running: workflowServerInstance !== null,
        port: workflowServerPort,
        allowServe: process.env.HABITS_ALLOW_SERVE === 'true',
      }),
    );
  });

  // Generate OpenAPI spec from habit definition (direct code call, no server needed)
  app.post(base + '/serve/openapi', async (req: Request, res: Response) => {
    try {
      const { habit, serverUrl = 'http://localhost:3000' } = req.body;
      
      if (!habit) {
        return res.json(createResponse(false, undefined, 'Habit definition is required in request body'));
      }

      console.log('[OpenAPI] Received habit:', JSON.stringify(habit, null, 2).slice(0, 500));

      // Create executor and add the habit as a workflow
      const executor = new WorkflowExecutor();
      const workflowId = habit.id || habit.name || 'habit';
      executor.addWorkflow(habit, { id: workflowId });

      console.log('[OpenAPI] Added workflow with id:', workflowId);
      console.log('[OpenAPI] Loaded workflows count:', executor.getAllWorkflows().length);

      // Generate the full OpenAPI spec
      const fullSpec = generateOpenAPISpec(executor, serverUrl);

      console.log('[OpenAPI] Generated spec paths:', Object.keys(fullSpec.paths));

      // Extract only the execute endpoint paths (filter out base paths)
      const executePaths: Record<string, any> = {};
      for (const [pathKey, pathSpec] of Object.entries(fullSpec.paths)) {
        // Include paths that match /api/{id} execute pattern (not the /misc/* utility routes)
        if (pathKey.startsWith('/api/') && !pathKey.startsWith('/misc/')) {
          executePaths[pathKey] = pathSpec;
        }
      }

      console.log('[OpenAPI] Execute paths found:', Object.keys(executePaths));

      // Return filtered spec with only execute endpoints
      const executeSpec = {
        openapi: fullSpec.openapi,
        info: {
          title: `${habit.name || 'Habit'} Execute API`,
          description: 'OpenAPI spec for habit execute endpoint',
          version: '1.0.0',
        },
        paths: executePaths,
        components: fullSpec.components,
      };

      return res.json(createResponse(true, executeSpec));
    } catch (error: any) {
      console.error('[OpenAPI] Error:', error);
      return res.json(createResponse(false, undefined, `Failed to generate OpenAPI: ${error.message}`));
    }
  });
}

// Helper functions
async function extractN8nSchema(modulePathDir: string, mainFile: string, moduleName: string): Promise<any> {
  const packageJsonPath = path.join(modulePathDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const nodeFilePath = packageJson.n8n?.nodes?.[0];
  const nodeFullPath = nodeFilePath ? path.join(modulePathDir, nodeFilePath) : null;

  if (nodeFullPath && fs.existsSync(nodeFullPath)) {
    let nodeJson: any;
    
    if (nodeFullPath.endsWith('.node.json')) {
      nodeJson = JSON.parse(fs.readFileSync(nodeFullPath, 'utf8'));
    } else if (nodeFullPath.endsWith('.node.js')) {
      const nodeModule = customRequire(nodeFullPath, modulePathDir);
      
      for (const key of Object.keys(nodeModule)) {
        const exported = nodeModule[key];
        
        if (typeof exported === 'function' && exported.prototype) {
          let description = exported.prototype?.description || exported.description;
          
          if (!description) {
            try {
              const instance = new exported();
              description = instance.description;
            } catch (e) {
              // Could not instantiate
            }
          }

          if (description) {
            nodeJson = description;
            break;
          }
        }
      }
    }

    if (nodeJson) {
      return {
        framework: 'n8n',
        displayName: nodeJson.displayName,
        name: nodeJson.name,
        group: nodeJson.group || ['transform'],
        version: nodeJson.version || 1,
        description: nodeJson.description,
        defaults: nodeJson.defaults || {},
        inputs: nodeJson.inputs || ['main'],
        outputs: nodeJson.outputs || ['main'],
        properties: nodeJson.properties || [],
        credentials: nodeJson.credentials || [],
      };
    }
  }

  return {};
}

async function extractBitsSchema(
  modulePathDir: string, 
  mainFile: string, 
  moduleName: string,
  logger: Console,
  framework: string = 'bits'
): Promise<any> {
  try {
    const packageJsonPath = path.join(modulePathDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const module = customRequire(mainFile, modulePathDir);

      // For bits framework, modules export directly without needing extractPieceFromModule
      let piece: any;
      if (framework === 'bits') {
        // Bits modules export the piece object directly or as default
        piece = module.default || module[Object.keys(module).find(k => 
          module[k] && typeof module[k] === 'object' && 
          (module[k].actions || module[k].displayName)
        ) || ''] || module;
        
        // Normalize to piece-like structure
        if (piece && !piece.actions && !piece.triggers) {
          // Module might export actions directly
          piece = {
            displayName: piece.displayName || packageJson.displayName || moduleName,
            description: piece.description || packageJson.description,
            auth: piece.auth,
            actions: typeof piece.actions === 'function' ? piece.actions : () => piece.actions || {},
            triggers: typeof piece.triggers === 'function' ? piece.triggers : () => piece.triggers || {},
          };
        }
      } else {
        piece = extractPieceFromModule<Piece>({
          module,
          pieceName: moduleName,
          pieceVersion: packageJson.version,
        });
      }
      
      if (!piece) {
        throw new Error(`Failed to extract piece from module ${moduleName}`);
      }

      const auth = piece.auth;
      // Handle both function and object exports for actions/triggers
      const actions = typeof piece.actions === 'function' ? piece.actions() : (piece.actions || {});
      const triggers = typeof piece.triggers === 'function' ? piece.triggers() : (piece.triggers || {});
      
      // Resolve options for actions
      for (const keys of Object.keys(actions || {})) {
        const action = actions[keys];
        if (action && action.props) {
          for (const prop of Object.values(action.props) as any[]) {
            if (typeof prop.options === 'function') {
              try {
                const options = await prop.options();
                prop.resolvedOptions = options;
              } catch (error) {
                // Ignore option resolution errors
              }
            }
          }
        }
      }
      
      // Resolve options for triggers
      for (const keys of Object.keys(triggers || {})) {
        const trigger = triggers[keys];
        if (trigger && trigger.props) {
          for (const prop of Object.values(trigger.props) as any[]) {
            if (typeof prop.options === 'function') {
              try {
                const options = await prop.options();
                prop.resolvedOptions = options;
              } catch (error) {
                // Ignore option resolution errors
              }
            }
          }
        }
      }

      return {
        framework,
        displayName: packageJson.displayName || moduleName,
        name: packageJson.name || moduleName,
        description: packageJson.description,
        version: packageJson.version,
        properties: {},
        triggers: triggers,
        actions,
        pieces: piece,
        auth,
      };
    }
  } catch (error) {
    logger.error(`Error extracting ${framework} schema:`, error);
  }

  return {
    displayName: moduleName,
    name: moduleName,
    description: `${moduleName} ${framework} module`,
    properties: [],
  };
}

async function validateFormData(
  framework: string,
  moduleDefinition: any,
  action: string,
  formData: Record<string, any>,
  auth?: any,
  fieldId?: string,
): Promise<{ isValid: boolean; errors: Record<string, string>; validatedData?: Record<string, any> }> {
  const errors: Record<string, string> = {};
  let isValid = true;

  try {
    if (framework === 'activepieces') {
      const modulePathDir = getModulePath(moduleDefinition);
      const mainFile = getModuleMainFile(moduleDefinition);

      if (!mainFile) {
        throw new Error('Module main file not found');
      }

      const packageJsonPath = path.join(modulePathDir, 'package.json');
      const module = customRequire(mainFile, modulePathDir);
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      const piece = extractPieceFromModule<Piece>({
        module,
        pieceName: getModuleName(moduleDefinition),
        pieceVersion: packageJson.version,
      });

      if (piece.auth && piece.auth.required && !auth) {
        errors.auth = 'Authentication is required';
        isValid = false;
      }

      const actions = piece.actions() || {};
      const actionDefinition = actions[action];

      if (!actionDefinition) {
        errors._action = `Action '${action}' not found`;
        isValid = false;
        return { isValid, errors };
      }

      const props = actionDefinition.props || {};

      for (const [propKey, prop] of Object.entries(props)) {
        const value = formData[propKey];
        const propDef = prop as any;

        if (propDef.required && (value === undefined || value === null || value === '')) {
          errors[propKey] = `${propDef.displayName || propKey} is required`;
          isValid = false;
          continue;
        }

        if (value !== undefined && value !== null && value !== '') {
          const validationError = validateFieldValue(propKey, propDef, value);
          if (validationError) {
            errors[propKey] = validationError;
            isValid = false;
          }
        }
      }
    } else if (framework === 'n8n') {
      if (!formData.operation) {
        errors.operation = 'Operation is required';
        isValid = false;
      }
    }

    return {
      isValid,
      errors,
      validatedData: isValid ? { ...formData, auth: auth, _action: action } : undefined,
    };
  } catch (error: any) {
    return {
      isValid: false,
      errors: { _form: `Validation error: ${error.message}` },
    };
  }
}

async function verifyAuthCredentials(
  framework: string,
  moduleDefinition: any,
  auth: any,
): Promise<{ isValid: boolean; message: string }> {
  try {
    if (framework === 'activepieces') {
      const modulePathDir = getModulePath(moduleDefinition);
      const mainFile = getModuleMainFile(moduleDefinition);

      if (!mainFile) {
        throw new Error('Module main file not found');
      }

      const module = customRequire(mainFile, modulePathDir);
      const packageJsonPath = path.join(modulePathDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      const piece = extractPieceFromModule<Piece>({
        module,
        pieceName: moduleDefinition.name || packageJson.name,
        pieceVersion: packageJson.version,
      });

      if (!piece.auth) {
        return { isValid: true, message: 'No authentication required for this module' };
      }

      if (!auth || (typeof auth === 'string' && auth.trim().length === 0)) {
        return { isValid: false, message: 'Authentication credentials are required' };
      }

      if (piece.auth.type === 'SECRET_TEXT' && typeof auth === 'string') {
        if (auth.length < 10) {
          return { isValid: false, message: 'API key appears to be too short' };
        }
        return { isValid: true, message: 'Authentication credentials appear valid' };
      }

      return { isValid: true, message: 'Authentication format is valid' };
    } else if (framework === 'n8n') {
      if (!auth) {
        return { isValid: false, message: 'Authentication credentials are required' };
      }
      return { isValid: true, message: 'N8N authentication format is valid' };
    }

    return { isValid: false, message: 'Unsupported framework for auth verification' };
  } catch (error: any) {
    return { isValid: false, message: `Auth verification error: ${error.message}` };
  }
}

function validateFieldValue(fieldName: string, fieldDef: any, value: any): string | null {
  const fieldDisplayName = fieldDef.displayName || fieldName;

  switch (fieldDef.type) {
    case 'NUMBER':
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return `${fieldDisplayName} must be a valid number`;
      }
      break;

    case 'SHORT_TEXT':
      if (typeof value === 'string' && value.length > 255) {
        return `${fieldDisplayName} must be at most 255 characters`;
      }
      break;

    case 'LONG_TEXT':
      if (typeof value === 'string' && value.length > 10000) {
        return `${fieldDisplayName} must be at most 10,000 characters`;
      }
      break;

    case 'JSON':
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
        } catch {
          return `${fieldDisplayName} must be valid JSON`;
        }
      }
      break;

    case 'DROPDOWN':
    case 'STATIC_DROPDOWN':
      if (fieldDef.options && fieldDef.options.options) {
        const validValues = fieldDef.options.options.map((opt: any) => opt.value);
        if (!validValues.includes(value)) {
          return `${fieldDisplayName} must be one of: ${validValues.join(', ')}`;
        }
      }
      break;
  }

  return null;
}
