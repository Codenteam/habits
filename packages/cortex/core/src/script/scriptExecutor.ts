/**
 * Script Executor
 * 
 * Executes scripts in a Node.js environment.
 * Supports TypeScript/JavaScript (converted from Deno), Python, Go, and Bash scripts.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import { spawn, execSync } from 'child_process';
import * as os from 'os';
import * as ts from 'typescript';
import {
  ScriptDefinition,
  ScriptExecutionParams,
  ScriptExecutionResult,
  ScriptContext,
  ScriptState,
  DenoToNodeConversionResult,
} from './types';
import { LoggerFactory } from '@ha-bits/core/logger';

const logger = LoggerFactory.getRoot();

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

// ============================================================================
// Deno to Node.js Conversion
// ============================================================================

/**
 * Convert Deno imports to Node.js compatible imports
 */
function convertDenoImports(code: string): DenoToNodeConversionResult {
  const npmPackages: string[] = [];
  const imports: string[] = [];
  let convertedCode = code;

  // Replace Deno.land imports with npm equivalents
  const denoImportPatterns: Array<{
    pattern: RegExp;
    replacement: string | ((match: string, ...args: string[]) => string);
    npmPackage?: string;
  }> = [
    {
      pattern: /import\s+\*\s+as\s+wmill\s+from\s+["']https:\/\/deno\.land\/x\/[@\w.]*\/mod\.ts["'];?/g,
      replacement: `// Script SDK (mocked for Node.js)
const wmill = {
  getInternalStatePath: () => '__internal_state__',
  getInternalState: async () => globalThis.__script_state || null,
  setInternalState: async (state) => { globalThis.__script_state = state; },
  getVariable: async (path) => process.env[path] || null,
  setVariable: async (path, value) => { process.env[path] = value; },
  getResource: async (path) => globalThis.__script_resources?.[path] || null,
};`,
    },
    // Standard library fetch (use native)
    {
      pattern: /import\s*{\s*([^}]+)\s*}\s*from\s+["']https:\/\/deno\.land\/std[@\w.]*\/http\/mod\.ts["'];?/g,
      replacement: '', // fetch is native in Node 18+
    },
    // Crypto
    {
      pattern: /import\s*{\s*([^}]+)\s*}\s*from\s+["']https:\/\/deno\.land\/std[@\w.]*\/crypto\/mod\.ts["'];?/g,
      replacement: `const crypto = require('crypto');`,
    },
    // Path
    {
      pattern: /import\s*{\s*([^}]+)\s*}\s*from\s+["']https:\/\/deno\.land\/std[@\w.]*\/path\/mod\.ts["'];?/g,
      replacement: `const path = require('path');`,
    },
    // fs
    {
      pattern: /import\s*{\s*([^}]+)\s*}\s*from\s+["']https:\/\/deno\.land\/std[@\w.]*\/fs\/mod\.ts["'];?/g,
      replacement: `const fs = require('fs').promises;`,
    },
    // npm: imports
    {
      pattern: /import\s+(?:(\*\s+as\s+\w+)|{([^}]+)}|(\w+))\s+from\s+["']npm:([^@"']+)(?:@[^"']*)?["'];?/g,
      replacement: (match: string, star: string, named: string, defaultImport: string, pkg: string) => {
        npmPackages.push(pkg);
        if (star) {
          return `const ${star.replace('* as ', '')} = require('${pkg}');`;
        } else if (named) {
          return `const { ${named} } = require('${pkg}');`;
        } else {
          return `const ${defaultImport} = require('${pkg}');`;
        }
      },
    },
  ];

  for (const { pattern, replacement, npmPackage } of denoImportPatterns) {
    if (typeof replacement === 'function') {
      convertedCode = convertedCode.replace(pattern, replacement as any);
    } else {
      convertedCode = convertedCode.replace(pattern, replacement);
    }
    if (npmPackage) {
      npmPackages.push(npmPackage);
    }
  }

  // Replace Deno.* APIs with Node.js equivalents
  const denoApiReplacements: Array<[RegExp, string]> = [
    [/Deno\.env\.get\(([^)]+)\)/g, 'process.env[$1]'],
    [/Deno\.env\.set\(([^,]+),\s*([^)]+)\)/g, 'process.env[$1] = $2'],
    [/Deno\.args/g, 'process.argv.slice(2)'],
    [/Deno\.exit\(([^)]*)\)/g, 'process.exit($1)'],
    [/Deno\.cwd\(\)/g, 'process.cwd()'],
    [/Deno\.readTextFile\(([^)]+)\)/g, 'fs.readFileSync($1, "utf-8")'],
    [/Deno\.writeTextFile\(([^,]+),\s*([^)]+)\)/g, 'fs.writeFileSync($1, $2)'],
    [/Deno\.readFile\(([^)]+)\)/g, 'fs.readFileSync($1)'],
    [/Deno\.writeFile\(([^,]+),\s*([^)]+)\)/g, 'fs.writeFileSync($1, $2)'],
    [/Deno\.remove\(([^)]+)\)/g, 'fs.unlinkSync($1)'],
    [/Deno\.mkdir\(([^)]+)\)/g, 'fs.mkdirSync($1, { recursive: true })'],
    [/Deno\.stat\(([^)]+)\)/g, 'fs.statSync($1)'],
  ];

  for (const [pattern, replacement] of denoApiReplacements) {
    convertedCode = convertedCode.replace(pattern, replacement);
  }

  // Extract import statements for reference
  const importRegex = /^(import\s+.+from\s+['"].+['"];?)$/gm;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }

  return {
    code: convertedCode,
    imports,
    npmPackages: [...new Set(npmPackages)],
  };
}

/**
 * Convert TypeScript to JavaScript using the TypeScript compiler
 */
function transpileTypeScript(code: string): string {
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
 * Convert Deno script to Node.js compatible JavaScript
 */
export function convertDenoToNode(code: string): string {
  // First convert Deno-specific imports and APIs
  const { code: convertedCode } = convertDenoImports(code);
  
  // Then transpile TypeScript to JavaScript
  const jsCode = transpileTypeScript(convertedCode);
  
  return jsCode;
}

// ============================================================================
// Script Execution
// ============================================================================

/**
 * Execute a JavaScript/TypeScript script in Node.js
 */
async function executeJavaScript(
  code: string,
  params: Record<string, any>,
  context: ScriptContext
): Promise<any> {
  // Convert Deno code to Node.js
  const nodeCode = convertDenoToNode(code);
  
  // Create a wrapper that exports the main function result
  const wrappedCode = `
    ${nodeCode}
    
    // Execute main function
    (async () => {
      if (typeof main === 'function') {
        return await main(...Object.values(__params__));
      }
      throw new Error('No main function found in script');
    })();
  `;

  // Create a sandbox context
  const sandbox: Record<string, any> = {
    __params__: params,
    __context__: context,
    globalThis: {
      __script_state: null,
      __script_resources: {},
    },
    console,
    process,
    require,
    fetch,
    Buffer,
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    Promise,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Date,
    Math,
    RegExp,
    Error,
    URL,
    URLSearchParams,
    TextEncoder: globalThis.TextEncoder,
    TextDecoder: globalThis.TextDecoder,
    crypto: globalThis.crypto,
    fs: require('fs'),
    path: require('path'),
  };

  const vmContext = vm.createContext(sandbox);
  
  try {
    const script = new vm.Script(wrappedCode, {
      filename: 'script-executor.js',
    });
    
    const result = await script.runInContext(vmContext, {
      timeout: 300000, // 5 minute timeout
    });
    
    return result;
  } catch (error: any) {
    logger.error(`JavaScript execution error: ${error.message}`);
    throw error;
  }
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
    { ext: 'script.ts', language: 'deno' as const },
    { ext: 'script.js', language: 'javascript' as const },
    { ext: 'script.py', language: 'python3' as const },
    { ext: 'script.go', language: 'go' as const },
    { ext: 'script.sh', language: 'bash' as const },
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
 * Execute a Script module
 */
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
    switch (script.language) {
      case 'deno':
      case 'typescript':
      case 'javascript':
        result = await executeJavaScript(script.content, executionParams, context);
        break;

      case 'python3':
        result = await executePython(script.content, executionParams, context);
        break;

      case 'go':
        result = await executeGo(script.content, executionParams, context);
        break;

      case 'bash':
        result = await executeBash(script.content, executionParams, context);
        break;

      default:
        throw new Error(`Unsupported language: ${script.language}`);
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
