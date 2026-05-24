/**
 * Script Executor
 * 
 * Executes JavaScript scripts in a Node.js environment (server) or browser environment (Tauri).
 * Only JavaScript is supported.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import { spawn, execSync } from 'child_process';
import * as os from 'os';
// TypeScript is loaded lazily to avoid requiring it when not needed (e.g., for bits modules)
import type * as TypeScript from 'typescript';
import {
  ScriptDefinition,
  ScriptExecutionParams,
  ScriptExecutionResult,
  ScriptContext,
  ScriptState,
} from './types';
import { LoggerFactory } from '@ha-bits/core/logger';
import { getExecutionOverrides } from '../execution/overrides';

const logger = LoggerFactory.getRoot();

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Returns true when running inside the Tauri webview (no Node.js runtime available).
 * Detection mirrors the pattern used in cortex-bundle.js.
 */
function isTauriEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const g = globalThis as any;
  return !!(g.__TAURI__ || g.__TAURI_INTERNALS__);
}

// ============================================================================
// Browser / Tauri JavaScript Executor
// ============================================================================

/**
 * Execute a JavaScript script inside the browser webview (Tauri app mode).
 * Uses AsyncFunction constructor so the script runs in the global browser scope
 * without requiring Node.js vm or child_process.
 * The script must export a `main` function; its return value is the result.
 */
async function executeJavaScriptInBrowser(
  code: string,
  params: Record<string, any>
): Promise<any> {
  // Build a wrapper that defines the user script then calls main() with params.
  // We expose: params object, console, fetch, and process.env (populated by the
  // bundle-generator template before workflow execution).
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const wrapper = new AsyncFunction(
    '__params__',
    '__env__',
    `
${code}

if (typeof main !== 'function') {
  throw new Error('No main function found in script');
}
return await main(...Object.values(__params__));
`
  );

  const env = (typeof process !== 'undefined' && process.env) ? process.env : {};
  return wrapper(params, env);
}

// Lazy-loaded TypeScript module
let _ts: typeof TypeScript | null = null;

/**
 * Get the TypeScript module, loading it lazily if needed.
 * Throws if TypeScript is not installed.
 */
function getTypeScript(): typeof TypeScript {
  if (!_ts) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      _ts = require('typescript');
    } catch (error) {
      throw new Error(
        'TypeScript is required for script transpilation but is not installed. ' +
        'Please install it with: npm install typescript'
      );
    }
  }
  return _ts!;
}

// ============================================================================
// Internal State Management
// ============================================================================

const internalStates: Map<string, ScriptState> = new Map();

function getInternalStatePath(scriptPath: string): string {
  return `state:${scriptPath}`;
}

async function getInternalState(scriptPath: string): Promise<any> {
  return internalStates.get(getInternalStatePath(scriptPath)) || null;
}

async function setInternalState(scriptPath: string, state: any): Promise<void> {
  internalStates.set(getInternalStatePath(scriptPath), state);
}


/**
 * Convert TypeScript to JavaScript using the TypeScript compiler
 */
function transpileTypeScript(code: string): string {
  // Lazily load TypeScript only when needed
  const ts = getTypeScript();
  
  // Use TypeScript compiler to transpile
  const result = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      strict: false,
      esModuleInterop: true,
      skipLibCheck: true,
      removeComments: false,
    },
  });

  let jsCode = result.outputText;

  // Remove CommonJS exports wrapper if present
  jsCode = jsCode.replace(/^"use strict";\s*/m, '');
  jsCode = jsCode.replace(/Object\.defineProperty\(exports,\s*"__esModule",\s*\{\s*value:\s*true\s*\}\);?\s*/g, '');
  jsCode = jsCode.replace(/exports\.\w+\s*=\s*/g, '');

  return jsCode;
}



/**
 * Execute a Python script
 */
async function executePython(
  code: string,
  params: Record<string, any>,
  context: ScriptContext
): Promise<any> {
  const tmpDir = os.tmpdir();
  const scriptPath = path.join(tmpDir, `script_${Date.now()}.py`);
  
  // Create a wrapper that calls main with parameters
  const paramsList = Object.entries(params)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(', ');
  
  const wrappedCode = `
import json
import sys

# Inject context
flow_input = json.loads('''${JSON.stringify(context.flow_input)}''')
previous_result = json.loads('''${JSON.stringify(context.previous_result)}''')

${code}

if __name__ == "__main__":
    try:
        result = main(${paramsList})
        print(json.dumps({"success": True, "result": result}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)
`;

  fs.writeFileSync(scriptPath, wrappedCode);

  return new Promise((resolve, reject) => {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const proc = spawn(pythonCmd, [scriptPath], {
      env: { ...process.env },
      cwd: tmpDir,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (exitCode) => {
      // Clean up temp file
      try {
        fs.unlinkSync(scriptPath);
      } catch {}

      if (exitCode !== 0) {
        reject(new Error(`Python script failed: ${stderr || stdout}`));
        return;
      }

      try {
        // Parse the last line as JSON result
        const lines = stdout.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        const result = JSON.parse(lastLine);
        
        if (result.success) {
          resolve(result.result);
        } else {
          reject(new Error(result.error));
        }
      } catch (parseError) {
        // Return raw output if not JSON
        resolve(stdout.trim());
      }
    });

    proc.on('error', (error) => {
      try {
        fs.unlinkSync(scriptPath);
      } catch {}
      reject(new Error(`Failed to spawn Python: ${error.message}`));
    });
  });
}

/**
 * Execute a Go script
 */
async function executeGo(
  code: string,
  params: Record<string, any>,
  context: ScriptContext
): Promise<any> {
  const tmpDir = os.tmpdir();
  const scriptDir = path.join(tmpDir, `script_go_${Date.now()}`);
  const scriptPath = path.join(scriptDir, 'main.go');
  
  // Create directory
  fs.mkdirSync(scriptDir, { recursive: true });

  // Create a wrapper for the Go code
  const wrappedCode = `
package main

import (
	"encoding/json"
	"fmt"
	"os"
)

var flowInput = \`${JSON.stringify(context.flow_input)}\`
var previousResult = \`${JSON.stringify(context.previous_result)}\`
var params = \`${JSON.stringify(params)}\`

${code}

func main() {
	var p map[string]interface{}
	json.Unmarshal([]byte(params), &p)
	
	result := Main(p)
	
	output, _ := json.Marshal(map[string]interface{}{
		"success": true,
		"result": result,
	})
	fmt.Println(string(output))
}
`;

  fs.writeFileSync(scriptPath, wrappedCode);

  return new Promise((resolve, reject) => {
    try {
      // Build the Go program
      execSync(`go build -o main`, { cwd: scriptDir, stdio: 'pipe' });
      
      // Run the compiled program
      const proc = spawn('./main', [], {
        cwd: scriptDir,
        env: { ...process.env },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (exitCode) => {
        // Clean up
        try {
          fs.rmSync(scriptDir, { recursive: true, force: true });
        } catch {}

        if (exitCode !== 0) {
          reject(new Error(`Go script failed: ${stderr || stdout}`));
          return;
        }

        try {
          const lines = stdout.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const result = JSON.parse(lastLine);
          
          if (result.success) {
            resolve(result.result);
          } else {
            reject(new Error(result.error));
          }
        } catch {
          resolve(stdout.trim());
        }
      });

      proc.on('error', (error) => {
        try {
          fs.rmSync(scriptDir, { recursive: true, force: true });
        } catch {}
        reject(new Error(`Failed to run Go: ${error.message}`));
      });
    } catch (error: any) {
      try {
        fs.rmSync(scriptDir, { recursive: true, force: true });
      } catch {}
      reject(new Error(`Failed to build Go: ${error.message}`));
    }
  });
}

/**
 * Execute a Bash script
 */
async function executeBash(
  code: string,
  params: Record<string, any>,
  context: ScriptContext
): Promise<any> {
  const tmpDir = os.tmpdir();
  const scriptPath = path.join(tmpDir, `script_${Date.now()}.sh`);
  
  // Export parameters as environment variables
  const envExports = Object.entries(params)
    .map(([key, value]) => {
      const safeValue = typeof value === 'string' 
        ? value.replace(/'/g, "'\\''") 
        : JSON.stringify(value);
      return `export ${key}='${safeValue}'`;
    })
    .join('\n');
  
  const wrappedCode = `#!/bin/bash
set -e

# Exported parameters
${envExports}

# Context
export FLOW_INPUT='${JSON.stringify(context.flow_input)}'
export PREVIOUS_RESULT='${JSON.stringify(context.previous_result)}'

# User script
${code}
`;

  fs.writeFileSync(scriptPath, wrappedCode, { mode: 0o755 });

  return new Promise((resolve, reject) => {
    const proc = spawn('bash', [scriptPath], {
      env: { ...process.env },
      cwd: tmpDir,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (exitCode) => {
      try {
        fs.unlinkSync(scriptPath);
      } catch {}

      if (exitCode !== 0) {
        reject(new Error(`Bash script failed: ${stderr || stdout}`));
        return;
      }

      // Try to parse as JSON, otherwise return raw output
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        resolve(stdout.trim());
      }
    });

    proc.on('error', (error) => {
      try {
        fs.unlinkSync(scriptPath);
      } catch {}
      reject(new Error(`Failed to spawn Bash: ${error.message}`));
    });
  });
}

// ============================================================================
// Script Loading
// ============================================================================

/**
 * Load a script from the local filesystem
 */
function loadLocalScript(moduleName: string): ScriptDefinition | null {
  const basePath = path.resolve(__dirname, '../../nodes/script', moduleName);
  
  // Try different file extensions
  const extensions = [
    { ext: 'script.js', language: 'javascript' as const },
  ];

  for (const { ext, language } of extensions) {
    const scriptPath = path.join(basePath, ext);
    if (fs.existsSync(scriptPath)) {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      return {
        type: 'script',
        language,
        content,
        path: scriptPath,
      };
    }
  }

  return null;
}

// ============================================================================
// Main Execution Function
// ============================================================================

/**
 * Execute a Script module (default implementation).
 */
export async function defaultExecuteScriptModule(
  paramsOrModuleName: ScriptExecutionParams | string,
  maybeParams?: Record<string, any>
): Promise<ScriptExecutionResult> {
  let moduleName: string;
  let executionParams: Record<string, any>;
  let inlineScript: ScriptDefinition | undefined;

  if (typeof paramsOrModuleName === 'string') {
    moduleName = paramsOrModuleName;
    executionParams = maybeParams || {};
  } else {
    moduleName = paramsOrModuleName.moduleName;
    executionParams = paramsOrModuleName.params;
    inlineScript = paramsOrModuleName.script;
  }

  logger.log(`\n🌀 Executing Script module: ${moduleName}`);

  // Load the script - use inline if provided, otherwise load from filesystem
  let script: ScriptDefinition | null = null;

  if (inlineScript) {
    script = inlineScript;
  } else {
    script = loadLocalScript(moduleName);
  } 
  if (!script || !script.content) {
    throw new Error(`Could not load script: ${moduleName}`);
  }

  logger.log(`   Language: ${script.language}`);

  // Create execution context
  const context: ScriptContext = {
    flow_input: executionParams,
    previous_result: executionParams.previous_result || null,
    result: null,
  };

  // Execute based on language
  let result: any;

  try {
    if (script.language !== 'javascript') {
      throw new Error(
        `Only JavaScript is supported in script nodes. ` +
        `Please set \`language: javascript\` on your script node (current: ${script.language}).`
      );
    }

    if (isTauriEnvironment()) {
      result = await executeJavaScriptInBrowser(script.content, executionParams);
    } else {
      result = await executeJavaScriptInBrowser(script.content, executionParams);
    }

    logger.log(`✅ Script executed successfully`);

    return {
      success: true,
      module: moduleName,
      result,
      executedAt: new Date().toISOString(),
      language: script.language,
      data: {
        message: `Successfully executed script: ${moduleName}`,
        status: 'completed',
        output: result,
      },
    };
  } catch (error: any) {
    logger.error(`❌ Script failed: ${error.message}`);

    return {
      success: false,
      module: moduleName,
      result: null,
      executedAt: new Date().toISOString(),
      language: script.language,
      data: {
        message: `Failed to execute script: ${moduleName}`,
        status: 'failed',
        output: null,
        error: error.message,
      },
    };
  }
}

function normalizeScriptParams(
  paramsOrModuleName: ScriptExecutionParams | string,
  maybeParams?: Record<string, any>,
): ScriptExecutionParams {
  if (typeof paramsOrModuleName === 'string') {
    return {
      framework: 'script',
      moduleName: paramsOrModuleName,
      params: maybeParams || {},
    };
  }
  return paramsOrModuleName;
}

export async function executeScriptModule(
  params: ScriptExecutionParams
): Promise<ScriptExecutionResult>;
export async function executeScriptModule(
  moduleName: string,
  params: Record<string, any>
): Promise<ScriptExecutionResult>;
export async function executeScriptModule(
  paramsOrModuleName: ScriptExecutionParams | string,
  maybeParams?: Record<string, any>
): Promise<ScriptExecutionResult> {
  const normalized = normalizeScriptParams(paramsOrModuleName, maybeParams);
  const override = getExecutionOverrides()?.executeScript;
  if (override) {
    return override(normalized);
  }
  return defaultExecuteScriptModule(paramsOrModuleName, maybeParams);
}

/**
 * Execute a raw script (inline content)
 */
export async function executeScript(
  content: string,
  language: ScriptDefinition['language'],
  params: Record<string, any>,
  options?: { previous_result?: any }
): Promise<any> {
  const result = await executeScriptModule({
    framework: 'script',
    moduleName: 'inline-script',
    params: {
      ...params,
      previous_result: options?.previous_result,
    },
    script: {
      type: 'script',
      language,
      content,
    },
  });

  if (!result.success) {
    throw new Error(result.data.error || 'Script execution failed');
  }

  return result.result;
}

// ============================================================================
// Exports
// ============================================================================

export {
  loadLocalScript,
  getInternalState,
  setInternalState,
};
