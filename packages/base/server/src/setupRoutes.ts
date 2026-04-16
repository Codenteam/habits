/**
 * Route setup - instantiates controllers and binds routes
 */

import { Express, Router } from 'express';
import {
  RootController,
  ModulesController,
  ExecutionController,
  FormsController,
  TemplatesController,
  SecurityController,
  ExportController,
  CreatorController,
} from './controllers';
import { setupServeRoutes } from './serve';
import { createResponse } from './helpers';

/**
 * Setup all API routes with controller instances
 * @param app Express application
 * @param options Configuration options
 */
export function setupRoutes(
  app: Express,
  options: {
    basePath: string;
    port: number;
  },
): void {
  const { basePath, port } = options;

  // Instantiate controllers
  const rootController = new RootController();
  const modulesController = new ModulesController();
  const executionController = new ExecutionController();
  const formsController = new FormsController();
  const templatesController = new TemplatesController();
  const securityController = new SecurityController();
  const exportController = new ExportController();
  const creatorController = new CreatorController();

  // Root route
  app.get(basePath + '/', rootController.getRoot);

  // Execution routes
  app.post(basePath + '/execute', executionController.execute);
  app.get(basePath + '/status/:execution_id', executionController.getStatus);

  // Modules routes
  app.get(basePath + '/modules', modulesController.list);
  app.post(basePath + '/modules/install', modulesController.install);
  app.post(basePath + '/modules/add', modulesController.add);
  app.get(basePath + '/modules/check/:framework/:moduleName', modulesController.check);
  app.get(basePath + '/modules/schema/:framework/:moduleName', modulesController.schema);

  // Forms routes
  app.post(basePath + '/forms/validate', formsController.validate);
  app.post(basePath + '/forms/verify-auth', formsController.verifyAuth);
  app.post(basePath + '/forms/populate-options', formsController.populateOptions);

  // Templates routes
  app.get(basePath + '/templates/:templateName/{*filePath}', templatesController.serveTemplate);

  // Security routes
  app.get(basePath + '/security/capabilities', securityController.getCapabilities);
  app.post(basePath + '/security/generate-policy', securityController.generatePolicy);

  // Export routes
  app.get(basePath + '/export/binary/support', exportController.checkSupport);
  app.post(basePath + '/export/binary', exportController.generateBinary);
  app.post(basePath + '/export/pack/desktop', exportController.packDesktop);
  app.post(basePath + '/export/pack/mobile', exportController.packMobile);
  app.post(basePath + '/export/pack/docker', exportController.packDocker);
  app.post(basePath + '/export/pack/habit', exportController.packHabit);

  // Creator routes (AI generation)
  app.post(basePath + '/creator/create-habit', creatorController.createHabit);
  app.post(basePath + '/creator/create-bit', creatorController.createBit);

  // Setup serve routes (workflow server start/stop)
  setupServeRoutes(app, {
    basePath,
    port,
    createResponse,
  });
}
