/**
 * Feature flag helpers for the base server.
 * All flags default to enabled except HABITS_ALLOW_SERVE and HABITS_AI_GEN,
 * which must be explicitly opted in.
 * See PUBLIC_MODE.md for the full hardening guide.
 */

function flagEnabled(name: string, defaultValue = true): boolean {
  const val = process.env[name];
  if (val === undefined) return defaultValue;
  return val !== 'false' && val !== '0';
}

export interface ServerFlags {
  allowExecute: boolean;
  allowModulesInstall: boolean;
  allowFormsAuth: boolean;
  allowSecurityApi: boolean;
  allowExport: boolean;
  /** Controlled by HABITS_ALLOW_SERVE - defaults to false (opt-in) */
  allowServe: boolean;
  /** Controlled by HABITS_AI_GEN - defaults to false (opt-in) */
  allowAIGen: boolean;
}

export function getServerFlags(): ServerFlags {
  return {
    allowExecute:        flagEnabled('HABITS_ALLOW_EXECUTE'),
    allowModulesInstall: flagEnabled('HABITS_ALLOW_MODULES_INSTALL'),
    allowFormsAuth:      flagEnabled('HABITS_ALLOW_FORMS_AUTH'),
    allowSecurityApi:    flagEnabled('HABITS_ALLOW_SECURITY_API'),
    allowExport:         flagEnabled('HABITS_ALLOW_EXPORT'),
    // These two are opt-in, so default false
    allowServe:          process.env.HABITS_ALLOW_SERVE === 'true',
    allowAIGen:          process.env.HABITS_AI_GEN === 'true',
  };
}
