import * as fs from '@ha-bits/bindings/fs';
import * as path from '@ha-bits/bindings/path';
import { defaultModules } from '@ha-bits/core';
import { preinstallModules } from './moduleLoader';

const DEFAULT_ENV_CONTENT = `HABITS_MODULES_MODE=open
HABITS_ALLOW_SERVE=true
`;

export interface EnsureProjectFilesResult {
  firstRun: boolean;
  createdEnv: boolean;
  createdModules: boolean;
  envPath: string;
  modulesPath: string;
}

export interface EnsureProjectResult extends EnsureProjectFilesResult {
  installResult?: {
    total: number;
    pending: number;
    installed: number;
    failed: string[];
  };
}

function applyEnvFile(envPath: string): void {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function ensureHabitsProjectFiles(options?: { cwd?: string }): EnsureProjectFilesResult {
  const cwd = options?.cwd ?? process.cwd();
  const envPath = path.join(cwd, '.env');
  const modulesPath = path.join(cwd, 'modules.json');

  const envExists = fs.existsSync(envPath);
  const modulesExists = fs.existsSync(modulesPath);
  const firstRun = !envExists || !modulesExists;

  let createdEnv = false;
  let createdModules = false;

  if (!envExists) {
    fs.writeFileSync(envPath, DEFAULT_ENV_CONTENT);
    createdEnv = true;
  }

  if (!modulesExists) {
    fs.writeFileSync(modulesPath, JSON.stringify(defaultModules, null, 2));
    createdModules = true;
  }

  if (createdEnv) {
    applyEnvFile(envPath);
  }

  return {
    firstRun,
    createdEnv,
    createdModules,
    envPath,
    modulesPath,
  };
}

function printFirstRunBanner(filesResult: EnsureProjectFilesResult): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  First-time Habits setup');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (filesResult.createdEnv) {
    console.log('  ✅ Created .env');
  }
  if (filesResult.createdModules) {
    console.log(`  ✅ Created modules.json (${defaultModules.modules.length} bits)`);
  }
  if (filesResult.createdEnv || filesResult.createdModules) {
    console.log('');
  }
}

export async function ensureHabitsProject(options?: {
  cwd?: string;
  skipInstall?: boolean;
  quiet?: boolean;
}): Promise<EnsureProjectResult> {
  const quiet = options?.quiet ?? false;
  const filesResult = ensureHabitsProjectFiles({ cwd: options?.cwd });

  if (!quiet && filesResult.firstRun) {
    printFirstRunBanner(filesResult);
  }

  if (options?.skipInstall) {
    return filesResult;
  }

  const verbose = !quiet && filesResult.firstRun;
  if (verbose) {
    console.log('📦 Downloading bits (first run — may take a minute)...\n');
  }

  const installResult = await preinstallModules({ verbose });

  if (!quiet) {
    if (installResult.failed.length > 0) {
      console.log(`⚠️  ${installResult.failed.length}/${installResult.pending} bit(s) failed to install`);
      console.log('   You can retry failed bits from the Base UI (Install Bit button)');
    } else if (installResult.installed > 0) {
      if (verbose) {
        console.log(`\n✅ Installed ${installResult.installed} bit(s)`);
      } else {
        console.log(`📦 Installed ${installResult.installed} bit(s)`);
      }
    }
  }

  return {
    ...filesResult,
    installResult,
  };
}
