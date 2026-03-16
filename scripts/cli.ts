#!/usr/bin/env npx tsx
/**
 * Habits CLI - Non-interactive command line interface.
 * 
 * Usage: npx tsx scripts/cli.ts <category>:<action> [options]
 * 
 * Categories:
 *   build   - Build packages
 *   pack    - Package/bundle apps
 *   publish - Publish to npm
 *   dev     - Development tools
 *   bits    - Bits creator actions
 * 
 * Examples:
 *   npx tsx scripts/cli.ts build:all
 *   npx tsx scripts/cli.ts pack:showcase --showcase marketing-campaign --format desktop-full --target mac
 *   npx tsx scripts/cli.ts dev:cortex --config showcase/mixed/stack.yaml
 *   npx tsx scripts/cli.ts bits:build-one --bit bit-openai
 */

import * as actions from './actions.js';

const { c, logHeader, logSuccess, logError, logInfo, discoverExamples, discoverBits, getShowcaseDefaults, getOutputExtension, buildPackShowcaseCommand, run } = actions;

// =============================================================================
// Action definitions organized by category
// =============================================================================

type ActionHandler = (args: Record<string, string | boolean | undefined>) => void | Promise<void>;

interface ActionDef {
  slug: string;
  desc: string;
  args?: { name: string; desc: string; required?: boolean; default?: string }[];
  handler: ActionHandler;
}

interface Category {
  slug: string;
  name: string;
  desc: string;
  actions: ActionDef[];
}

const CATEGORIES: Category[] = [
  // =========================================================================
  // BUILD CATEGORY
  // =========================================================================
  {
    slug: 'build',
    name: 'Build',
    desc: 'Build packages',
    actions: [
      { slug: 'all', desc: 'Build all packages (habits + cortex + base)', handler: () => { logHeader('Building All'); actions.buildAll(); logSuccess('All built!'); } },
      { slug: 'habits', desc: 'Build Habits package', handler: () => { logHeader('Building Habits'); actions.buildHabits(); } },
      { slug: 'cortex', desc: 'Build Cortex package', handler: () => { logHeader('Building Cortex'); actions.buildCortex(); } },
      { slug: 'base', desc: 'Build Base package', handler: () => { logHeader('Building Base'); actions.buildBase(); } },
    ],
  },
  
  // =========================================================================
  // PACK CATEGORY
  // =========================================================================
  {
    slug: 'pack',
    name: 'Pack',
    desc: 'Package/bundle applications',
    actions: [
      { slug: 'all', desc: 'Pack all packages (habits + cortex + base)', handler: () => { logHeader('Packing All'); actions.packAll(); logSuccess('All packed!'); } },
      { slug: 'habits', desc: 'Pack Habits package', handler: () => { logHeader('Packing Habits'); actions.packHabits(); } },
      {
        slug: 'showcase',
        desc: 'Pack a showcase app (non-interactive)',
        args: [
          { name: 'showcase', desc: 'Showcase name (e.g., marketing-campaign)', required: true },
          { name: 'format', desc: 'Format: mobile-full, desktop-full, mobile, desktop', required: true },
          { name: 'target', desc: 'Target: android, ios, mac, windows, linux', required: true },
          { name: 'app-name', desc: 'Custom app name (optional)' },
          { name: 'app-icon', desc: 'Path to app icon PNG (optional)' },
          { name: 'output', desc: 'Output path (optional)' },
          { name: 'debug', desc: 'Build in debug mode' },
        ],
        handler: (args) => {
          const showcase = args.showcase as string;
          const format = args.format as actions.PackShowcaseOptions['format'];
          const target = args.target as actions.PackShowcaseOptions['target'];
          
          const missing: string[] = [];
          if (!showcase) missing.push('--showcase');
          if (!format) missing.push('--format');
          if (!target) missing.push('--target');
          
          if (missing.length > 0) {
            logError(`Missing required args: ${missing.join(', ')}`);
            process.exit(1);
          }
          
          // Validate showcase exists
          const examples = discoverExamples();
          if (!examples.includes(showcase)) {
            logError(`Showcase '${showcase}' not found. Available: ${examples.join(', ')}`);
            process.exit(1);
          }
          
          // Validate format
          const validFormats = ['mobile-full', 'desktop-full', 'mobile', 'desktop'];
          if (!validFormats.includes(format)) {
            logError(`Invalid format '${format}'. Valid: ${validFormats.join(', ')}`);
            process.exit(1);
          }
          
          // Validate target
          const mobileTargets = ['android', 'ios'];
          const desktopTargets = ['mac', 'windows', 'linux'];
          const validTargets = format.includes('mobile') ? mobileTargets : desktopTargets;
          if (!validTargets.includes(target)) {
            logError(`Invalid target '${target}' for format '${format}'. Valid: ${validTargets.join(', ')}`);
            process.exit(1);
          }
          
          // Map friendly target names to actual platform values
          const targetMapping: Record<string, string> = {
            mac: 'dmg',
            windows: 'exe',
            linux: 'appimage',
            android: 'android',
            ios: 'ios',
          };
          const mappedTarget = targetMapping[target] || target;
          
          // Get defaults
          const defaults = getShowcaseDefaults(showcase);
          const appName = (args['app-name'] as string) || defaults.appName;
          const appIcon = (args['app-icon'] as string) || defaults.appIcon;
          const ext = getOutputExtension(format, target);
          const output = (args.output as string) || `/tmp/${showcase}${ext}`;
          
          const debug = args.debug === true || args.debug === 'true';
          
          logHeader(`Packing Showcase: ${showcase}`);
          logInfo(`Format: ${format}, Target: ${target} (${mappedTarget})`);
          logInfo(`App Name: ${appName}`);
          if (appIcon) logInfo(`App Icon: ${appIcon}`);
          logInfo(`Output: ${output}`);
          if (debug) logInfo(`Debug mode: enabled`);
          
          const cmd = buildPackShowcaseCommand({ showcase, format, target: mappedTarget as actions.PackShowcaseOptions['target'], appName, appIcon, output, debug });
          logInfo(`Command: ${c.gray}${cmd}${c.reset}`);
          
          if (run(cmd)) {
            logSuccess(`Showcase packed: ${output}`);
          } else {
            logError('Pack failed');
            process.exit(1);
          }
        },
      },
      {
        slug: 'sea',
        desc: 'Pack single-executable archive',
        args: [{ name: 'config', desc: 'Config file path', default: 'showcase/mixed/stack.yaml' }],
        handler: (args) => { logHeader('Packing SEA'); actions.packSea(args.config as string); },
      },
      {
        slug: 'desktop',
        desc: 'Pack desktop app (needs backend)',
        args: [
          { name: 'config', desc: 'Config file path', default: 'showcase/mixed/stack.yaml' },
          { name: 'backend-url', desc: 'Backend URL', default: 'http://localhost:3000' },
        ],
        handler: (args) => { logHeader('Packing Desktop'); actions.packDesktop(args.config as string, args['backend-url'] as string); },
      },
      {
        slug: 'mobile',
        desc: 'Pack mobile app (needs backend)',
        args: [
          { name: 'config', desc: 'Config file path', default: 'showcase/mixed/stack.yaml' },
          { name: 'backend-url', desc: 'Backend URL', default: 'http://localhost:3000' },
        ],
        handler: (args) => { logHeader('Packing Mobile'); actions.packMobile(args.config as string, args['backend-url'] as string); },
      },
    ],
  },
  
  // =========================================================================
  // PUBLISH CATEGORY
  // =========================================================================
  {
    slug: 'publish',
    name: 'Publish',
    desc: 'Publish packages to npm',
    actions: [
      {
        slug: 'all',
        desc: 'Publish all packages to npm',
        args: [{ name: 'tag', desc: 'npm tag (latest, next)', default: 'latest' }],
        handler: (args) => { logHeader('Publishing All'); actions.publishAll(args.tag as string); logSuccess('All published!'); },
      },
      {
        slug: 'habits',
        desc: 'Publish Habits package',
        args: [{ name: 'tag', desc: 'npm tag (latest, next)', default: 'latest' }],
        handler: (args) => { logHeader('Publishing Habits'); actions.publishHabits(args.tag as string); logSuccess('Habits published!'); },
      },
      {
        slug: 'cortex',
        desc: 'Publish Cortex package',
        args: [{ name: 'tag', desc: 'npm tag (latest, next)', default: 'latest' }],
        handler: (args) => { logHeader('Publishing Cortex'); actions.publishCortex(args.tag as string); logSuccess('Cortex published!'); },
      },
      {
        slug: 'base',
        desc: 'Publish Base package',
        args: [{ name: 'tag', desc: 'npm tag (latest, next)', default: 'latest' }],
        handler: (args) => { logHeader('Publishing Base'); actions.publishBase(args.tag as string); logSuccess('Base published!'); },
      },
      { slug: 'npm-login', desc: 'Login to npm registry', handler: () => { logHeader('NPM Login'); actions.npmLogin(); } },
      { slug: 'npm-whoami', desc: 'Show current npm user', handler: () => { logHeader('NPM Whoami'); actions.npmWhoami(); } },
    ],
  },
  
  // =========================================================================
  // DEV CATEGORY
  // =========================================================================
  {
    slug: 'dev',
    name: 'Dev',
    desc: 'Development tools and utilities',
    actions: [
      {
        slug: 'cortex',
        desc: 'Start Cortex dev server',
        args: [{ name: 'config', desc: 'Config file path', default: 'showcase/mixed/stack.yaml' }],
        handler: (args) => { logHeader('Dev Cortex'); actions.devCortex(args.config as string); },
      },
      { slug: 'base', desc: 'Start Base dev server', handler: () => { logHeader('Dev Base'); actions.devBase(); } },
      {
        slug: 'example',
        desc: 'Run a showcase example',
        args: [{ name: 'name', desc: 'Example name', required: true }],
        handler: (args) => {
          const name = args.name as string;
          if (!name) { logError('Missing --name'); process.exit(1); }
          const examples = discoverExamples();
          if (!examples.includes(name)) {
            logError(`Example '${name}' not found. Available: ${examples.join(', ')}`);
            process.exit(1);
          }
          logHeader(`Running: ${name}`);
          actions.runExample(name);
        },
      },
      { slug: 'test-unit', desc: 'Run unit tests', handler: () => { logHeader('Unit Tests'); actions.testUnit(); } },
      { slug: 'test-http', desc: 'Run HTTP tests', handler: () => { logHeader('HTTP Tests'); actions.testHttp(); } },
      { slug: 'typecheck', desc: 'Typecheck all packages', handler: () => { logHeader('Typecheck'); actions.typecheck(); } },
      { slug: 'clean-all', desc: 'Clean dist and cache', handler: () => { logHeader('Cleaning All'); actions.cleanAll(); logSuccess('Cleaned!'); } },
      { slug: 'clean-dist', desc: 'Clean dist folder', handler: () => { logHeader('Cleaning Dist'); actions.cleanDist(); logSuccess('Cleaned!'); } },
      { slug: 'kill-port', desc: 'Kill process on port 3000', handler: () => { logHeader('Kill Port 3000'); actions.killPort(); logSuccess('Done!'); } },
      { slug: 'list-examples', desc: 'List all showcase examples', handler: () => { logHeader('Examples'); actions.listExamples(); } },
      { slug: 'link-cortex', desc: 'Link Cortex Core for local dev', handler: () => { logHeader('Linking Cortex Core'); actions.linkCortexCore(); logSuccess('Linked!'); } },
      { slug: 'unlink-cortex', desc: 'Unlink Cortex Core', handler: () => { logHeader('Unlinking Cortex Core'); actions.unlinkCortexCore(); logSuccess('Unlinked!'); } },
    ],
  },
  
  // =========================================================================
  // BITS CATEGORY
  // =========================================================================
  {
    slug: 'bits',
    name: 'Bits',
    desc: 'Bits creator actions',
    actions: [
      { slug: 'build-all', desc: 'Build all bits', handler: () => { logHeader('Building All Bits'); actions.buildAllBits(); logSuccess(`Built ${discoverBits().length} bits`); } },
      {
        slug: 'build-one',
        desc: 'Build a single bit',
        args: [{ name: 'bit', desc: 'Bit name (e.g., bit-openai)', required: true }],
        handler: (args) => {
          const bit = args.bit as string;
          if (!bit) { logError('Missing --bit'); process.exit(1); }
          const bits = discoverBits();
          if (!bits.includes(bit)) {
            logError(`Bit '${bit}' not found. Available: ${bits.join(', ')}`);
            process.exit(1);
          }
          logHeader(`Building ${bit}`);
          actions.buildBit(bit);
        },
      },
      { slug: 'publish-verdaccio', desc: 'Publish all bits to Verdaccio', handler: () => { logHeader('Publishing Bits to Verdaccio'); actions.publishAllBitsVerdaccio(); logSuccess('Published!'); } },
      { slug: 'publish-npm', desc: 'Publish all bits to npm', handler: () => { logHeader('Publishing Bits to npm'); actions.publishAllBitsNpm(); logSuccess('Published!'); } },
      { slug: 'link-all', desc: 'Link all bits globally', handler: () => { logHeader('Linking All Bits'); actions.linkAllBits(); logSuccess('Linked!'); } },
      { slug: 'unlink-all', desc: 'Unlink all bits', handler: () => { logHeader('Unlinking All Bits'); actions.unlinkAllBits(); logSuccess('Unlinked!'); } },
      { slug: 'list', desc: 'List all available bits', handler: () => { logHeader('Bits'); actions.listBits(); } },
      { slug: 'converter', desc: 'Run bits converter CLI', handler: () => { logHeader('Bits Converter'); actions.runBitsConverter(); } },
      { slug: 'server', desc: 'Start bits creator server (AI mode)', handler: () => actions.startBitsServer() },
      { slug: 'server-mock', desc: 'Start bits creator server (mock mode)', handler: () => actions.startBitsServerMock() },
    ],
  },
];

// =============================================================================
// CLI Parser
// =============================================================================

function parseArgs(argv: string[]): { command: string | null; args: Record<string, string | boolean> } {
  const args: Record<string, string | boolean> = {};
  let command: string | null = null;
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    
    if (!arg.startsWith('-') && !command) {
      command = arg;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  
  return { command, args };
}

function findAction(command: string): { category: Category; action: ActionDef } | null {
  // Support both "category:action" and "category action" formats
  let categorySlug: string;
  let actionSlug: string;
  
  if (command.includes(':')) {
    [categorySlug, actionSlug] = command.split(':');
  } else {
    return null;
  }
  
  const category = CATEGORIES.find(c => c.slug === categorySlug);
  if (!category) return null;
  
  const action = category.actions.find(a => a.slug === actionSlug);
  if (!action) return null;
  
  return { category, action };
}

function printUsage() {
  console.log(`
${c.bold}${c.cyan}Habits CLI${c.reset} - Non-interactive command runner

${c.bold}Usage:${c.reset}
  npx tsx scripts/cli.ts ${c.green}<category>:<action>${c.reset} [options]
  npx tsx scripts/cli.ts ${c.green}--help${c.reset}
  npx tsx scripts/cli.ts ${c.green}--list${c.reset}

${c.bold}Categories:${c.reset}
`);

  for (const cat of CATEGORIES) {
    console.log(`  ${c.yellow}${cat.slug}${c.reset} - ${cat.desc}`);
  }
  
  console.log(`
${c.bold}Examples:${c.reset}
  ${c.gray}# Build all packages${c.reset}
  npx tsx scripts/cli.ts build:all

  ${c.gray}# Pack showcase app (non-interactive)${c.reset}
  npx tsx scripts/cli.ts pack:showcase --showcase marketing-campaign --format desktop-full --target mac

  ${c.gray}# Start dev server with custom config${c.reset}
  npx tsx scripts/cli.ts dev:cortex --config showcase/sql-demo/stack.yaml

  ${c.gray}# Build a single bit${c.reset}
  npx tsx scripts/cli.ts bits:build-one --bit bit-openai

  ${c.gray}# Publish with @next tag${c.reset}
  npx tsx scripts/cli.ts publish:habits --tag next
`);
}

function printList() {
  console.log(`\n${c.bold}${c.cyan}Available Commands${c.reset}\n`);
  
  for (const cat of CATEGORIES) {
    console.log(`${c.bold}${c.yellow}${cat.slug}${c.reset} - ${cat.desc}`);
    console.log(`${'─'.repeat(60)}`);
    
    for (const action of cat.actions) {
      const cmdStr = `${cat.slug}:${action.slug}`;
      console.log(`  ${c.green}${cmdStr.padEnd(25)}${c.reset} ${action.desc}`);
      
      if (action.args && action.args.length > 0) {
        for (const arg of action.args) {
          const reqStr = arg.required ? `${c.red}(required)${c.reset}` : arg.default ? `${c.gray}[default: ${arg.default}]${c.reset}` : '';
          console.log(`    ${c.gray}--${arg.name.padEnd(15)}${c.reset} ${arg.desc} ${reqStr}`);
        }
      }
    }
    console.log();
  }
}

function printCategoryHelp(categorySlug: string) {
  const category = CATEGORIES.find(c => c.slug === categorySlug);
  if (!category) {
    logError(`Unknown category: ${categorySlug}`);
    console.log(`\nAvailable categories: ${CATEGORIES.map(c => c.slug).join(', ')}`);
    process.exit(1);
  }
  
  console.log(`\n${c.bold}${c.yellow}${category.name}${c.reset} - ${category.desc}\n`);
  console.log(`${'─'.repeat(60)}`);
  
  for (const action of category.actions) {
    const cmdStr = `${category.slug}:${action.slug}`;
    console.log(`  ${c.green}${cmdStr.padEnd(25)}${c.reset} ${action.desc}`);
    
    if (action.args && action.args.length > 0) {
      for (const arg of action.args) {
        const reqStr = arg.required ? `${c.red}(required)${c.reset}` : arg.default ? `${c.gray}[default: ${arg.default}]${c.reset}` : '';
        console.log(`    ${c.gray}--${arg.name.padEnd(15)}${c.reset} ${arg.desc} ${reqStr}`);
      }
    }
  }
  console.log();
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const { command, args } = parseArgs(process.argv.slice(2));
  
  // Handle list flag first
  if (args.list || args.l) {
    printList();
    return;
  }
  
  // Handle help flags
  if (args.help || args.h || !command) {
    // Check if command is a category for category-specific help
    if (command && CATEGORIES.find(c => c.slug === command)) {
      printCategoryHelp(command);
    } else {
      printUsage();
    }
    return;
  }
  
  // Find and execute action
  const found = findAction(command);
  
  if (!found) {
    // Check if it's just a category name
    if (CATEGORIES.find(c => c.slug === command)) {
      printCategoryHelp(command);
      return;
    }
    
    logError(`Unknown command: ${command}`);
    console.log(`\nRun ${c.green}npx tsx scripts/cli.ts --list${c.reset} to see all commands.`);
    process.exit(1);
  }
  
  const { action } = found;
  
  // Apply default values for missing args
  if (action.args) {
    for (const argDef of action.args) {
      if (argDef.default && args[argDef.name] === undefined) {
        args[argDef.name] = argDef.default;
      }
    }
  }
  
  // Execute action
  await action.handler(args);
}

main().catch(e => {
  logError(e.message);
  process.exit(1);
});
