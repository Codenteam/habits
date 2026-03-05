#!/usr/bin/env npx tsx
/**
 * =============================================================================
 * Habits Examples TUI Runner
 * =============================================================================
 * Interactive terminal UI for managing example servers and running tests.
 *
 * Features:
 *   - Browse and select examples
 *   - Start/stop servers (multiple can run simultaneously)
 *   - Run .http tests (httpyac) without stopping servers
 *   - Run .test.yaml tests (bits-test) without stopping servers
 *   - View live server/test output
 *   - Dashboard of all running processes
 *
 * Usage:
 *   npx tsx examples/tui.tsx
 * =============================================================================
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { render, Box, Text, useInput, useApp, useStdout } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { spawn, ChildProcess, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

// =============================================================================
// Constants
// =============================================================================

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const PROJECT_ROOT = path.join(SCRIPT_DIR, '..');
const EXAMPLES_DIR = SCRIPT_DIR;
const DEFAULT_PORT = 3000;
const SERVER_STARTUP_TIMEOUT = 45000;
const SKIP_DIRS = ['unit-tests', 'bits', 'docs', 'test-script', 'logs'];
const MAX_LOG_LINES = 500;

// =============================================================================
// Types
// =============================================================================

interface ExampleInfo {
  name: string;
  dir: string;
  configFile: string | null;
  configType: 'stack' | 'config' | null;
  httpFiles: string[];
  testYamlFiles: string[];
  hasEnv: boolean;
  port: number;
}

type ProcessStatus = 'starting' | 'running' | 'stopped' | 'failed';

interface ManagedProcess {
  id: string;
  label: string;
  type: 'server' | 'http-test' | 'yaml-test';
  exampleName: string;
  status: ProcessStatus;
  process: ChildProcess | null;
  port?: number;
  lines: string[];
  startedAt: Date;
  exitCode?: number | null;
}

type View =
  | { kind: 'examples' }
  | { kind: 'detail'; example: ExampleInfo }
  | { kind: 'logs'; processId: string }
  | { kind: 'processes' };

// =============================================================================
// Example Discovery
// =============================================================================

function discoverExamples(): ExampleInfo[] {
  const results: ExampleInfo[] = [];
  if (!fs.existsSync(EXAMPLES_DIR)) return results;

  for (const entry of fs.readdirSync(EXAMPLES_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || SKIP_DIRS.includes(entry.name)) continue;

    const dir = path.join(EXAMPLES_DIR, entry.name);
    const stackYaml = path.join(dir, 'stack.yaml');
    const configJson = path.join(dir, 'config.json');

    let configFile: string | null = null;
    let configType: 'stack' | 'config' | null = null;

    if (fs.existsSync(stackYaml)) {
      configFile = stackYaml;
      configType = 'stack';
    } else if (fs.existsSync(configJson)) {
      configFile = configJson;
      configType = 'config';
    }

    const httpFiles: string[] = [];
    const testYamlFiles: string[] = [];

    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.http')) httpFiles.push(path.join(dir, f));
      if (f.endsWith('.test.yaml')) testYamlFiles.push(path.join(dir, f));
    }

    const port = configFile ? getPortFromConfig(configFile) : DEFAULT_PORT;

    results.push({
      name: entry.name,
      dir,
      configFile,
      configType,
      httpFiles,
      testYamlFiles,
      hasEnv: fs.existsSync(path.join(dir, '.env')),
      port,
    });
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

function getPortFromConfig(configPath: string): number {
  try {
    if (configPath.endsWith('.yaml')) {
      const m = fs.readFileSync(configPath, 'utf-8').match(/port:\s*(\d+)/);
      return m ? parseInt(m[1], 10) : DEFAULT_PORT;
    }
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return cfg?.server?.port || DEFAULT_PORT;
  } catch {
    return DEFAULT_PORT;
  }
}

// =============================================================================
// Process Manager (singleton-ish, shared via ref)
// =============================================================================

class ProcessManager {
  processes: Map<string, ManagedProcess> = new Map();
  private onChange: () => void;
  private idCounter = 0;

  constructor(onChange: () => void) {
    this.onChange = onChange;
  }

  private nextId(): string {
    return `proc-${++this.idCounter}`;
  }

  private appendLine(proc: ManagedProcess, line: string) {
    proc.lines.push(line);
    if (proc.lines.length > MAX_LOG_LINES) {
      proc.lines = proc.lines.slice(-MAX_LOG_LINES);
    }
    this.onChange();
  }

  startServer(example: ExampleInfo): string | null {
    if (!example.configFile) return null;

    // Check if already running for this example
    for (const [id, p] of this.processes) {
      if (p.exampleName === example.name && p.type === 'server' && (p.status === 'running' || p.status === 'starting')) {
        return id; // already running
      }
    }

    const id = this.nextId();
    const proc: ManagedProcess = {
      id,
      label: `Server: ${example.name}`,
      type: 'server',
      exampleName: example.name,
      status: 'starting',
      process: null,
      port: example.port,
      lines: [],
      startedAt: new Date(),
    };
    this.processes.set(id, proc);
    this.onChange();

    // Kill port first
    try {
      execSync(`lsof -t -i :${example.port} 2>/dev/null | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
    } catch {}

    setTimeout(() => this._launchServer(id, example), 1000);
    return id;
  }

  private async _launchServer(id: string, example: ExampleInfo) {
    const proc = this.processes.get(id);
    if (!proc) return;

    let args: string[];
    if (example.configType === 'stack') {
      args = ['nx', 'dev', '@ha-bits/cortex', '--config', example.configFile!];
    } else {
      args = ['tsx'];
      if (example.hasEnv) {
        args.push(`--env-file=${path.join(example.dir, '.env')}`);
      }
      args.push(path.join(PROJECT_ROOT, 'src', 'executer.ts'), 'server', '--config', example.configFile!);
    }

    this.appendLine(proc, `$ npx ${args.join(' ')}`);
    this.appendLine(proc, `Waiting for port ${example.port}...`);

    const child = spawn('npx', args, {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...(example.hasEnv ? { DOTENV_CONFIG_PATH: path.join(example.dir, '.env') } : {}),
      },
    });

    proc.process = child;

    child.stdout?.on('data', (data: Buffer) => {
      for (const line of data.toString().split('\n')) {
        if (line) this.appendLine(proc, line);
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      for (const line of data.toString().split('\n')) {
        if (line) this.appendLine(proc, line);
      }
    });

    child.on('close', (code) => {
      proc.exitCode = code;
      if (proc.status !== 'stopped') {
        proc.status = code === 0 ? 'stopped' : 'failed';
        this.appendLine(proc, `\nProcess exited with code ${code}`);
      }
      this.onChange();
    });

    child.on('error', (err) => {
      proc.status = 'failed';
      this.appendLine(proc, `Error: ${err.message}`);
      this.onChange();
    });

    // Wait for server to be ready
    const port = example.port;
    const start = Date.now();
    const poll = setInterval(async () => {
      const p = this.processes.get(id);
      if (!p || p.status === 'stopped' || p.status === 'failed') {
        clearInterval(poll);
        return;
      }

      const up = await isPortUp(port);
      if (up) {
        clearInterval(poll);
        p.status = 'running';
        this.appendLine(p, `\n✓ Server ready on port ${port}`);
      } else if (Date.now() - start > SERVER_STARTUP_TIMEOUT) {
        clearInterval(poll);
        p.status = 'failed';
        this.appendLine(p, `\n✗ Timeout waiting for port ${port}`);
      }
    }, 500);
  }

  runHttpTest(example: ExampleInfo, httpFile: string): string {
    const id = this.nextId();
    const filename = path.basename(httpFile);
    const proc: ManagedProcess = {
      id,
      label: `HTTP: ${example.name}/${filename}`,
      type: 'http-test',
      exampleName: example.name,
      status: 'running',
      process: null,
      lines: [],
      startedAt: new Date(),
    };
    this.processes.set(id, proc);
    this.onChange();

    this.appendLine(proc, `$ npx httpyac ${httpFile} --all --output short`);
    this.appendLine(proc, '');

    const child = spawn('npx', ['httpyac', httpFile, '--all', '--output', 'short'], {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    proc.process = child;

    child.stdout?.on('data', (data: Buffer) => {
      for (const line of data.toString().split('\n')) {
        if (line) this.appendLine(proc, line);
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      for (const line of data.toString().split('\n')) {
        if (line) this.appendLine(proc, line);
      }
    });

    child.on('close', (code) => {
      proc.exitCode = code;
      proc.status = code === 0 ? 'stopped' : 'failed';
      this.appendLine(proc, `\n${code === 0 ? '✓ Tests passed' : '✗ Tests failed'} (exit code ${code})`);
      this.onChange();
    });

    child.on('error', (err) => {
      proc.status = 'failed';
      this.appendLine(proc, `Error: ${err.message}`);
      this.onChange();
    });

    return id;
  }

  runYamlTest(example: ExampleInfo, testFile: string): string {
    const id = this.nextId();
    const filename = path.basename(testFile);
    const proc: ManagedProcess = {
      id,
      label: `YAML: ${example.name}/${filename}`,
      type: 'yaml-test',
      exampleName: example.name,
      status: 'running',
      process: null,
      lines: [],
      startedAt: new Date(),
    };
    this.processes.set(id, proc);
    this.onChange();

    this.appendLine(proc, `$ npx bits-test -f ${testFile}`);
    this.appendLine(proc, '');

    const child = spawn('npx', ['bits-test', '-f', testFile], {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    proc.process = child;

    child.stdout?.on('data', (data: Buffer) => {
      for (const line of data.toString().split('\n')) {
        if (line) this.appendLine(proc, line);
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      for (const line of data.toString().split('\n')) {
        if (line) this.appendLine(proc, line);
      }
    });

    child.on('close', (code) => {
      proc.exitCode = code;
      proc.status = code === 0 ? 'stopped' : 'failed';
      this.appendLine(proc, `\n${code === 0 ? '✓ Tests passed' : '✗ Tests failed'} (exit code ${code})`);
      this.onChange();
    });

    child.on('error', (err) => {
      proc.status = 'failed';
      this.appendLine(proc, `Error: ${err.message}`);
      this.onChange();
    });

    return id;
  }

  stopProcess(id: string) {
    const proc = this.processes.get(id);
    if (!proc || !proc.process) return;

    proc.status = 'stopped';
    this.appendLine(proc, '\nStopping...');

    try {
      proc.process.kill('SIGTERM');
    } catch {}

    if (proc.port) {
      try {
        execSync(`lsof -t -i :${proc.port} 2>/dev/null | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
      } catch {}
    }

    this.onChange();
  }

  removeProcess(id: string) {
    const proc = this.processes.get(id);
    if (proc && (proc.status === 'running' || proc.status === 'starting')) {
      this.stopProcess(id);
    }
    this.processes.delete(id);
    this.onChange();
  }

  stopAll() {
    for (const [id] of this.processes) {
      this.stopProcess(id);
    }
  }

  getServerForExample(name: string): ManagedProcess | undefined {
    for (const [, p] of this.processes) {
      if (p.exampleName === name && p.type === 'server' && (p.status === 'running' || p.status === 'starting')) {
        return p;
      }
    }
    return undefined;
  }

  getAll(): ManagedProcess[] {
    return Array.from(this.processes.values());
  }

  getRunningCount(): number {
    return this.getAll().filter(p => p.status === 'running' || p.status === 'starting').length;
  }
}

function isPortUp(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.request(
      { hostname: 'localhost', port, path: '/health', method: 'GET', timeout: 1000 },
      () => resolve(true),
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

// =============================================================================
// UI Components
// =============================================================================

function StatusBadge({ status }: { status: ProcessStatus }) {
  switch (status) {
    case 'starting':
      return <Text color="yellow"><Spinner type="dots" /> starting</Text>;
    case 'running':
      return <Text color="green">● running</Text>;
    case 'stopped':
      return <Text color="gray">○ stopped</Text>;
    case 'failed':
      return <Text color="red">✗ failed</Text>;
  }
}

function Header({ runningCount }: { runningCount: number }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color="cyan">━━━ Habits Examples TUI ━━━</Text>
        {runningCount > 0 && (
          <Text color="green"> [{runningCount} running]</Text>
        )}
      </Box>
    </Box>
  );
}

function HelpBar({ hints }: { hints: string[] }) {
  return (
    <Box marginTop={1}>
      <Text dimColor>{hints.join('  │  ')}</Text>
    </Box>
  );
}

// =============================================================================
// Example List View
// =============================================================================

function ExampleListView({
  examples,
  manager,
  onSelect,
  onShowProcesses,
}: {
  examples: ExampleInfo[];
  manager: ProcessManager;
  onSelect: (e: ExampleInfo) => void;
  onShowProcesses: () => void;
}) {
  const [filter, setFilter] = useState('');

  useInput((input, key) => {
    if (input === 'p') {
      onShowProcesses();
    } else if (key.backspace || key.delete) {
      setFilter((f) => f.slice(0, -1));
    } else if (input && !key.ctrl && !key.meta && input !== '\r' && input !== '\n') {
      // Only add printable chars that aren't from arrow keys
      if (input.length === 1 && input.charCodeAt(0) >= 32) {
        setFilter((f) => f + input);
      }
    }
  });

  const filtered = filter
    ? examples.filter((e) => e.name.toLowerCase().includes(filter.toLowerCase()))
    : examples;

  const items = filtered.map((ex) => {
    const server = manager.getServerForExample(ex.name);
    const icon = server
      ? server.status === 'running'
        ? '●'
        : server.status === 'starting'
          ? '◌'
          : '○'
      : '○';
    const color = server?.status === 'running' ? 'green' : server?.status === 'starting' ? 'yellow' : '';
    const badges: string[] = [];
    if (ex.configFile) badges.push(ex.configType === 'stack' ? 'stack' : 'config');
    if (ex.httpFiles.length) badges.push(`${ex.httpFiles.length} http`);
    if (ex.testYamlFiles.length) badges.push(`${ex.testYamlFiles.length} yaml`);

    return {
      label: `${icon} ${ex.name}  ${badges.length ? `[${badges.join(', ')}]` : ''}`,
      value: ex.name,
      _example: ex,
      _color: color,
    };
  });

  return (
    <Box flexDirection="column">
      {filter && (
        <Box marginBottom={1}>
          <Text>Filter: </Text>
          <Text color="yellow">{filter}</Text>
          <Text dimColor> (type to filter, backspace to clear)</Text>
        </Box>
      )}
      <Text dimColor>
        {filtered.length} example{filtered.length !== 1 ? 's' : ''}
        {filter ? ` matching "${filter}"` : ''}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        <SelectInput
          items={items}
          onSelect={(item: any) => {
            const ex = examples.find((e) => e.name === item.value);
            if (ex) onSelect(ex);
          }}
        />
      </Box>
      <HelpBar hints={['↑↓ navigate', '⏎ select', 'type to filter', 'p processes', 'q quit']} />
    </Box>
  );
}

// =============================================================================
// Example Detail View
// =============================================================================

function ExampleDetailView({
  example,
  manager,
  onBack,
  onViewLogs,
}: {
  example: ExampleInfo;
  manager: ProcessManager;
  onBack: () => void;
  onViewLogs: (processId: string) => void;
}) {
  const server = manager.getServerForExample(example.name);

  const actions: { label: string; value: string }[] = [];

  // Server actions
  if (example.configFile) {
    if (server && (server.status === 'running' || server.status === 'starting')) {
      actions.push({ label: '⏹  Stop server', value: 'stop-server' });
      actions.push({ label: '📋 View server logs', value: 'view-server-logs' });
    } else {
      actions.push({ label: '▶  Start server', value: 'start-server' });
    }
  }

  // HTTP test actions
  if (example.httpFiles.length > 0) {
    if (example.httpFiles.length === 1) {
      actions.push({
        label: `🌐 Run HTTP test (${path.basename(example.httpFiles[0])})`,
        value: `http:${example.httpFiles[0]}`,
      });
    } else {
      for (const f of example.httpFiles) {
        actions.push({
          label: `🌐 Run HTTP: ${path.basename(f)}`,
          value: `http:${f}`,
        });
      }
    }
  }

  // YAML test actions
  if (example.testYamlFiles.length > 0) {
    if (example.testYamlFiles.length === 1) {
      actions.push({
        label: `🧪 Run YAML test (${path.basename(example.testYamlFiles[0])})`,
        value: `yaml:${example.testYamlFiles[0]}`,
      });
    } else {
      for (const f of example.testYamlFiles) {
        actions.push({
          label: `🧪 Run YAML: ${path.basename(f)}`,
          value: `yaml:${f}`,
        });
      }
    }
  }

  // Run all tests
  if (example.httpFiles.length + example.testYamlFiles.length > 1) {
    actions.push({ label: '🚀 Run all tests', value: 'run-all' });
  }

  actions.push({ label: '← Back to examples', value: 'back' });

  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  const handleSelect = (item: { value: string }) => {
    const { value } = item;
    if (value === 'back') {
      onBack();
    } else if (value === 'start-server') {
      const id = manager.startServer(example);
      if (id) onViewLogs(id);
    } else if (value === 'stop-server') {
      if (server) manager.stopProcess(server.id);
    } else if (value === 'view-server-logs') {
      if (server) onViewLogs(server.id);
    } else if (value.startsWith('http:')) {
      const file = value.slice(5);
      const id = manager.runHttpTest(example, file);
      onViewLogs(id);
    } else if (value.startsWith('yaml:')) {
      const file = value.slice(5);
      const id = manager.runYamlTest(example, file);
      onViewLogs(id);
    } else if (value === 'run-all') {
      let lastId: string | undefined;
      for (const f of example.httpFiles) {
        lastId = manager.runHttpTest(example, f);
      }
      for (const f of example.testYamlFiles) {
        lastId = manager.runYamlTest(example, f);
      }
      if (lastId) onViewLogs(lastId);
    }
  };

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">{example.name}</Text>
        <Text dimColor>Path: {example.dir}</Text>
        {example.configFile && <Text dimColor>Config: {example.configType} (port {example.port})</Text>}
        {server && (
          <Box>
            <Text>Server: </Text>
            <StatusBadge status={server.status} />
          </Box>
        )}
      </Box>

      <SelectInput items={actions} onSelect={handleSelect} />
      <HelpBar hints={['↑↓ navigate', '⏎ select', 'esc back']} />
    </Box>
  );
}

// =============================================================================
// Log Viewer
// =============================================================================

function LogView({
  processId,
  manager,
  onBack,
}: {
  processId: string;
  manager: ProcessManager;
  onBack: () => void;
}) {
  const proc = manager.processes.get(processId);
  const { stdout } = useStdout();
  const rows = stdout?.rows ?? 24;
  const visibleLines = rows - 8; // reserve for header + footer
  const [scrollOffset, setScrollOffset] = useState(0);
  const [follow, setFollow] = useState(true);

  useInput((input, key) => {
    if (key.escape || input === 'b') {
      onBack();
    } else if (input === 's' && proc && (proc.status === 'running' || proc.status === 'starting')) {
      manager.stopProcess(processId);
    } else if (key.upArrow) {
      setFollow(false);
      setScrollOffset((o) => Math.max(0, o - 1));
    } else if (key.downArrow) {
      setFollow(false);
      setScrollOffset((o) => {
        const max = Math.max(0, (proc?.lines.length ?? 0) - visibleLines);
        return Math.min(max, o + 1);
      });
    } else if (input === 'f') {
      setFollow(true);
    }
  });

  if (!proc) {
    return (
      <Box flexDirection="column">
        <Text color="red">Process not found.</Text>
        <HelpBar hints={['esc/b back']} />
      </Box>
    );
  }

  const lines = proc.lines;
  const totalLines = lines.length;

  let startIdx: number;
  if (follow) {
    startIdx = Math.max(0, totalLines - visibleLines);
  } else {
    startIdx = Math.min(scrollOffset, Math.max(0, totalLines - visibleLines));
  }
  const displayLines = lines.slice(startIdx, startIdx + visibleLines);

  const hints = ['esc/b back', '↑↓ scroll', 'f follow'];
  if (proc.status === 'running' || proc.status === 'starting') {
    hints.push('s stop');
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>{proc.label} </Text>
        <StatusBadge status={proc.status} />
        <Text dimColor> ({totalLines} lines{follow ? ', following' : ''})</Text>
      </Box>
      <Box flexDirection="column" height={visibleLines}>
        {displayLines.map((line, i) => (
          <Text key={startIdx + i} wrap="truncate">
            {line}
          </Text>
        ))}
      </Box>
      <HelpBar hints={hints} />
    </Box>
  );
}

// =============================================================================
// Running Processes View
// =============================================================================

function ProcessesView({
  manager,
  onBack,
  onViewLogs,
}: {
  manager: ProcessManager;
  onBack: () => void;
  onViewLogs: (id: string) => void;
}) {
  const procs = manager.getAll();

  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  if (procs.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyan">Running Processes</Text>
        <Text dimColor>No processes.</Text>
        <HelpBar hints={['esc back']} />
      </Box>
    );
  }

  const items = procs.map((p) => ({
    label: `${statusIcon(p.status)} ${p.label}  [${p.status}${p.port ? ` :${p.port}` : ''}]`,
    value: p.id,
  }));

  items.push({ label: '🛑 Stop all', value: '__stop_all__' });
  items.push({ label: '← Back', value: '__back__' });

  const handleSelect = (item: { value: string }) => {
    if (item.value === '__back__') {
      onBack();
    } else if (item.value === '__stop_all__') {
      manager.stopAll();
    } else {
      onViewLogs(item.value);
    }
  };

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Processes ({procs.length})</Text>
      <Box marginTop={1} flexDirection="column">
        <SelectInput items={items} onSelect={handleSelect} />
      </Box>
      <HelpBar hints={['↑↓ navigate', '⏎ view logs', 'esc back']} />
    </Box>
  );
}

function statusIcon(status: ProcessStatus): string {
  switch (status) {
    case 'starting': return '◌';
    case 'running': return '●';
    case 'stopped': return '○';
    case 'failed': return '✗';
  }
}

// =============================================================================
// App Root
// =============================================================================

function App() {
  const { exit } = useApp();
  const [view, setView] = useState<View>({ kind: 'examples' });
  const [, forceUpdate] = useState(0);
  const tick = useCallback(() => forceUpdate((n) => n + 1), []);
  const managerRef = useRef<ProcessManager | null>(null);

  if (!managerRef.current) {
    managerRef.current = new ProcessManager(tick);
  }
  const manager = managerRef.current;

  const examples = useRef(discoverExamples());

  // Periodic refresh for live updates (spinners, etc.)
  useEffect(() => {
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [tick]);

  // Global quit
  useInput((input, key) => {
    if (input === 'q' && view.kind === 'examples') {
      manager.stopAll();
      setTimeout(() => exit(), 500);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Header runningCount={manager.getRunningCount()} />

      {view.kind === 'examples' && (
        <ExampleListView
          examples={examples.current}
          manager={manager}
          onSelect={(ex) => setView({ kind: 'detail', example: ex })}
          onShowProcesses={() => setView({ kind: 'processes' })}
        />
      )}

      {view.kind === 'detail' && (
        <ExampleDetailView
          example={view.example}
          manager={manager}
          onBack={() => setView({ kind: 'examples' })}
          onViewLogs={(pid) => setView({ kind: 'logs', processId: pid })}
        />
      )}

      {view.kind === 'logs' && (
        <LogView
          processId={view.processId}
          manager={manager}
          onBack={() => {
            // Go back to the detail view for this process's example
            const proc = manager.processes.get(view.processId);
            if (proc) {
              const ex = examples.current.find((e) => e.name === proc.exampleName);
              if (ex) {
                setView({ kind: 'detail', example: ex });
                return;
              }
            }
            setView({ kind: 'examples' });
          }}
        />
      )}

      {view.kind === 'processes' && (
        <ProcessesView
          manager={manager}
          onBack={() => setView({ kind: 'examples' })}
          onViewLogs={(pid) => setView({ kind: 'logs', processId: pid })}
        />
      )}
    </Box>
  );
}

// =============================================================================
// Entry Point
// =============================================================================

render(<App />);
