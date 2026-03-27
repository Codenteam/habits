/**
 * HabitsServer - Unified server combining Cortex workflow executor and Base module manager
 * 
 * This module provides the HTTP server for:
 * - Cortex workflow execution API
 * - Base module management API
 * - Serving both Cortex and Base UIs
 */

import express, { Application, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { startServer as startCortexServer, WorkflowExecutorServer, customRequire } from '@ha-bits/cortex';
import { findBaseServerPath, findUiPath } from "@ha-bits/core/pathUtils";
export interface HabitsServerOptions {
  /** Path to config file for workflows */
  configPath: string;
  /** Port to listen on (optional, defaults to 3000) */
  port?: number;
}



/**
 * Extend the cortex server with additional UI routes
 */
async function setupUiRoutes(app: Application): Promise<void> {
  // Find UI paths
  const cortexUiPath = findUiPath('cortex-ui');
  const baseUiPath = findUiPath('base-ui');

  // Rewrite /habits/*/api to /api for UI compatibility  
  app.use((req: Request, res: Response, next) => {
    if (req.path.startsWith('/habits/cortex/api')) {
      req.url = req.url.replace('/habits/cortex/api', '/api');
    } else if (req.path.startsWith('/habits/base/api')) {
      req.url = req.url.replace('/habits/base/api', '/api');
    }
    next();
  });

  // Serve Cortex UI
  if (cortexUiPath) {
    console.log(`🎨 Serving Cortex UI from: ${cortexUiPath} at /habits/cortex`);
    app.use('/habits/cortex', express.static(cortexUiPath));
    
    // SPA fallback for cortex UI
    app.get('/habits/cortex/{*splat}', (req: Request, res: Response, next) => {
      const indexPath = path.join(cortexUiPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });
  } else {
    console.log(`⚠️  Cortex UI not found`);
  }

  // Serve Base UI
  if (baseUiPath) {
    console.log(`🎨 Serving Base UI from: ${baseUiPath} at /habits/base`);
    app.use('/habits/base', express.static(baseUiPath));
    
    // SPA fallback for base UI
    app.get('/habits/base/{*splat}', (req: Request, res: Response, next) => {
      const indexPath = path.join(baseUiPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });
  } else {
    console.log(`⚠️  Base UI not found`);
  }

  // Root landing page with links
  const originalRootHandler = app._router?.stack?.find(
    (layer: any) => layer.route?.path === '/' && layer.route?.methods?.get
  );

  // Override root to show links to UIs
  app.get('/', (req: Request, res: Response, next) => {
    // If there's a frontend configured in cortex, let it handle
    if (originalRootHandler) {
      return next();
    }

    const links: string[] = [];
    if (cortexUiPath) links.push('<li><a href="/habits/cortex">Cortex - Workflow Executor</a></li>');
    if (baseUiPath) links.push('<li><a href="/habits/base">Base - Module Manager</a></li>');

    if (links.length > 0) {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Habits</title></head>
        <body>
          <h1>🔄 Habits - Automation Platform</h1>
          <ul>${links.join('')}</ul>
          <hr>
          <p>API: <a href="/misc/workflows">/misc/workflows</a> | Health: <a href="/health">/health</a></p>
        </body>
        </html>
      `);
    } else {
      next();
    }
  });
}

/**
 * Start the Habits server with UI support
 */
export async function startHabitsServer(options: HabitsServerOptions): Promise<WorkflowExecutorServer> {
  const server = await startCortexServer(options.configPath, options.port);
  
  // Get the express app from the server and add UI routes
  const app = (server as any).app as Application;
  if (app) {
    await setupUiRoutes(app);
    console.log('\n📦 UI routes configured');
  }
  
  return server;
}

export interface BaseServerOptions {
  /** Port to listen on (optional, defaults to 3000) */
  port?: number;
}

export interface BaseServer {
  stop(): Promise<void>;
}

/**
 * Start the Base server (edit mode) - serves only the Base UI and API
 */
export async function startBaseServer(options: BaseServerOptions): Promise<BaseServer> {
  // Dynamic import to avoid loading base server code when not needed
  const baseServerPath = findBaseServerPath();
  
  if (!baseServerPath) {
    throw new Error('Base server module not found. Make sure @ha-bits/base is built.');
  }
  
  // Set PORT env var before importing the base server (it reads from env)
  if (options.port) {
    process.env.PORT = String(options.port);
  }
  
  // Set templates path env var (for ncc bundle where __dirname doesn't work)
  const baseServerDir = path.dirname(baseServerPath);
  const examplesPath = path.resolve(baseServerDir, '../examples');
  if (fs.existsSync(examplesPath)) {
    process.env.HABITS_TEMPLATES_PATH = examplesPath;
  }
  
  // The base server auto-starts on import (app.listen at bottom of file)
  // Use customRequire to dynamically require at runtime (includes semver pre-load fix)
  customRequire(baseServerPath, baseServerDir);
  
  const port = options.port || 3000;
  console.log(`\n🎨 Base UI available at: http://localhost:${port}/habits/base`);
  
  return {
    stop: async () => {
      // Base server doesn't export a stop function, process exit will clean up
      console.log('Base server stopped');
    }
  };
}


// Re-export for convenience
export { WorkflowExecutorServer };
