/**
 * Habits Base Server
 * 
 * This is the main entry point for the Habits Base API server.
 * Route handlers are organized into controllers in the controllers/ directory.
 */

import express, { Request, Response } from "express";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { getBaseUiDistPath } from "@ha-bits/core";
import { setupRoutes } from "./setupRoutes";
import { createResponse } from "./helpers";

const base = "/api";
const uiApiBase = "/habits/base/api"; // UI sends requests here, we rewrite to /api

// Load .env from server directory first, then fall back to workspace root
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config(); // Also load from cwd for workspace-level .env

const app = express();

// Rewrite /habits/base/api/* to /api/* for UI compatibility (must be before json parser)
// On intersect, habits is hosted behind nginx on *.intersect.site/habits, in npx mode, there is no nginx, making the rewrite the responsibility of node... 
app.use((req: Request, res: Response, next) => {
  if (req.path.startsWith(uiApiBase)) {
    req.url = req.url.replace(uiApiBase, base);
  }
  next();
});

app.use(express.json({ limit: '1000mb' }));
app.use(express.urlencoded({ extended: true, limit: '1000mb' }));

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

// ============================================================================
// UI Static Files Serving
// ============================================================================

/**
 * Setup static file serving for the UI
 */
function setupStaticUI() {
  const uiPath = getBaseUiDistPath();
  const uiBasePath = '/habits/base'; // Must match vite.config.ts base setting
  
  if (fs.existsSync(uiPath) && fs.existsSync(path.join(uiPath, 'index.html'))) {
    console.log(`📦 Serving UI from: ${uiPath} at ${uiBasePath}`);
    
    // Serve static files under /habits/base/ path (matches vite base config)
    app.use(uiBasePath, express.static(uiPath));
    
    // Redirect root to /habits/base/
    app.get('/', (req: Request, res: Response) => {
      res.redirect(uiBasePath + '/');
    });
    
    // SPA fallback - serve index.html for /habits/base/* routes
    app.get(`${uiBasePath}/{*splat}`, (req: Request, res: Response, next) => {
      const indexPath = path.join(uiPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });
  } else {
    console.log(`⚠️ UI not found at: ${uiPath}. Running in API-only mode.`);
  }
}

// ============================================================================
// Setup Routes and Start Server
// ============================================================================

// Setup API routes (controllers handle all route logic)
setupRoutes(app, {
  basePath: base,
  port: Number(PORT),
});

// Setup static UI serving (must be after API routes but before 404 handler)
setupStaticUI();

// Catch all 404 for API routes only
app.use((req: Request, res: Response) => {
  // Only return 404 JSON for API routes
  if (req.path.startsWith('/api')) {
    res
      .status(404)
      .json(
        createResponse(false, undefined, `Endpoint ${req.originalUrl} not found`),
      );
  } else {
    // For non-API routes, if we get here it means UI wasn't found
    res.status(404).send('Not Found');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Habits API running on http://${HOST}:${PORT}`);
});
