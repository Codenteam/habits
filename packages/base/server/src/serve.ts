import { Request, Response, Express } from "express";
import * as fs from "fs";
import * as path from "path";
import { spawn, ChildProcess } from "child_process";
import { ExportBundle } from "@ha-bits/core";
import { getTmpDir } from "@ha-bits/core/pathUtils";
import { WorkflowExecutor, generateOpenAPISpec } from "@ha-bits/cortex";
import { execSync } from 'child_process';
// ============================================================================
// Serve State - Process Management
// ============================================================================

let workflowServerProcess: ChildProcess | null = null;
let workflowServerPort: number = 0;
let workflowServerTempDir: string | null = null;

const processName = "habits-cortex-serve";

// ============================================================================
// Serve State Accessors
// ============================================================================

export function getServeState() {
  return {
    process: workflowServerProcess,
    port: workflowServerPort,
    tempDir: workflowServerTempDir,
  };
}

// ============================================================================
// Setup Serve Routes
// ============================================================================

interface ServeRoutesOptions {
  basePath: string;
  port: number;
  createResponse: (success: boolean, data?: any, error?: string) => any;
}

export function setupServeRoutes(app: Express, options: ServeRoutesOptions) {
  const { basePath: base, port: mainServerPort, createResponse } = options;

  // Start workflow server
  app.post(base + "/serve/start", async (req: Request, res: Response) => {
    try {
      // Check if serving is allowed in this instance
      const allowServe = process.env.HABITS_ALLOW_SERVE === "true";
      if (!allowServe) {
        return res.json(
          createResponse(
            false,
            undefined,
            "Serving is not enabled on this instance. Set HABITS_ALLOW_SERVE=true to enable, or try self-hosting.",
          ),
        );
      }

      const { habitFiles, stackYaml, envFile, frontendHtml } = req.body as ExportBundle;

      if (!habitFiles || !stackYaml) {
        return res.json(
          createResponse(false, undefined, "habitFiles and stackYaml are required"),
        );
      }

      // Stop existing server if running
      if (workflowServerProcess) {
        workflowServerProcess.kill();
        workflowServerProcess = null;
      }

      // Also kill any orphaned habits-cortex-serve processes
      try {
        
        execSync(`killall ${processName} 2>/dev/null || true`, { stdio: 'ignore' });
        console.log(`[Workflow Server] Killed any existing ${processName} processes`);
      } catch (e) {
        // Ignore errors - process might not exist
      }

      // Clean up old temp dir
      if (workflowServerTempDir && fs.existsSync(workflowServerTempDir)) {
        fs.rmSync(workflowServerTempDir, { recursive: true, force: true });
      }

      
    

      // Create temp directory for workflow files
      workflowServerTempDir = fs.mkdtempSync(path.join(getTmpDir(), "habits-serve-"));
      
      
      for(let file of habitFiles) {
      const workflowPath = path.join(workflowServerTempDir, `${file.filename}`);
      fs.writeFileSync(workflowPath, file.content);
      }


      // Write config file with updated port as YAML
      const configPath = path.join(workflowServerTempDir, "stack.yaml");

      fs.writeFileSync(configPath, stackYaml);

      // Write env file if provided
      if (envFile) {
        const envPath = path.join(workflowServerTempDir, ".env");
          fs.writeFileSync(envPath, envFile);
      }

      // Write frontend HTML if provided
      if (frontendHtml) {
        const frontendDir = path.join(workflowServerTempDir, "frontend");
        fs.mkdirSync(frontendDir, { recursive: true });
        const frontendPath = path.join(frontendDir, "index.html");
        fs.writeFileSync(frontendPath, frontendHtml);
        console.log("[Workflow Server] Frontend written to:", frontendPath);
      }

      // Spawn cortex server
      const args = ["server", "--config", configPath];
      
      console.log("[Workflow Server] Spawning cortex with args:", args);
      console.log("[Workflow Server] Working directory:", workflowServerTempDir);

      // Determine whether to use local cortex or global npx
      // By default, use local cortex code. Set USE_GLOBAL_CORTEX=true to use npx.
      const useGlobalCortex = process.env.USE_GLOBAL_CORTEX === 'true';
      const workspaceRoot = process.cwd();
      
      let spawnCommand: string;
      let spawnArgs: string[];
      let spawnCwd: string;
      
      if (useGlobalCortex) {
        // Use globally installed cortex via npx
        console.log("[Workflow Server] Using global cortex via npx");
        spawnCommand = "npx";
        spawnArgs = ["@ha-bits/cortex", ...args];
        spawnCwd = workflowServerTempDir;
      } else {
        // Use local cortex code
        // Priority: 1. TypeScript source (dev mode), 2. Packed bundle, 3. Built output
        const possibleCortexConfigs = [
          // Dev mode: TypeScript source with tsx
          {
            path: path.join(workspaceRoot, 'packages/cortex/server/src/main.ts'),
            command: 'npx',
            args: ['tsx', 'packages/cortex/server/src/main.ts', ...args],
            cwd: workspaceRoot,
            label: 'TypeScript source (dev mode)'
          },
          // Prod: Packed bundle (can run from temp dir)
          {
            path: path.join(workspaceRoot, 'dist/packages/cortex/pack/index.cjs'),
            command: 'node',
            args: [path.join(workspaceRoot, 'dist/packages/cortex/pack/index.cjs'), ...args],
            cwd: workflowServerTempDir,
            label: 'Packed bundle'
          },
          // Prod: Built output (can run from temp dir)
          {
            path: path.join(workspaceRoot, 'dist/packages/cortex/server/main.cjs'),
            command: 'node',
            args: [path.join(workspaceRoot, 'dist/packages/cortex/server/main.cjs'), ...args],
            cwd: workflowServerTempDir,
            label: 'Built output'
          },
        ];
        
        let selectedConfig: typeof possibleCortexConfigs[0] | null = null;
        for (const config of possibleCortexConfigs) {
          if (fs.existsSync(config.path)) {
            selectedConfig = config;
            break;
          }
        }
        
        if (selectedConfig) {
          console.log(`[Workflow Server] Using local cortex: ${selectedConfig.label}`);
          console.log(`[Workflow Server] Path: ${selectedConfig.path}`);
          console.log(`[Workflow Server] Cwd: ${selectedConfig.cwd}`);
          spawnCommand = selectedConfig.command;
          spawnArgs = selectedConfig.args;
          spawnCwd = selectedConfig.cwd;
        } else {
          // Fallback to npx if local cortex not found
          console.log("[Workflow Server] Local cortex not found, falling back to npx");
          spawnCommand = "npx";
          spawnArgs = ["@ha-bits/cortex", ...args];
          spawnCwd = workflowServerTempDir;
        }
      }

      // Wrap command with exec -a to give it a custom process name
      const fullCommand = `exec -a ${processName} ${spawnCommand} ${spawnArgs.map(a => `"${a}"`).join(' ')}`;
      
      workflowServerProcess = spawn("bash", ["-c", fullCommand], {
        cwd: spawnCwd,
        env: {
          ...process.env,
          PORT: String(workflowServerPort),
        },
        stdio: ["pipe", "pipe", "pipe"],
      });

      console.log(`[Workflow Server] Process name: ${processName} (use 'killall ${processName}' to stop)`);

      // Capture stderr for error reporting
      let stderrOutput = '';

      // Handle process output
      workflowServerProcess.stdout?.on("data", (data) => {
        console.log(`[Workflow Server stdout]: ${data}`);
      });

      workflowServerProcess.stderr?.on("data", (data) => {
        const output = data.toString();
        console.error(`[Workflow Server stderr]: ${output}`);
        stderrOutput += output;
      });

      workflowServerProcess.on("error", (error) => {
        console.error("[Workflow Server] Process error:", error);
      });

      workflowServerProcess.on("exit", (code, signal) => {
        console.log(`[Workflow Server] Process exited with code ${code}, signal ${signal}`);
        workflowServerProcess = null;
      });

      // Wait a bit for server to start
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check if process is still running
      if (!workflowServerProcess || workflowServerProcess.exitCode !== null) {
        // Check for common error patterns in stderr
        if (stderrOutput.includes('EADDRINUSE') || stderrOutput.toLowerCase().includes('port') && stderrOutput.toLowerCase().includes('in use')) {
          throw new Error(`Port ${workflowServerPort} is already in use. Stop the other process or choose a different port.`);
        }
        // Include stderr output in error if available
        const errorDetail = stderrOutput.trim() ? `: ${stderrOutput.trim().split('\n').pop()}` : '';
        throw new Error(`Failed to start workflow server - process exited early${errorDetail}`);
      }

      console.log("[Workflow Server]: Started on port", workflowServerPort);

      // Get the cortex host from environment variable, defaults to localhost
      const cortexHost = process.env.DEFAULT_CORTEX_HOST || 'localhost';

      return res.json(
        createResponse(true, {
          message: "Workflow server started",
          port: workflowServerPort,
          host: cortexHost,
          pid: workflowServerProcess.pid,
          tempDir: workflowServerTempDir,
        }),
      );
    } catch (error: any) {
      // Clean up on error
      if (workflowServerProcess) {
        workflowServerProcess.kill();
        workflowServerProcess = null;
      }
      if (workflowServerTempDir && fs.existsSync(workflowServerTempDir)) {
        fs.rmSync(workflowServerTempDir, { recursive: true, force: true });
        workflowServerTempDir = null;
      }
      return res.json(createResponse(false, undefined, error.message));
    }
  });

  // Stop workflow server
  app.post(base + "/serve/stop", async (req: Request, res: Response) => {
    try {
      if (!workflowServerProcess) {
        return res.json(
          createResponse(false, undefined, "No workflow server is running"),
        );
      }

      workflowServerProcess.kill();
      workflowServerProcess = null;
      workflowServerPort = 0;

      // Clean up temp directory
      if (workflowServerTempDir && fs.existsSync(workflowServerTempDir)) {
        fs.rmSync(workflowServerTempDir, { recursive: true, force: true });
        workflowServerTempDir = null;
      }

      return res.json(
        createResponse(true, { message: "Workflow server stopped" }),
      );
    } catch (error: any) {
      return res.json(createResponse(false, undefined, error.message));
    }
  });

  // Get serve status
  app.get(base + "/serve/status", (req: Request, res: Response) => {
    return res.json(
      createResponse(true, {
        running: workflowServerProcess !== null && workflowServerProcess.exitCode === null,
        port: workflowServerPort,
        pid: workflowServerProcess?.pid,
        tempDir: workflowServerTempDir,
        allowServe: process.env.HABITS_ALLOW_SERVE === "true",
      }),
    );
  });

  // Check if habits-cortex-serve process is running and if port is in use
  app.get(base + "/serve/check", async (req: Request, res: Response) => {
    const port = req.query.port ? Number(req.query.port) : workflowServerPort;
    
    let processRunning = false;
    let portInUse = false;
    let portPid: number | null = null;
    
    // Check if habits-cortex-serve is running
    try {
      const result = execSync("pgrep -x habits-cortex-serve 2>/dev/null || true", { encoding: 'utf-8' });
      processRunning = result.trim().length > 0;
    } catch (e) {
      // Process not found
    }
    
    // Check if port is in use
    if (port) {
      try {
        const result = execSync(`lsof -ti:${port} 2>/dev/null || true`, { encoding: 'utf-8' });
        const pids = result.trim().split('\n').filter(Boolean);
        portInUse = pids.length > 0;
        portPid = pids.length > 0 ? Number(pids[0]) : null;
      } catch (e) {
        // Port not in use or error
      }
    }
    
    return res.json(
      createResponse(true, {
        processRunning,
        portInUse,
        portPid,
        port,
        trackedProcessRunning: workflowServerProcess !== null && workflowServerProcess.exitCode === null,
      }),
    );
  });

  // Kill habits-cortex-serve process
  app.post(base + "/serve/kill-process", async (req: Request, res: Response) => {
    
    try {
      execSync("killall habits-cortex-serve 2>/dev/null || true", { encoding: 'utf-8' });
      
      // Also clear our tracked process
      if (workflowServerProcess) {
        workflowServerProcess.kill();
        workflowServerProcess = null;
      }
      
      return res.json(createResponse(true, { message: "Process killed" }));
    } catch (e: any) {
      return res.json(createResponse(false, undefined, e.message));
    }
  });

  // Kill process using a specific port
  app.post(base + "/serve/kill-port", async (req: Request, res: Response) => {
    const { port } = req.body;
    
    
    if (!port) {
      return res.json(createResponse(false, undefined, "port is required"));
    }
    
    try {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { encoding: 'utf-8' });
      
      // If this was our tracked port, clear it
      if (port === workflowServerPort && workflowServerProcess) {
        workflowServerProcess = null;
      }
      
      return res.json(createResponse(true, { message: `Killed process on port ${port}` }));
    } catch (e: any) {
      return res.json(createResponse(false, undefined, e.message));
    }
  });

  // Generate OpenAPI spec for a habit workflow (for AI frontend generation)
  app.post(base + "/serve/openapi", async (req: Request, res: Response) => {
    try {
      const { habit, serverUrl } = req.body;
      
      console.log('[serve/openapi] Received request with habit:', habit?.name || 'unnamed');
      
      if (!habit) {
        return res.json(createResponse(false, undefined, "habit is required"));
      }

      
      
      // Create executor and add the workflow
      const executor = new WorkflowExecutor();
      executor.addWorkflow(habit, { id: habit.id });
      
      // Generate the OpenAPI spec
      const fullSpec = generateOpenAPISpec(executor, serverUrl || 'http://localhost:8000');
      
      // Filter to only include /execute paths
      const executePathsOnly: Record<string, any> = {};
      if (fullSpec.paths) {
        for (const [pathKey, pathValue] of Object.entries(fullSpec.paths)) {
          if (pathKey.includes('/api')) {
            executePathsOnly[pathKey] = pathValue;
          }
        }
      }
      
      // Find all $ref references in the execute paths and only include those schemas
      const findRefs = (obj: any, refs: Set<string> = new Set()): Set<string> => {
        if (!obj || typeof obj !== 'object') return refs;
        if (obj.$ref && typeof obj.$ref === 'string') {
          // Extract schema name from "#/components/schemas/SchemaName"
          const match = obj.$ref.match(/#\/components\/schemas\/(\w+)/);
          if (match) refs.add(match[1]);
        }
        for (const value of Object.values(obj)) {
          findRefs(value, refs);
        }
        return refs;
      };
      
      // Recursively find all referenced schemas (including nested refs)
      const getAllReferencedSchemas = (schemaNames: Set<string>, allSchemas: Record<string, any>): Set<string> => {
        const result = new Set<string>();
        const toProcess = [...schemaNames];
        
        while (toProcess.length > 0) {
          const name = toProcess.pop()!;
          if (result.has(name)) continue;
          result.add(name);
          
          // Find refs in this schema
          if (allSchemas[name]) {
            const nestedRefs = findRefs(allSchemas[name]);
            for (const ref of nestedRefs) {
              if (!result.has(ref)) toProcess.push(ref);
            }
          }
        }
        return result;
      };
      
      // Get referenced schemas from execute paths
      const directRefs = findRefs(executePathsOnly);
      const allReferencedSchemas = fullSpec.components?.schemas 
        ? getAllReferencedSchemas(directRefs, fullSpec.components.schemas)
        : directRefs;
      
      // Filter components to only include referenced schemas
      const filteredSchemas: Record<string, any> = {};
      if (fullSpec.components?.schemas) {
        for (const schemaName of allReferencedSchemas) {
          if (fullSpec.components.schemas[schemaName]) {
            filteredSchemas[schemaName] = fullSpec.components.schemas[schemaName];
          }
        }
      }
      
      // Build minimal spec with only execute endpoints and their schemas
      const filteredSpec = {
        openapi: fullSpec.openapi,
        info: {
          title: `${habit.name || 'Habit'} API`,
          description: `API for executing the ${habit.name || 'habit'} workflow`,
          version: '1.0.0'
        },
        servers: fullSpec.servers,
        paths: executePathsOnly,
        components: Object.keys(filteredSchemas).length > 0 ? { schemas: filteredSchemas } : undefined
      };

      console.log('[serve/openapi] Generated spec with paths:', Object.keys(executePathsOnly), 'schemas:', Object.keys(filteredSchemas));
      
      return res.json(createResponse(true, filteredSpec));
    } catch (error: any) {
      console.error('[serve/openapi] Error:', error);
      return res.json(createResponse(false, undefined, error.message || 'Failed to generate OpenAPI spec'));
    }
  });
}
