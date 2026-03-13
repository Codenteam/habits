/**
 * Shell/Process execution binding
 * 
 * Provides cross-platform process execution that works in both Node.js and Tauri.
 * In Node.js, delegates to the native 'child_process' module.
 * In Tauri, uses globalThis.__TAURI__.shell (requires withGlobalTauri: true).
 */

import { isTauri, isNode, assertRuntime, getTauriPlugin, type TauriShellPlugin } from './runtime';

// Conditionally import modules
let nodeChildProcess: typeof import('child_process') | null = null;
let nodeUtil: typeof import('util') | null = null;

// Initialize Node.js modules if available
if (isNode()) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  nodeChildProcess = require('child_process');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  nodeUtil = require('util');
}

/**
 * Get Tauri shell plugin from globalThis.__TAURI__
 */
function getTauriShell(): TauriShellPlugin {
  return getTauriPlugin('shell');
}

/**
 * Filter out undefined values from env object (Tauri requires string values only)
 */
function filterEnv(env?: Record<string, string | undefined>): Record<string, string> | undefined {
  if (!env) return undefined;
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// ============================================================================
// Types
// ============================================================================

export interface ExecOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
  timeout?: number;
  maxBuffer?: number;
  encoding?: BufferEncoding;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

export interface SpawnOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
  stdio?: 'pipe' | 'inherit' | 'ignore';
}

export interface SpawnedProcess {
  pid?: number;
  kill: () => Promise<void>;
  write: (data: string) => Promise<void>;
  onStdout: (callback: (data: string) => void) => void;
  onStderr: (callback: (data: string) => void) => void;
  onClose: (callback: (code: number | null) => void) => void;
  onError: (callback: (error: Error) => void) => void;
}

// ============================================================================
// Async Operations
// ============================================================================

/**
 * Execute a shell command and return the output
 * 
 * @param command - Command to execute
 * @param options - Execution options
 * @returns Command output
 */
export async function exec(command: string, options: ExecOptions = {}): Promise<ExecResult> {
  if (isTauri()) {
    const shell = getTauriShell();
    
    // Tauri shell uses Command class with args
    // For shell execution, we use the shell program with -c flag
    const shellProgram = process.platform === 'win32' ? 'cmd' : 'sh';
    const shellArgs = process.platform === 'win32' ? ['/c', command] : ['-c', command];
    
    const cmd = shell.Command.create(shellProgram, shellArgs, {
      cwd: options.cwd,
      env: filterEnv(options.env),
    });
    
    const output = await cmd.execute();
    
    return {
      stdout: output.stdout,
      stderr: output.stderr,
      code: output.code,
    };
  }
  
  if (nodeChildProcess && nodeUtil) {
    const execPromise = nodeUtil.promisify(nodeChildProcess.exec);
    
    try {
      const { stdout, stderr } = await execPromise(command, {
        cwd: options.cwd,
        env: options.env ? { ...process.env, ...options.env } : undefined,
        timeout: options.timeout,
        maxBuffer: options.maxBuffer || 50 * 1024 * 1024, // 50MB default
        encoding: options.encoding || 'utf-8',
      });
      
      return {
        stdout: stdout || '',
        stderr: stderr || '',
        code: 0,
      };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        code: error.code || 1,
      };
    }
  }
  
  throw new Error('exec is not supported in this environment');
}

/**
 * Spawn a process
 * 
 * @param program - Program to run
 * @param args - Arguments to pass
 * @param options - Spawn options
 * @returns Spawned process handle
 */
export async function spawn(
  program: string,
  args: string[] = [],
  options: SpawnOptions = {}
): Promise<SpawnedProcess> {
  if (isTauri()) {
    const shell = getTauriShell();
    
    const cmd = shell.Command.create(program, args, {
      cwd: options.cwd,
      env: filterEnv(options.env),
    });
    
    const childProcess = await cmd.spawn();
    
    let stdoutCallback: ((data: string) => void) | null = null;
    let stderrCallback: ((data: string) => void) | null = null;
    let closeCallback: ((code: number | null) => void) | null = null;
    let errorCallback: ((error: Error) => void) | null = null;
    
    // Note: Tauri's Child type uses different event handling
    // We cast to any to work around type differences between versions
    const child = childProcess as any;
    
    // Set up event handlers if available
    if (typeof child.on === 'function') {
      child.on('close', (data: any) => {
        if (closeCallback) {
          closeCallback(data?.code ?? null);
        }
      });
      
      child.on('error', (error: any) => {
        if (errorCallback) {
          errorCallback(new Error(String(error)));
        }
      });
    }
    
    return {
      pid: childProcess.pid,
      kill: async () => {
        await childProcess.kill();
      },
      write: async (data: string) => {
        await childProcess.write(new TextEncoder().encode(data));
      },
      onStdout: (callback) => {
        stdoutCallback = callback;
        if (typeof child.on === 'function') {
          child.on('data', (event: any) => {
            if (event?.type === 'Stdout' && stdoutCallback) {
              stdoutCallback(event.data);
            }
          });
        }
      },
      onStderr: (callback) => {
        stderrCallback = callback;
        if (typeof child.on === 'function') {
          child.on('data', (event: any) => {
            if (event?.type === 'Stderr' && stderrCallback) {
              stderrCallback(event.data);
            }
          });
        }
      },
      onClose: (callback) => {
        closeCallback = callback;
      },
      onError: (callback) => {
        errorCallback = callback;
      },
    };
  }
  
  if (nodeChildProcess) {
    const child = nodeChildProcess.spawn(program, args, {
      cwd: options.cwd,
      env: options.env ? { ...process.env, ...options.env } : undefined,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    
    let stdoutCallback: ((data: string) => void) | null = null;
    let stderrCallback: ((data: string) => void) | null = null;
    let closeCallback: ((code: number | null) => void) | null = null;
    let errorCallback: ((error: Error) => void) | null = null;
    
    child.stdout?.on('data', (data) => {
      if (stdoutCallback) {
        stdoutCallback(data.toString());
      }
    });
    
    child.stderr?.on('data', (data) => {
      if (stderrCallback) {
        stderrCallback(data.toString());
      }
    });
    
    child.on('close', (code) => {
      if (closeCallback) {
        closeCallback(code);
      }
    });
    
    child.on('error', (error) => {
      if (errorCallback) {
        errorCallback(error);
      }
    });
    
    return {
      pid: child.pid,
      kill: async () => {
        child.kill();
      },
      write: async (data: string) => {
        return new Promise((resolve, reject) => {
          if (child.stdin) {
            child.stdin.write(data, (err) => {
              if (err) reject(err);
              else resolve();
            });
          } else {
            reject(new Error('stdin not available'));
          }
        });
      },
      onStdout: (callback) => {
        stdoutCallback = callback;
      },
      onStderr: (callback) => {
        stderrCallback = callback;
      },
      onClose: (callback) => {
        closeCallback = callback;
      },
      onError: (callback) => {
        errorCallback = callback;
      },
    };
  }
  
  throw new Error('spawn is not supported in this environment');
}

// ============================================================================
// Sync Operations (Node.js only)
// ============================================================================

/**
 * Execute a shell command synchronously (Node.js only)
 * 
 * @param command - Command to execute
 * @param options - Execution options
 * @returns Command output
 */
export function execSync(command: string, options: ExecOptions = {}): ExecResult {
  assertRuntime('execSync', ['node']);
  
  if (nodeChildProcess) {
    try {
      const stdout = nodeChildProcess.execSync(command, {
        cwd: options.cwd,
        env: options.env ? { ...process.env, ...options.env } : undefined,
        timeout: options.timeout,
        maxBuffer: options.maxBuffer || 50 * 1024 * 1024,
        encoding: options.encoding || 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      
      return {
        stdout: stdout?.toString() || '',
        stderr: '',
        code: 0,
      };
    } catch (error: any) {
      return {
        stdout: error.stdout?.toString() || '',
        stderr: error.stderr?.toString() || error.message,
        code: error.status || 1,
      };
    }
  }
  
  throw new Error('execSync is not supported in this environment');
}

/**
 * Spawn a process synchronously (Node.js only)
 * 
 * @param program - Program to run
 * @param args - Arguments to pass
 * @param options - Spawn options
 * @returns Exit code and output
 */
export function spawnSync(
  program: string,
  args: string[] = [],
  options: SpawnOptions = {}
): ExecResult {
  assertRuntime('spawnSync', ['node']);
  
  if (nodeChildProcess) {
    const result = nodeChildProcess.spawnSync(program, args, {
      cwd: options.cwd,
      env: options.env ? { ...process.env, ...options.env } : undefined,
      encoding: 'utf-8',
    });
    
    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      code: result.status,
    };
  }
  
  throw new Error('spawnSync is not supported in this environment');
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Promisified exec with async/await syntax
 * Alias for exec() for compatibility
 */
export const execAsync = exec;

/**
 * Create a promisified version of exec (Node.js compatible API)
 */
export function promisifyExec(): (command: string, options?: ExecOptions) => Promise<{ stdout: string; stderr: string }> {
  return async (command: string, options?: ExecOptions) => {
    const result = await exec(command, options);
    if (result.code !== 0) {
      const error = new Error(`Command failed: ${command}`);
      (error as any).stdout = result.stdout;
      (error as any).stderr = result.stderr;
      (error as any).code = result.code;
      throw error;
    }
    return { stdout: result.stdout, stderr: result.stderr };
  };
}

// ============================================================================
// Node.js Native Access (Node.js only)
// ============================================================================

export interface NodeSpawnOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  stdio?: 'pipe' | 'inherit' | 'ignore' | Array<'pipe' | 'inherit' | 'ignore' | 'ipc'>;
  detached?: boolean;
  shell?: boolean | string;
}

/**
 * Direct access to Node.js child_process.spawn (Node.js only)
 * 
 * Use this when you need the full Node.js ChildProcess API with event emitters.
 * Returns the native ChildProcess object.
 * 
 * @param command - Command to execute
 * @param args - Arguments to pass
 * @param options - Node.js spawn options
 * @returns Native Node.js ChildProcess
 */
export function nodeSpawn(
  command: string,
  args: string[] = [],
  options: NodeSpawnOptions = {}
): import('child_process').ChildProcess {
  assertRuntime('nodeSpawn', ['node']);
  
  if (nodeChildProcess) {
    return nodeChildProcess.spawn(command, args, options as any);
  }
  
  throw new Error('nodeSpawn is not supported in this environment');
}

// Default export
export default {
  exec,
  execAsync,
  execSync,
  spawn,
  spawnSync,
  promisifyExec,
  nodeSpawn,
};
