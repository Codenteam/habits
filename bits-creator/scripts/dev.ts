#!/usr/bin/env npx tsx
/**
 * Bits Creator CLI - Interactive menu.
 * Usage: npx tsx scripts/dev.ts | pnpm dev:cli
 */

import * as readline from 'readline';
import * as actions from './actions.js';

const { c, logHeader, logSuccess, discoverBits } = actions;

let rl: readline.Interface;
const prompt = (msg: string): Promise<string> => new Promise(r => rl.question(msg, a => r(a.trim())));

const wait = async () => { await prompt(`\n${c.dim}Press Enter...${c.reset}`); };

type MenuItem = { id: string; label: string; desc?: string };

const MENU: MenuItem[] = [
  { id: 'build-all', label: 'Build All Bits' },
  { id: 'build-one', label: 'Build One Bit' },
  { id: 'publish-all-verdaccio', label: 'Publish All to Verdaccio', desc: 'local registry' },
  { id: 'publish-one-verdaccio', label: 'Publish One to Verdaccio' },
  { id: 'publish-all-npm', label: 'Publish All to npm', desc: 'npmjs.org' },
  { id: 'publish-one-npm', label: 'Publish One to npm' },
  { id: 'npm-login', label: 'NPM Login' },
  { id: 'npm-whoami', label: 'NPM Whoami' },
  { id: 'converter', label: 'Run Converter CLI' },
  { id: 'server-mock', label: 'Start Server (Mock)', desc: 'returns hello-world example' },
  { id: 'server', label: 'Start Server', desc: 'AI integration mode' },
  { id: 'link-all', label: 'Link All Bits' },
  { id: 'unlink-all', label: 'Unlink All Bits' },
  { id: 'link-habits-deps', label: 'Link Habits Deps', desc: '@ha-bits/cortex, core, etc.' },
  { id: 'unlink-habits-deps', label: 'Unlink Habits Deps' },
  { id: 'list', label: 'List Bits' },
  { id: 'clean', label: 'Clean', desc: 'rm -rf dist' },
  { id: 'install', label: 'Install', desc: 'pnpm install' },
  { id: 'exit', label: 'Exit' },
];

async function selectMenu(title: string, opts: MenuItem[]): Promise<string | null> {
  console.log(`\n${c.bold}${c.cyan}${title}${c.reset}\n`);
  opts.forEach((o, i) => console.log(`  ${c.yellow}${String(i + 1).padStart(2)}.${c.reset} ${o.label}${o.desc ? ` ${c.gray}${o.desc}${c.reset}` : ''}`));
  const idx = parseInt(await prompt(`\n${c.green}Enter number (1-${opts.length}): ${c.reset}`), 10) - 1;
  return idx >= 0 && idx < opts.length ? opts[idx].id : null;
}

async function selectBit(bits: string[], title: string): Promise<string | null> {
  const items = bits.map(b => ({ id: b, label: b }));
  return selectMenu(title, items);
}

async function menu(): Promise<boolean> {
  console.clear();
  console.log(`${c.bold}${c.cyan}\n  ╔═══════════════════════════════════════╗\n  ║       🧩 Bits Creator CLI 🧩          ║\n  ╚═══════════════════════════════════════╝${c.reset}\n`);

  const bits = discoverBits();
  const id = await selectMenu('Select an action:', MENU);

  switch (id) {
    case 'build-all': logHeader('Building All Bits'); actions.buildAll(); logSuccess(`Built ${bits.length} bits`); break;
    case 'build-one': {
      const bit = await selectBit(bits, `Select bit (${bits.length}):`);
      if (bit) { logHeader(`Building ${bit}`); actions.buildBit(bit); }
      break;
    }
    case 'publish-all-verdaccio': logHeader('Publishing All to Verdaccio'); actions.publishAllVerdaccio(); logSuccess(`Published ${bits.length} bits`); break;
    case 'publish-one-verdaccio': {
      const bit = await selectBit(bits, `Select bit (${bits.length}):`);
      if (bit) { logHeader(`Publishing ${bit} to Verdaccio`); actions.publishBitVerdaccio(bit); }
      break;
    }
    case 'publish-all-npm': logHeader('Publishing All to npm'); actions.publishAllNpm(); logSuccess(`Published ${bits.length} bits`); break;
    case 'publish-one-npm': {
      const bit = await selectBit(bits, `Select bit (${bits.length}):`);
      if (bit) { logHeader(`Publishing ${bit} to npm`); actions.publishBitNpm(bit); }
      break;
    }
    case 'npm-login': logHeader('NPM Login'); actions.npmLogin(); break;
    case 'npm-whoami': logHeader('NPM Whoami'); actions.npmWhoami(); break;
    case 'converter': logHeader('Converter CLI'); actions.runConverter(); break;
    case 'server-mock': actions.startServerMock(); break;
    case 'server': actions.startServer(); break;
    case 'link-all': logHeader('Linking All Bits'); actions.linkAll(); logSuccess(`Linked ${bits.length} bits`); break;
    case 'unlink-all': logHeader('Unlinking All Bits'); actions.unlinkAll(); logSuccess(`Unlinked ${bits.length} bits`); break;
    case 'link-habits-deps': actions.linkHabitsDeps(); break;
    case 'unlink-habits-deps': actions.unlinkHabitsDeps(); break;
    case 'list': logHeader('Bits'); actions.listBits(); break;
    case 'clean': logHeader('Cleaning'); actions.clean(); logSuccess('Cleaned'); break;
    case 'install': logHeader('Installing'); actions.install(); break;
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
