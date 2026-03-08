/**
 * @ha-bits/bit-shell
 * 
 * Shell command execution bit for running system commands.
 * Supports command execution with configurable timeout, working directory,
 * and environment variables.
 * 
 * ⚠️ SECURITY WARNING: This bit executes arbitrary shell commands.
 * Use with caution and validate all inputs in production environments.
 */

import { exec, spawn, SpawnOptions } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ShellContext {
  propsValue: Record<string, any>;
}

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
  command: string;
  duration: number;
}

const shellBit = {
  displayName: 'Shell',
  description: 'Execute shell commands on the system',
  logoUrl: 'lucide:Terminal',

  auth: {
    type: 'NONE',
  },

  actions: {
    /**
     * Execute a shell command
     */
    exec: {
      name: 'exec',
      displayName: 'Execute Command',
      description: 'Execute a shell command and return the output',
      props: {
        command: {
          type: 'LONG_TEXT',
          displayName: 'Command',
          description: 'Shell command to execute',
          required: true,
        },
        cwd: {
          type: 'SHORT_TEXT',
          displayName: 'Working Directory',
          description: 'Directory to run the command in (defaults to cwd)',
          required: false,
        },
        timeout: {
          type: 'NUMBER',
          displayName: 'Timeout (ms)',
          description: 'Maximum execution time in milliseconds (default: 30000)',
          required: false,
          defaultValue: 30000,
        },
        shell: {
          type: 'SHORT_TEXT',
          displayName: 'Shell',
          description: 'Shell to use (e.g., /bin/bash, /bin/zsh)',
          required: false,
        },
        env: {
          type: 'JSON',
          displayName: 'Environment Variables',
          description: 'Additional environment variables as JSON object',
          required: false,
        },
      },
      async run(context: ShellContext): Promise<ExecResult> {
        const { command, cwd, timeout = 30000, shell, env } = context.propsValue;
        const startTime = Date.now();
        
        try {
          const options: any = {
            cwd: cwd || process.cwd(),
            timeout,
            env: { ...process.env, ...env },
          };
          
          if (shell) {
            options.shell = shell;
          }
          
          const { stdout, stderr } = await execAsync(command, options);
          
          return {
            stdout: String(stdout).trim(),
            stderr: String(stderr).trim(),
            exitCode: 0,
            success: true,
            command,
            duration: Date.now() - startTime,
          };
        } catch (error: any) {
          return {
            stdout: String(error.stdout || '').trim(),
            stderr: String(error.stderr || error.message).trim(),
            exitCode: error.code || 1,
            success: false,
            command,
            duration: Date.now() - startTime,
          };
        }
      },
    },

    /**
     * Execute multiple commands in sequence
     */
    execMultiple: {
      name: 'execMultiple',
      displayName: 'Execute Multiple Commands',
      description: 'Execute multiple shell commands in sequence',
      props: {
        commands: {
          type: 'ARRAY',
          displayName: 'Commands',
          description: 'List of commands to execute',
          required: true,
        },
        cwd: {
          type: 'SHORT_TEXT',
          displayName: 'Working Directory',
          description: 'Directory to run commands in',
          required: false,
        },
        stopOnError: {
          type: 'CHECKBOX',
          displayName: 'Stop on Error',
          description: 'Stop execution if a command fails',
          required: false,
          defaultValue: true,
        },
        timeout: {
          type: 'NUMBER',
          displayName: 'Timeout per Command (ms)',
          description: 'Maximum time per command (default: 30000)',
          required: false,
          defaultValue: 30000,
        },
      },
      async run(context: ShellContext): Promise<any> {
        const { commands, cwd, stopOnError = true, timeout = 30000 } = context.propsValue;
        const results: ExecResult[] = [];
        let allSuccess = true;
        
        for (const cmd of commands) {
          const result = await shellBit.actions.exec.run({
            propsValue: { command: cmd, cwd, timeout }
          });
          
          results.push(result);
          
          if (!result.success) {
            allSuccess = false;
            if (stopOnError) break;
          }
        }
        
        return {
          results,
          success: allSuccess,
          executedCount: results.length,
          totalCount: commands.length,
        };
      },
    },

    /**
     * Run a script file
     */
    runScript: {
      name: 'runScript',
      displayName: 'Run Script File',
      description: 'Execute a script file (bash, python, node, etc.)',
      props: {
        scriptPath: {
          type: 'SHORT_TEXT',
          displayName: 'Script Path',
          description: 'Path to the script file',
          required: true,
        },
        interpreter: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Interpreter',
          description: 'Script interpreter to use',
          required: false,
          defaultValue: 'auto',
          options: {
            options: [
              { label: 'Auto-detect', value: 'auto' },
              { label: 'Bash', value: 'bash' },
              { label: 'Zsh', value: 'zsh' },
              { label: 'Sh', value: 'sh' },
              { label: 'Python', value: 'python3' },
              { label: 'Node.js', value: 'node' },
              { label: 'Ruby', value: 'ruby' },
              { label: 'Perl', value: 'perl' },
            ],
          },
        },
        args: {
          type: 'ARRAY',
          displayName: 'Arguments',
          description: 'Command line arguments to pass to the script',
          required: false,
        },
        cwd: {
          type: 'SHORT_TEXT',
          displayName: 'Working Directory',
          description: 'Directory to run the script in',
          required: false,
        },
        timeout: {
          type: 'NUMBER',
          displayName: 'Timeout (ms)',
          description: 'Maximum execution time',
          required: false,
          defaultValue: 60000,
        },
      },
      async run(context: ShellContext): Promise<ExecResult> {
        const { scriptPath, interpreter = 'auto', args = [], cwd, timeout = 60000 } = context.propsValue;
        
        let command: string;
        if (interpreter === 'auto') {
          // Make script executable and run directly
          command = `chmod +x "${scriptPath}" && "${scriptPath}" ${args.join(' ')}`;
        } else {
          command = `${interpreter} "${scriptPath}" ${args.join(' ')}`;
        }
        
        return shellBit.actions.exec.run({
          propsValue: { command, cwd, timeout }
        });
      },
    },

    /**
     * Check if a command exists
     */
    commandExists: {
      name: 'commandExists',
      displayName: 'Check Command Exists',
      description: 'Check if a command is available on the system',
      props: {
        command: {
          type: 'SHORT_TEXT',
          displayName: 'Command',
          description: 'Command name to check',
          required: true,
        },
      },
      async run(context: ShellContext): Promise<any> {
        const { command } = context.propsValue;
        
        try {
          const { stdout } = await execAsync(`which ${command}`);
          return {
            exists: true,
            path: stdout.trim(),
            command,
          };
        } catch {
          return {
            exists: false,
            path: null,
            command,
          };
        }
      },
    },

    /**
     * Get environment variable
     */
    getEnv: {
      name: 'getEnv',
      displayName: 'Get Environment Variable',
      description: 'Get the value of an environment variable',
      props: {
        name: {
          type: 'SHORT_TEXT',
          displayName: 'Variable Name',
          description: 'Name of the environment variable',
          required: true,
        },
        defaultValue: {
          type: 'SHORT_TEXT',
          displayName: 'Default Value',
          description: 'Value to return if variable is not set',
          required: false,
        },
      },
      async run(context: ShellContext): Promise<any> {
        const { name, defaultValue } = context.propsValue;
        const value = process.env[name];
        
        return {
          name,
          value: value ?? defaultValue ?? null,
          exists: value !== undefined,
        };
      },
    },

    /**
     * Get current working directory
     */
    pwd: {
      name: 'pwd',
      displayName: 'Get Working Directory',
      description: 'Get the current working directory',
      props: {},
      async run(): Promise<any> {
        return {
          cwd: process.cwd(),
          home: process.env.HOME || process.env.USERPROFILE,
          platform: process.platform,
        };
      },
    },
  },

  triggers: {},
};

export default shellBit;
