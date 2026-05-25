#!/usr/bin/env npx tsx
/**
 * Deploy - Deploys hub and admin to the appropriate server based on the git ref.
 *
 * Mirrors npm-publish.ts: reads GITHUB_REF_NAME to pick staging or prod credentials,
 * then conditionally deploys hub/admin and always does a rolling restart of admin
 * containers so they pick up the new habits@next.
 *
 * Usage:
 *   npx tsx scripts/deploy.ts                 # Auto-detect from git ref
 *   npx tsx scripts/deploy.ts --env staging   # Override target environment
 *   npx tsx scripts/deploy.ts --env prod      # Override target environment
 *
 * Environment Variables (staging):
 *   STAGING_HUB_SSH_KEY  - SSH private key content
 *   STAGING_HUB_SSH_HOST - SSH hostname (e.g. hub.codenteam.click)
 *   STAGING_HUB_SSH_USER - SSH user (e.g. root)
 *   STAGING_HUB_SSH_PORT - SSH port (default: 22)
 *
 * Environment Variables (prod):
 *   PROD_HUB_SSH_KEY  - SSH private key content
 *   PROD_HUB_SSH_HOST - SSH hostname
 *   PROD_HUB_SSH_USER - SSH user
 *   PROD_HUB_SSH_PORT - SSH port (default: 22)
 *
 * Common:
 *   GITHUB_REF_NAME      - git ref name (branch or tag)
 *   GITHUB_STEP_SUMMARY  - GitHub Actions step summary file path
 */

import { execSync } from 'child_process';
import { appendFileSync, writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir, tmpdir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

const summaryFile = process.env.GITHUB_STEP_SUMMARY;

interface DeployTarget {
  label: string;
  sshKey: string;
  sshHost: string;
  sshUser: string;
  sshPort: string;
}

interface SshOpts {
  sshFlags: string;
  host: string;
  user: string;
}

function log(msg: string): void {
  console.log(msg);
}

function logSummary(msg: string): void {
  if (summaryFile) {
    appendFileSync(summaryFile, msg + '\n');
  }
  log(msg);
}

function run(cmd: string, opts: { cwd?: string; allowFail?: boolean } = {}): { success: boolean; output: string } {
  const cwd = opts.cwd || ROOT_DIR;
  try {
    const output = execSync(cmd, {
      cwd,
      stdio: 'pipe',
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    return { success: true, output: output.toString().trim() };
  } catch (error) {
    const err = error as { stderr?: Buffer; stdout?: Buffer };
    const output = [err.stdout?.toString() || '', err.stderr?.toString() || ''].join('\n').trim();
    if (!opts.allowFail) {
      log(`Command failed: ${cmd}`);
      log(output);
    }
    return { success: false, output };
  }
}

function getCurrentGitRef(): string {
  const branchResult = run('git rev-parse --abbrev-ref HEAD', { allowFail: true });
  if (branchResult.success && branchResult.output !== 'HEAD') {
    return branchResult.output;
  }
  const tagResult = run('git describe --tags --exact-match', { allowFail: true });
  if (tagResult.success) {
    return tagResult.output;
  }
  return 'main';
}

function determineTarget(overrideEnv?: string): DeployTarget | null {
  const ref = process.env.GITHUB_REF_NAME || getCurrentGitRef();
  const isStaging = overrideEnv ? overrideEnv === 'staging' : ref === 'main';
  const isProd    = overrideEnv ? overrideEnv === 'prod'    : ref.startsWith('release/') || ref.startsWith('v');

  if (!isStaging && !isProd) {
    log(`Skipping deploy: ref "${ref}" is not main or a release ref.`);
    return null;
  }

  const prefix = isStaging ? 'STAGING_HUB' : 'PROD_HUB';
  const sshKey  = process.env[`${prefix}_SSH_KEY`]  || '';
  const sshHost = process.env[`${prefix}_SSH_HOST`] || '';
  const sshUser = process.env[`${prefix}_SSH_USER`] || '';
  const sshPort = process.env[`${prefix}_SSH_PORT`] || '22';

  if (!sshKey || !sshHost || !sshUser) {
    log(`Skipping deploy: ${prefix}_SSH_KEY / _HOST / _USER not set.`);
    return null;
  }

  return { label: isStaging ? 'staging' : 'prod', sshKey, sshHost, sshUser, sshPort };
}

function setupSshKey(sshKey: string): string {
  const sshDir = join(homedir(), '.ssh');
  const keyPath = join(sshDir, 'id_deploy');
  if (!existsSync(sshDir)) {
    mkdirSync(sshDir, { mode: 0o700 });
  }
  writeFileSync(keyPath, sshKey + '\n', { mode: 0o600 });
  return `-i ${keyPath} -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=15`;
}

function getChangedFiles(): string[] {
  const result = run('git diff --name-only origin/main~1 HEAD', { allowFail: true });
  if (!result.success || !result.output) return [];
  return result.output.split('\n').filter(Boolean);
}

function deployHub(opts: SshOpts): boolean {
  log('\n==> Deploying Hub...');
  const hub = join(ROOT_DIR, 'packages/manage/hub');
  const dest = `${opts.user}@${opts.host}:/opt/habits-hub/`;
  const rsyncFlags = `rsync -avz --delete -e "ssh ${opts.sshFlags}" --rsync-path="sudo rsync"`;

  const steps: Array<[string, string]> = [
    ['src/', `${dest}src/`],
    ['package.json', `${dest}package.json`],
    ['tsconfig.json', `${dest}tsconfig.json`],
    ['tailwind.config.cjs', `${dest}tailwind.config.cjs`],
  ];

  for (const [src, dst] of steps) {
    const res = run(`${rsyncFlags} ${join(hub, src)} ${dst}`);
    if (!res.success) return false;
  }

  const remoteCmd = [
    'cd /opt/habits-hub',
    'npm install --no-audit --no-fund',
    'npm run build',
    'chown -R habits-hub:habits-hub /opt/habits-hub',
    'systemctl restart habits-hub',
  ].join(' && ');

  const res = run(`ssh ${opts.sshFlags} ${opts.user}@${opts.host} "${remoteCmd}"`);
  return res.success;
}

function deployAdmin(opts: SshOpts): boolean {
  log('\n==> Deploying Admin (rebuilding Docker image)...');
  const adminSrc = join(ROOT_DIR, 'packages/manage/admin') + '/';
  const adminDst = `${opts.user}@${opts.host}:/opt/habits-admin/`;
  const rsyncFlags = `rsync -avz --delete --exclude=node_modules --exclude=.git -e "ssh ${opts.sshFlags}" --rsync-path="sudo rsync"`;

  const syncRes = run(`${rsyncFlags} "${adminSrc}" "${adminDst}"`);
  if (!syncRes.success) return false;

  const buildRes = run(
    `ssh ${opts.sshFlags} ${opts.user}@${opts.host} "docker build -t habits-admin:latest /opt/habits-admin/"`,
  );
  return buildRes.success;
}

/**
 * Recreates all habits-admin containers on the server with the new image.
 * Uses docker inspect to capture existing config so env vars, volumes, and ports are preserved.
 * Adds NS_MANAGER_HABITS_DEFAULT_TAG if a habitsTag is provided.
 */
function recreateAdminContainers(opts: SshOpts, habitsTag: string): boolean {
  log(`\n==> Recreating admin containers with new image${habitsTag ? ` (habits tag: ${habitsTag})` : ''}...`);

  const pyScript = `
import subprocess, json
tag = ${JSON.stringify(habitsTag)}
result = subprocess.check_output(['docker','ps','--filter','name=codenteam-service-','--format','{{.Names}}']).decode().strip()
containers = [c for c in result.split('\\n') if c.strip()]
if not containers:
    print('No codenteam-service-* containers found')
for name in containers:
    info = json.loads(subprocess.check_output(['docker','inspect',name]))[0]
    if 'habits-admin' not in info['Config']['Image']:
        print(f'Skipping {name} (not habits-admin)')
        continue
    envs = [e for e in info['Config']['Env'] if not e.startswith('NS_MANAGER_HABITS_DEFAULT_TAG=')]
    if tag:
        envs.append('NS_MANAGER_HABITS_DEFAULT_TAG=' + tag)
    binds = info['HostConfig']['Binds'] or []
    ports = info['HostConfig']['PortBindings'] or {}
    nets = list((info['NetworkSettings']['Networks'] or {}).keys())
    restart = info['HostConfig']['RestartPolicy']['Name']
    args = ['docker', 'run', '-d', '--name', name]
    for e in envs:
        args += ['-e', e]
    for b in binds:
        args += ['-v', b]
    for p, cs in ports.items():
        for c in (cs or []):
            args += ['-p', c['HostPort'] + ':' + p]
    for n in nets:
        args += ['--network', n]
    if restart and restart != 'no':
        args += ['--restart', restart]
    args.append('habits-admin:latest')
    print(f'Recreating {name}...')
    subprocess.run(['docker', 'stop', name], check=True)
    subprocess.run(['docker', 'rm', name], check=True)
    subprocess.run(args, check=True)
    print(f'Done: {name}')
`;

  const localPy = join(tmpdir(), `habits-recreate-${Date.now()}.py`);
  const remotePy = '/tmp/habits-recreate.py';
  writeFileSync(localPy, pyScript, { encoding: 'utf8' });
  try {
    const rsync = run(`rsync -e "ssh ${opts.sshFlags}" "${localPy}" "${opts.user}@${opts.host}:${remotePy}"`);
    if (!rsync.success) return false;
    const exec = run(`ssh ${opts.sshFlags} ${opts.user}@${opts.host} "python3 ${remotePy}; rm -f ${remotePy}"`);
    return exec.success;
  } finally {
    try { unlinkSync(localPy); } catch { /* ignore */ }
  }
}

function healthCheck(host: string): boolean {
  log(`\n==> Health check: https://${host}/`);
  const res = run(`curl --fail --silent --max-time 15 https://${host}/`, { allowFail: true });
  if (!res.success) {
    log(`Health check failed for https://${host}/`);
  }
  return res.success;
}

function parseArgs(): { env?: string; force?: boolean; habitsTag?: string } {
  const args = process.argv.slice(2);
  let env: string | undefined;
  let force = false;
  let habitsTag: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--env' || args[i] === '-e') {
      env = args[i + 1];
      i++;
    } else if (args[i] === '--force' || args[i] === '-f') {
      force = true;
    } else if (args[i] === '--habits-tag' || args[i] === '-t') {
      habitsTag = args[i + 1];
      i++;
    }
  }
  return { env, force, habitsTag };
}

async function main(): Promise<void> {
  log(`\n${'═'.repeat(60)}`);
  log(`  Deploy Script`);
  log(`${'═'.repeat(60)}\n`);

  const { env: overrideEnv, force, habitsTag = '' } = parseArgs();

  const target = determineTarget(overrideEnv);
  if (!target) {
    log('Nothing to deploy. Exiting cleanly.');
    return;
  }

  log(`Target: ${target.label} (${target.sshHost})`);
  log(`Git ref: ${process.env.GITHUB_REF_NAME || getCurrentGitRef()}`);
  if (habitsTag) log(`Habits tag: ${habitsTag}`);

  const sshBaseFlags = setupSshKey(target.sshKey);
  const sshFlags = `${sshBaseFlags} -p ${target.sshPort}`;
  const opts: SshOpts = { sshFlags, host: target.sshHost, user: target.sshUser };

  const changedFiles = getChangedFiles();
  log(`Changed files: ${changedFiles.length}${force ? ' (--force: deploying all)' : ''}`);

  const hubChanged   = force || changedFiles.some(f => f.startsWith('packages/manage/hub/'));
  const adminChanged = force || changedFiles.some(f => f.startsWith('packages/manage/admin/'));

  if (hubChanged) {
    const ok = deployHub(opts);
    if (!ok) {
      logSummary(`Deploy failed: hub deploy to ${target.label} failed.`);
      process.exit(1);
    }
    log('Hub deployed successfully.');
  } else {
    log('No hub changes detected, skipping hub deploy.');
  }

  if (adminChanged) {
    const ok = deployAdmin(opts);
    if (!ok) {
      logSummary(`Deploy failed: admin Docker build on ${target.label} failed.`);
      process.exit(1);
    }
    log('Admin image rebuilt successfully.');
  } else {
    log('No admin changes detected, skipping admin deploy.');
  }

  const restartOk = recreateAdminContainers(opts, habitsTag);
  if (!restartOk) {
    log('Warning: container recreation had issues, but continuing.');
  }

  const healthy = healthCheck(target.sshHost);

  if (healthy) {
    logSummary(`Deployed to ${target.label} (${target.sshHost}) successfully.`);
    log(`\nDone!`);
  } else {
    logSummary(`Deploy to ${target.label} (${target.sshHost}) completed but health check failed.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
