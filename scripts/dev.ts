#!/usr/bin/env npx tsx
/**
 * Habits Dev CLI - Interactive menu.
 * Usage: npx tsx scripts/dev.ts | pnpm dev:cli
 */

import * as readline from 'readline';
import * as actions from './actions.js';
import type { MenuItem } from './actions.js';

const { c, logHeader, logSuccess, discoverExamples, discoverBits, buildShowcaseInteractive } = actions;

let rl: readline.Interface;
const prompt = (msg: string): Promise<string> => new Promise(r => rl.question(msg, a => r(a.trim())));

async function select(title: string, opts: MenuItem[]): Promise<string | null> {
  console.log(`\n${c.bold}${c.cyan}${title}${c.reset}\n`);
  opts.forEach((o, i) => console.log(`  ${c.yellow}${String(i + 1).padStart(2)}.${c.reset} ${o.label}${o.desc ? ` ${c.gray}${o.desc}${c.reset}` : ''}`));
  const idx = parseInt(await prompt(`\n${c.green}Enter number (1-${opts.length}): ${c.reset}`), 10) - 1;
  return idx >= 0 && idx < opts.length ? opts[idx].id : null;
}

const wait = async () => { await prompt(`\n${c.dim}Press Enter...${c.reset}`); };

const MENU: MenuItem[] = [
  { id: 'build-all', label: 'Build All', desc: 'habits + cortex + base' },
  { id: 'build-habits', label: 'Build Habits' },
  { id: 'build-cortex', label: 'Build Cortex' },
  { id: 'build-base', label: 'Build Base' },

  { id: 'pack-showcase', label: 'Pack Showcase App', desc: 'interactive pack' },
  { id: 'pack-all', label: 'Pack All', desc: 'habits + cortex + base' },
  { id: 'pack-habits', label: 'Pack Habits' },
  { id: 'pack-sea', label: 'Pack SEA Binary', desc: 'single executable' },
  { id: 'pack-desktop', label: 'Pack Desktop App', desc: 'Electron dmg' },
  { id: 'pack-mobile', label: 'Pack Mobile App', desc: 'Cordova android' },
  { id: 'publish-all', label: 'Publish All', desc: 'habits + cortex + base' },
  { id: 'publish-all-next', label: 'Publish All @next', desc: 'pre-release' },
  { id: 'publish-habits', label: 'Publish Habits', desc: 'latest' },
  { id: 'publish-habits-next', label: 'Publish Habits @next' },
  { id: 'publish-cortex', label: 'Publish Cortex' },
  { id: 'publish-base', label: 'Publish Base' },
  { id: 'npm-login', label: 'NPM Login' },
  { id: 'npm-whoami', label: 'NPM Whoami' },
  { id: 'run-example', label: 'Run Example' },
  { id: 'dev-cortex', label: 'Dev Cortex', desc: 'mixed/stack.yaml' },
  { id: 'dev-base', label: 'Dev Base' },
  { id: 'test-unit', label: 'Run Unit Tests' },
  { id: 'test-http', label: 'Run HTTP Tests' },
  { id: 'typecheck', label: 'Typecheck All' },
  { id: 'clean-all', label: 'Clean All', desc: 'dist + cache' },
  { id: 'clean-dist', label: 'Clean Dist' },
  { id: 'kill-port', label: 'Kill Port 3000' },
  { id: 'list-examples', label: 'List Examples' },
  { id: 'link-cortex-core', label: 'Link Cortex Core', desc: 'npm link from dist' },
  { id: 'unlink-cortex-core', label: 'Unlink Cortex Core' },
  // Bits Creator
  { id: 'bits-build-all', label: 'Build All Bits' },
  { id: 'bits-build-one', label: 'Build One Bit' },
  { id: 'bits-publish-verdaccio', label: 'Publish Bits to Verdaccio', desc: 'local registry' },
  { id: 'bits-publish-npm', label: 'Publish Bits to npm' },
  { id: 'bits-link-all', label: 'Link All Bits' },
  { id: 'bits-unlink-all', label: 'Unlink All Bits' },
  { id: 'bits-list', label: 'List Bits' },
  { id: 'bits-converter', label: 'Bits Converter CLI' },
  { id: 'bits-server', label: 'Bits Creator Server', desc: 'AI mode' },
  { id: 'bits-server-mock', label: 'Bits Creator Server (Mock)' },
  { id: 'exit', label: 'Exit' },
];

async function menu(): Promise<boolean> {
  console.clear();
  console.log(`${c.bold}${c.cyan}\n  ╔═══════════════════════════════════════╗\n  ║     🔧 Habits Development CLI 🔧      ║\n  ╚═══════════════════════════════════════╝${c.reset}\n`);

  const id = await select('Select an action:', MENU);

  switch (id) {
    case 'build-all': logHeader('Building All'); actions.buildAll(); break;
    case 'build-habits': logHeader('Building Habits'); actions.buildHabits(); break;
    case 'build-cortex': logHeader('Building Cortex'); actions.buildCortex(); break;
    case 'build-base': logHeader('Building Base'); actions.buildBase(); break;
    case 'build-showcase': {
      logHeader('Build Showcase App');
      const cmd = await buildShowcaseInteractive({ select, prompt });
      if (cmd) {
        console.log(`\n${c.cyan}Command:${c.reset}\n${c.gray}${cmd}${c.reset}\n`);
        const confirm = await prompt(`${c.green}Run this command? (Y/n): ${c.reset}`);
        if (confirm.toLowerCase() !== 'n') {
          actions.run(cmd);
        }
      }
      break;
    }
    case 'pack-all': logHeader('Packing All'); actions.packAll(); break;
    case 'pack-habits': logHeader('Packing Habits'); actions.packHabits(); break;
    case 'pack-sea': logHeader('Packing SEA Binary'); actions.packSea(); break;
    case 'pack-desktop': logHeader('Packing Desktop App'); actions.packDesktop(); break;
    case 'pack-mobile': logHeader('Packing Mobile App'); actions.packMobile(); break;
    case 'publish-all': logHeader('Publishing All'); actions.publishAll(); logSuccess('All published!'); break;
    case 'publish-all-next': logHeader('Publishing All @next'); actions.publishAll('next'); logSuccess('All published @next!'); break;
    case 'publish-habits': logHeader('Publishing Habits'); actions.publishHabits(); break;
    case 'publish-habits-next': logHeader('Publishing Habits @next'); actions.publishHabits('next'); break;
    case 'publish-cortex': logHeader('Publishing Cortex'); actions.publishCortex(); break;
    case 'publish-base': logHeader('Publishing Base'); actions.publishBase(); break;
    case 'npm-login': logHeader('NPM Login'); actions.npmLogin(); break;
    case 'npm-whoami': logHeader('NPM Whoami'); actions.npmWhoami(); break;
    case 'run-example': {
      const examples = discoverExamples();
      const items: MenuItem[] = examples.map(e => ({ id: e, label: e }));
      const exId = await select(`Select example (${examples.length}):`, items);
      if (exId) { logHeader(`Running: ${exId}`); actions.runExample(exId); }
      break;
    }
    case 'dev-cortex': logHeader('Dev Cortex'); actions.devCortex(); break;
    case 'dev-base': logHeader('Dev Base'); actions.devBase(); break;
    case 'test-unit': logHeader('Unit Tests'); actions.testUnit(); break;
    case 'test-http': logHeader('HTTP Tests'); actions.testHttp(); break;
    case 'typecheck': logHeader('Typecheck'); actions.typecheck(); break;
    case 'clean-all': logHeader('Cleaning All'); actions.cleanAll(); logSuccess('Cleaned'); break;
    case 'clean-dist': logHeader('Clean Dist'); actions.cleanDist(); logSuccess('Cleaned'); break;
    case 'kill-port': logHeader('Kill Port 3000'); actions.killPort(); logSuccess('Done'); break;
    case 'list-examples': logHeader('Examples'); actions.listExamples(); break;
    case 'link-cortex-core': logHeader('Linking Cortex Core'); actions.linkCortexCore(); logSuccess('Linked'); break;
    case 'unlink-cortex-core': logHeader('Unlinking Cortex Core'); actions.unlinkCortexCore(); logSuccess('Unlinked'); break;
    // Bits Creator
    case 'bits-build-all': logHeader('Building All Bits'); actions.buildAllBits(); logSuccess(`Built ${discoverBits().length} bits`); break;
    case 'bits-build-one': {
      const bits = discoverBits();
      const items: MenuItem[] = bits.map(b => ({ id: b, label: b }));
      const bit = await select(`Select bit (${bits.length}):`, items);
      if (bit) { logHeader(`Building ${bit}`); actions.buildBit(bit); }
      break;
    }
    case 'bits-publish-verdaccio': logHeader('Publishing Bits to Verdaccio'); actions.publishAllBitsVerdaccio(); logSuccess('Published'); break;
    case 'bits-publish-npm': logHeader('Publishing Bits to npm'); actions.publishAllBitsNpm(); logSuccess('Published'); break;
    case 'bits-link-all': logHeader('Linking All Bits'); actions.linkAllBits(); logSuccess('Linked'); break;
    case 'bits-unlink-all': logHeader('Unlinking All Bits'); actions.unlinkAllBits(); logSuccess('Unlinked'); break;
    case 'bits-list': logHeader('Bits'); actions.listBits(); break;
    case 'bits-converter': logHeader('Bits Converter'); actions.runBitsConverter(); break;
    case 'bits-server': actions.startBitsServer(); break;
    case 'bits-server-mock': actions.startBitsServerMock(); break;
    case 'exit': case null: return false;
  }

  if (id && id !== 'exit') await wait();
  return true;
}

async function main() {
  rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try { while (await menu()); console.log(`\n${c.gray}Goodbye! 👋${c.reset}\n`); }
  finally { rl.close(); }
}

main().catch(e => { console.error(e.message); process.exit(1); });
