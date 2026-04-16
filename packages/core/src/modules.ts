/**
 * Default modules list for habits.
 * This is the canonical source of truth for available modules.
 * Used by:
 * - `habits init` command to populate modules.json
 * - moduleLoader as fallback when modules.json doesn't exist
 */

export interface ModuleDefinition {
  framework: string;
  source: 'npm' | 'github';
  repository: string;
}

export interface ModulesConfig {
  modules: ModuleDefinition[];
}

/**
 * Default modules configuration.
 * All standard bits modules available from npm.
 */
export const defaultModules: ModulesConfig = {
  modules: [
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-intersect' },
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-if' },
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-loop' },
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-openai' },
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-string' },
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-httpbin' },
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-any-of' },
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-auth' },
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-cookie' },
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-crm' },
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-database' },
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-email' },
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-filesystem' },
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-github' },
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-hello-world' },
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-http' },
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-jsonplaceholder' },
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-slack' },
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-tasks' },
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-telegram' },
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-text' },
    { framework: 'bits', source: 'npm', repository: '@ha-bits/bit-whatsapp' },
  ]
};
