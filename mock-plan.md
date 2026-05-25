# Simulation Mode for Habits

Dry-run a habit's full data flow from real frontend input to final output, without executing any bit.

Start the server with `--dry-run` and every call to `/api/:workflowId` runs simulation instead of real execution. The frontend sends its normal request, gets back a `SimulationReport` instead of a `WorkflowExecution`. No new endpoint, no new CLI subcommand.

```bash
npx habits cortex --config showcase/hello-world/stack.yaml --dry-run
```

---

## What the simulation does

- Resolve all `{{habits.env.X}}` references, flag missing ones
- Resolve all `{{habits.input.X}}` references against the real provided input, validate schema constraints
- Walk every node in dependency order, resolve parameters using real input + env
- Instead of calling any bit, store a **Proxy mock** in `context[nodeId]`
- Resolve output templates with proxy context to produce the simulated final output shape
- Scan the habit's HTML frontend for endpoint mismatches and output field mismatches
- Log colored summary to server terminal; return JSON `SimulationReport` to the caller

Does **not** execute any bit, make any network calls, or validate business logic inside bits.

---

## Files involved

```
CREATE  packages/cortex/core/src/simulation/types.ts
CREATE  packages/cortex/core/src/simulation/MockOutputFactory.ts
CREATE  packages/cortex/core/src/simulation/SimulationExecutor.ts
MODIFY  packages/cortex/core/src/WorkflowExecutor.ts   (4 private → protected + 2 getters)
MODIFY  packages/cortex/core/src/index.ts              (add exports)
MODIFY  packages/cortex/server/src/server.ts           (dryRun flag: swap executor + /api/ handler)
MODIFY  packages/habits/app/src/server.ts              (pass dryRun through HabitsServerOptions)
MODIFY  packages/habits/app/src/cli.ts                 (add --dry-run to cortex command)
```

---

## Step 1 — `packages/cortex/core/src/simulation/types.ts`

```typescript
export type SimulationStatus = 'pass' | 'warning' | 'error';
export type IssueSeverity = 'warning' | 'error';

export interface SimulationIssue {
  severity: IssueSeverity;
  /** Short machine-readable code, e.g. MISSING_ENV, BROKEN_REF */
  code: string;
  message: string;
  location?: string;   // nodeId, field path, or file path
  suggestion?: string;
}

export interface NodeSimulation {
  nodeId: string;
  nodeName: string;
  framework: string;
  module?: string;
  /** Resolved parameters after template substitution with real input + env */
  resolvedParams: Record<string, any>;
  /** Every field path accessed on this node's output by downstream templates */
  accessedFields: string[];
  issues: SimulationIssue[];
}

export interface SimulationReport {
  workflowId: string;
  workflowName: string;
  status: SimulationStatus;
  checks: {
    structure: SimulationIssue[];
    environment: SimulationIssue[];
    inputValidation: SimulationIssue[];
    dataFlow: NodeSimulation[];
    outputResolution: SimulationIssue[];
    frontendAnalysis: SimulationIssue[];
  };
  /** Output shape with [sim:nodeId.field] placeholders where bits would have produced values */
  simulatedOutput: Record<string, any> | null;
  warnings: SimulationIssue[];
  errors: SimulationIssue[];
  metadata: {
    habitPath: string;
    timestamp: string;
    durationMs: number;
  };
}

export interface SimulateOptions {
  habitPath?: string;
  printSummary?: boolean;
}
```

---

## Step 2 — `packages/cortex/core/src/WorkflowExecutor.ts` (4 access modifier changes + 2 getters)

No logic changes. Only `private` → `protected` so `SimulationExecutor` can inherit them.

```typescript
// line 1242 — BEFORE: private buildDependencyMap(
protected buildDependencyMap(nodes: WorkflowNode[], edges: WorkflowEdge[]): Map<string, NodeDependencies> {

// line 1296 — BEFORE: private findRunnableNodes(
protected findRunnableNodes(nodeStatuses: NodeExecutionStatus[], dependencies: Map<string, NodeDependencies>): string[] {

// line 1571 — BEFORE: private resolveParameters(
protected resolveParameters(params: Record<string, any>, context: Record<string, any>): Record<string, any> {

// line 1633 — BEFORE: private evaluateExpression(
protected evaluateExpression(expression: string, context: Record<string, any>): any {
```

Add two protected getters after the existing `getConfig()` getter:

```typescript
protected getLoadedWorkflow(workflowId: string): LoadedWorkflow | undefined {
  return this.loadedWorkflows.get(workflowId);
}

protected getEnv(): Record<string, string | undefined> {
  return this.env;
}
```

---

## Step 3 — `packages/cortex/core/src/simulation/MockOutputFactory.ts`

Every skipped bit node gets a Proxy stored in `context[nodeId]`. When `resolveParameters()` later accesses `context['say-hello']['message']`, the Proxy intercepts the access, records it in `accessLog`, and returns a nested Proxy. When the value is finally coerced to a string it returns `"[sim:say-hello.message]"`.

```
resolveParameters processes: "{{say-hello.message}}"
  → evaluateExpression("say-hello.message", context)
    → context['say-hello']          = Proxy(path='say-hello')
    → Proxy['message']              = Proxy(path='say-hello.message')   ← get trap: records access
    → String(result)                = "[sim:say-hello.message]"         ← toString trap
```

```typescript
/**
 * accessLog: nodeId → Set of full paths accessed downstream (e.g. "say-hello.message")
 * path: the full dot-path this proxy represents (e.g. "say-hello" or "say-hello.message")
 */
export function createProxyMock(
  path: string,
  accessLog: Map<string, Set<string>>,
): any {
  const rootNode = path.split('.')[0];

  const handler: ProxyHandler<object> = {
    get(_target, prop: string | symbol): any {
      // Coercion traps — called when JS converts the proxy to a primitive
      if (prop === Symbol.toPrimitive) return (_hint: string) => `[sim:${path}]`;
      if (prop === 'valueOf')          return () => `[sim:${path}]`;
      if (prop === 'toString')         return () => `[sim:${path}]`;
      // JSON.stringify calls this
      if (prop === 'toJSON')           return () => `[sim:${path}]`;
      // Allow for...of without crashing
      if (prop === Symbol.iterator)    return function* () {};
      if (typeof prop === 'symbol')    return undefined;

      // Real property access — record it and return a child proxy for further nesting
      const childPath = `${path}.${String(prop)}`;
      if (!accessLog.has(rootNode)) accessLog.set(rootNode, new Set());
      accessLog.get(rootNode)!.add(childPath);

      return createProxyMock(childPath, accessLog);
    },
    has:            () => true,               // prop in proxy → true
    getPrototypeOf: () => Object.prototype,   // instanceof checks don't crash
  };

  return new Proxy(Object.create(null), handler);
}
```

**Why each trap is needed** — based on what `resolveParameters` actually does with values:

| Call site in `resolveParameters` | Trap that handles it |
|---|---|
| `String(evaluatedValue)` | `toString` |
| `JSON.stringify(evaluatedValue)` | `toJSON` |
| `typeof evaluatedValue === 'object'` | returns `true` (proxy is an object) |
| `evaluatedValue === undefined` | returns `false` so no default fires |
| `for...of` iteration | `Symbol.iterator` yields nothing |

---

## Step 4 — `packages/cortex/core/src/simulation/SimulationExecutor.ts`

Extends `WorkflowExecutor` so it reuses the four protected methods. Adds a single public `simulate()` method.

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { WorkflowExecutor } from '../WorkflowExecutor';
import { Workflow, WorkflowNode, NodeExecutionStatus } from '@habits/shared/types';
import { SimulationReport, SimulationStatus, SimulationIssue, NodeSimulation, SimulateOptions } from './types';
import { createProxyMock } from './MockOutputFactory';

export class SimulationExecutor extends WorkflowExecutor {

  async simulate(
    workflowId: string,
    input: Record<string, any>,
    options: SimulateOptions = {},
  ): Promise<SimulationReport> {
    const startTime = Date.now();
    const errors: SimulationIssue[] = [];
    const warnings: SimulationIssue[] = [];

    // 1. Load workflow
    const loaded = this.getLoadedWorkflow(workflowId);
    if (!loaded) {
      errors.push({ severity: 'error', code: 'WORKFLOW_NOT_FOUND', message: `Workflow not found: ${workflowId}` });
      return this.buildReport(workflowId, 'unknown', null, {}, errors, warnings, startTime, options);
    }
    const { workflow } = loaded;

    // 2. Structure checks (circular deps, broken edge references)
    const structureIssues = this.checkStructure(workflow);
    errors.push(...structureIssues.filter(i => i.severity === 'error'));
    warnings.push(...structureIssues.filter(i => i.severity === 'warning'));

    // 3. Build context with real input + env
    const context: Record<string, any> = {
      'habits.input': input,
      'habits.env': this.getEnv(),
      'habits.context': {
        workflowId: workflow.id,
        executionId: `sim-${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
    };

    // 4. Env checks: scan node params for {{habits.env.X}}
    const envIssues = this.checkEnv(workflow);
    errors.push(...envIssues.filter(i => i.severity === 'error'));
    warnings.push(...envIssues.filter(i => i.severity === 'warning'));

    // 5. Input checks: scan for {{habits.input.X}}, validate schema
    const inputIssues = this.checkInput(workflow, input);
    errors.push(...inputIssues.filter(i => i.severity === 'error'));
    warnings.push(...inputIssues.filter(i => i.severity === 'warning'));

    // 6. Data flow: topological walk — resolve params, place Proxy mock in context
    const accessLog = new Map<string, Set<string>>();
    const nodeSimulations: NodeSimulation[] = [];
    const nodes = workflow.nodes || [];
    const edges = workflow.edges || [];
    const dependencyMap = this.buildDependencyMap(nodes, edges);

    const nodeStatuses: NodeExecutionStatus[] = nodes.map(n => ({
      nodeId: n.id,
      status: 'pending' as const,
    }));

    while (true) {
      const runnable = this.findRunnableNodes(nodeStatuses, dependencyMap);
      if (runnable.length === 0) break;

      for (const nodeId of runnable) {
        const node = nodes.find(n => n.id === nodeId)!;
        const nodeSim = this.simulateNode(node, context, accessLog);
        nodeSimulations.push(nodeSim);
        errors.push(...nodeSim.issues.filter(i => i.severity === 'error'));
        warnings.push(...nodeSim.issues.filter(i => i.severity === 'warning'));
        nodeStatuses.find(s => s.nodeId === nodeId)!.status = 'completed';
      }
    }

    // 7. Output resolution
    let simulatedOutput: Record<string, any> | null = null;
    const outputIssues: SimulationIssue[] = [];
    if (workflow.output) {
      try {
        simulatedOutput = this.resolveParameters(workflow.output as any, context);
      } catch (err: any) {
        outputIssues.push({ severity: 'error', code: 'OUTPUT_RESOLUTION_FAILED', message: err.message });
      }
    }
    errors.push(...outputIssues.filter(i => i.severity === 'error'));
    warnings.push(...outputIssues.filter(i => i.severity === 'warning'));

    // 8. Frontend analysis
    const frontendIssues = this.analyzeFrontend(workflow, loaded.reference.path);
    errors.push(...frontendIssues.filter(i => i.severity === 'error'));
    warnings.push(...frontendIssues.filter(i => i.severity === 'warning'));

    // 9. Attach access log to node simulations
    for (const ns of nodeSimulations) {
      ns.accessedFields = Array.from(accessLog.get(ns.nodeId) || []);
    }

    return this.buildReport(
      workflowId, workflow.name, simulatedOutput,
      { structure: structureIssues, environment: envIssues, inputValidation: inputIssues,
        dataFlow: nodeSimulations, outputResolution: outputIssues, frontendAnalysis: frontendIssues },
      errors, warnings, startTime, options,
    );
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  private simulateNode(
    node: WorkflowNode,
    context: Record<string, any>,
    accessLog: Map<string, Set<string>>,
  ): NodeSimulation {
    const issues: SimulationIssue[] = [];
    let resolvedParams: Record<string, any> = {};

    try {
      const rawParams = { ...(node.data?.params || {}), ...(node.data?.credentials || {}) };
      resolvedParams = this.resolveParameters(rawParams, context);
      this.warnUnresolvedHabitsTemplates(resolvedParams, node.id, issues);
    } catch (err: any) {
      issues.push({ severity: 'error', code: 'PARAM_RESOLUTION_FAILED', message: err.message, location: node.id });
    }

    // Put Proxy mock in context so downstream nodes can reference this node's output
    context[node.id] = createProxyMock(node.id, accessLog);

    return {
      nodeId: node.id,
      nodeName: node.data?.label || node.id,
      framework: node.data?.framework || 'unknown',
      module: node.data?.module,
      resolvedParams,
      accessedFields: [], // filled after full walk
      issues,
    };
  }

  private checkEnv(workflow: Workflow): SimulationIssue[] {
    const issues: SimulationIssue[] = [];
    const ENV_PATTERN = /\{\{habits\.env\.([^}]+)\}\}/g;
    const env = this.getEnv();

    for (const { str, location } of this.collectTemplateStrings(workflow)) {
      let m: RegExpExecArray | null;
      while ((m = ENV_PATTERN.exec(str)) !== null) {
        const varName = m[1].trim();
        if (!env[varName] && !process.env[varName]) {
          issues.push({
            severity: 'error', code: 'MISSING_ENV',
            message: `Environment variable "${varName}" is not set`,
            location,
            suggestion: `Add ${varName} to your .env file or the env section of stack.yaml`,
          });
        }
      }
    }
    return issues;
  }

  private checkInput(workflow: Workflow, input: Record<string, any>): SimulationIssue[] {
    const issues: SimulationIssue[] = [];
    const INPUT_PATTERN = /\{\{habits\.input\.([^}|]+)/g;

    for (const { str, location } of this.collectTemplateStrings(workflow)) {
      let m: RegExpExecArray | null;
      while ((m = INPUT_PATTERN.exec(str)) !== null) {
        const fieldPath = m[1].trim();
        const topField = fieldPath.split('.')[0];
        if (!(topField in input)) {
          issues.push({
            severity: 'warning', code: 'MISSING_INPUT_FIELD',
            message: `Template references "habits.input.${fieldPath}" but "${topField}" was not in the provided input`,
            location,
          });
        }
      }
    }

    for (const fieldDef of (workflow.input || [])) {
      if (fieldDef.required && !(fieldDef.name in input)) {
        issues.push({
          severity: 'error', code: 'REQUIRED_INPUT_MISSING',
          message: `Required input field "${fieldDef.name}" was not provided`,
          location: `input.${fieldDef.name}`,
        });
      }
    }
    return issues;
  }

  private checkStructure(workflow: Workflow): SimulationIssue[] {
    const issues: SimulationIssue[] = [];
    const nodeIds = new Set((workflow.nodes || []).map(n => n.id));

    for (const edge of workflow.edges || []) {
      if (!nodeIds.has(edge.source))
        issues.push({ severity: 'error', code: 'BROKEN_EDGE_SOURCE',
          message: `Edge references non-existent source node "${edge.source}"`,
          location: `edge(${edge.source} → ${edge.target})` });
      if (!nodeIds.has(edge.target))
        issues.push({ severity: 'error', code: 'BROKEN_EDGE_TARGET',
          message: `Edge references non-existent target node "${edge.target}"`,
          location: `edge(${edge.source} → ${edge.target})` });
    }

    // DFS cycle detection
    const adj = new Map<string, string[]>();
    for (const edge of workflow.edges || []) {
      if (!adj.has(edge.source)) adj.set(edge.source, []);
      adj.get(edge.source)!.push(edge.target);
    }
    const visited = new Set<string>(), inStack = new Set<string>();
    const dfs = (id: string, path: string[]): void => {
      visited.add(id); inStack.add(id);
      for (const nb of adj.get(id) || []) {
        if (!visited.has(nb)) dfs(nb, [...path, nb]);
        else if (inStack.has(nb))
          issues.push({ severity: 'error', code: 'CIRCULAR_DEPENDENCY',
            message: `Circular dependency: ${[...path, nb].join(' → ')}` });
      }
      inStack.delete(id);
    };
    for (const node of workflow.nodes || []) {
      if (!visited.has(node.id)) dfs(node.id, [node.id]);
    }
    return issues;
  }

  private analyzeFrontend(workflow: Workflow, habitYamlPath: string | undefined): SimulationIssue[] {
    const issues: SimulationIssue[] = [];
    if (!habitYamlPath) return issues;

    const habitDir = path.dirname(habitYamlPath);
    const candidates = [
      path.join(habitDir, '..', 'frontend', 'index.html'),
      path.join(habitDir, 'frontend', 'index.html'),
      path.join(habitDir, 'index.html'),
    ];
    const htmlPath = candidates.find(p => fs.existsSync(p));
    if (!htmlPath) return issues;

    const html = fs.readFileSync(htmlPath, 'utf-8');

    // Check 1: fetch('/api/<id>') matches workflow ID
    const fetchUrlPattern = /fetch\(['"`]\/api\/([^'"`\s?]+)/g;
    let m: RegExpExecArray | null;
    while ((m = fetchUrlPattern.exec(html)) !== null) {
      if (m[1] !== workflow.id)
        issues.push({ severity: 'error', code: 'FRONTEND_WRONG_ENDPOINT',
          message: `Frontend calls /api/${m[1]} but workflow ID is "${workflow.id}"`,
          location: htmlPath, suggestion: `Change fetch URL to /api/${workflow.id}` });
    }

    // Check 2: JSON.stringify body keys vs input schema
    const schemaKeys = new Set((workflow.input || []).map((f: any) => f.name));
    const bodyPattern = /JSON\.stringify\(\s*\{([^}]+)\}/g;
    while ((m = bodyPattern.exec(html)) !== null) {
      const keyPattern = /(\w+)\s*:/g;
      let km: RegExpExecArray | null;
      while ((km = keyPattern.exec(m[1])) !== null) {
        if (!schemaKeys.has(km[1]))
          issues.push({ severity: 'warning', code: 'FRONTEND_EXTRA_INPUT_FIELD',
            message: `Frontend sends field "${km[1]}" not declared in workflow input schema`,
            location: htmlPath });
      }
    }

    // Check 3: output field accesses vs output schema
    const outputKeys = Object.keys(workflow.output || {});
    const outputAccessPattern = /(?:data|result|response)\.(?:output\.)?(\w+)/g;
    while ((m = outputAccessPattern.exec(html)) !== null) {
      if (outputKeys.length > 0 && !outputKeys.includes(m[1]))
        issues.push({ severity: 'warning', code: 'FRONTEND_UNKNOWN_OUTPUT_FIELD',
          message: `Frontend accesses output field "${m[1]}" not declared in workflow output schema`,
          location: htmlPath });
    }

    return issues;
  }

  private warnUnresolvedHabitsTemplates(
    params: Record<string, any>,
    nodeId: string,
    issues: SimulationIssue[],
  ): void {
    const check = (value: any, location: string) => {
      if (typeof value === 'string' && /\[sim:habits\./.test(value))
        issues.push({ severity: 'warning', code: 'UNRESOLVED_TEMPLATE',
          message: `Parameter "${location}" could not resolve: ${value}`, location: nodeId });
      else if (typeof value === 'object' && value !== null)
        for (const [k, v] of Object.entries(value)) check(v, `${location}.${k}`);
    };
    for (const [k, v] of Object.entries(params)) check(v, k);
  }

  private collectTemplateStrings(workflow: Workflow): Array<{ str: string; location: string }> {
    const results: Array<{ str: string; location: string }> = [];
    const visit = (value: any, location: string) => {
      if (typeof value === 'string' && value.includes('{{')) results.push({ str: value, location });
      else if (Array.isArray(value)) value.forEach((v, i) => visit(v, `${location}[${i}]`));
      else if (typeof value === 'object' && value !== null)
        for (const [k, v] of Object.entries(value)) visit(v, `${location}.${k}`);
    };
    for (const node of workflow.nodes || []) {
      visit(node.data?.params, `${node.id}.params`);
      visit(node.data?.credentials, `${node.id}.credentials`);
    }
    visit(workflow.output, 'output');
    return results;
  }

  private buildReport(
    workflowId: string, workflowName: string,
    simulatedOutput: Record<string, any> | null,
    checks: Partial<SimulationReport['checks']>,
    errors: SimulationIssue[], warnings: SimulationIssue[],
    startTime: number, options: SimulateOptions,
  ): SimulationReport {
    const status: SimulationStatus =
      errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'pass';

    const report: SimulationReport = {
      workflowId, workflowName, status,
      checks: {
        structure: checks.structure || [],
        environment: checks.environment || [],
        inputValidation: checks.inputValidation || [],
        dataFlow: checks.dataFlow || [],
        outputResolution: checks.outputResolution || [],
        frontendAnalysis: checks.frontendAnalysis || [],
      },
      simulatedOutput, warnings, errors,
      metadata: { habitPath: options.habitPath || '', timestamp: new Date().toISOString(), durationMs: Date.now() - startTime },
    };

    if (options.printSummary) printSimulationReport(report);
    return report;
  }
}

export function printSimulationReport(report: SimulationReport): void {
  const c = report.status === 'pass' ? '\x1b[32m' : report.status === 'warning' ? '\x1b[33m' : '\x1b[31m';
  const reset = '\x1b[0m';
  const icon = report.status === 'pass' ? '✓' : report.status === 'warning' ? '⚠' : '✗';

  console.log(`\n${c}${icon} [DRY-RUN] ${report.workflowName} (${report.workflowId})${reset}`);
  console.log(`  Status: ${c}${report.status.toUpperCase()}${reset}  |  ${report.errors.length} error(s), ${report.warnings.length} warning(s)  |  ${report.metadata.durationMs}ms\n`);

  const sections: Array<[string, SimulationIssue[]]> = [
    ['Structure',         report.checks.structure],
    ['Environment',       report.checks.environment],
    ['Input Validation',  report.checks.inputValidation],
    ['Output Resolution', report.checks.outputResolution],
    ['Frontend',          report.checks.frontendAnalysis],
  ];

  for (const [label, issues] of sections) {
    if (issues.length === 0) { console.log(`  \x1b[32m✓\x1b[0m ${label}`); continue; }
    console.log(`  ${label}:`);
    for (const issue of issues) {
      const ic = issue.severity === 'error' ? '\x1b[31m✗\x1b[0m' : '\x1b[33m⚠\x1b[0m';
      console.log(`    ${ic} [${issue.code}] ${issue.message}${issue.location ? ` (${issue.location})` : ''}`);
      if (issue.suggestion) console.log(`       → ${issue.suggestion}`);
    }
  }

  console.log('\n  Data flow:');
  for (const ns of report.checks.dataFlow) {
    const ni = ns.issues.some(i => i.severity === 'error') ? '\x1b[31m✗\x1b[0m' : '\x1b[32m✓\x1b[0m';
    console.log(`    ${ni} ${ns.nodeName} (${ns.nodeId}) [${ns.framework}${ns.module ? `:${ns.module}` : ''}]`);
    if (ns.accessedFields.length > 0) console.log(`       accessed by downstream: ${ns.accessedFields.join(', ')}`);
    for (const issue of ns.issues) {
      const ic = issue.severity === 'error' ? '\x1b[31m✗\x1b[0m' : '\x1b[33m⚠\x1b[0m';
      console.log(`       ${ic} ${issue.message}`);
    }
  }

  if (report.simulatedOutput) {
    console.log('\n  Simulated output:');
    console.log('  ' + JSON.stringify(report.simulatedOutput, null, 2).replace(/\n/g, '\n  '));
  }
  console.log('');
}
```

---

## Step 5 — `packages/cortex/core/src/index.ts` (add 2 lines at the bottom)

```typescript
export { SimulationExecutor, printSimulationReport } from './simulation/SimulationExecutor';
export type { SimulationReport, SimulationStatus, SimulationIssue, NodeSimulation, SimulateOptions } from './simulation/types';
```

---

## Step 6 — `packages/cortex/server/src/server.ts` (3 changes)

**6a. Constructor: accept dryRun, swap executor**

```typescript
// BEFORE (line 109):
constructor() {
  this.app = express();
  this.executor = new WorkflowExecutor();
  this.setupMiddleware();
}

// AFTER:
private dryRun: boolean = false;

constructor(options?: { dryRun?: boolean }) {
  this.app = express();
  this.dryRun = options?.dryRun ?? false;
  this.executor = this.dryRun ? new SimulationExecutor() : new WorkflowExecutor();
  this.setupMiddleware();
}
```

**6b. In the `/api/:workflowId` handler: branch on dryRun before calling executeWorkflow**

```typescript
// ADD this block at the top of the /api/:workflowId handler body,
// before the existing executeWorkflow call:
if (this.dryRun) {
  const simExecutor = this.executor as SimulationExecutor;
  const report = await simExecutor.simulate(workflowId, inputData, {
    habitPath: this.configPath,
    printSummary: true,
  });
  return res.status(200).json(report);
}

// existing code continues:
const workflowExecution = await this.executor.executeWorkflow(...);
```

**6c. `startServer()` function: accept dryRun**

```typescript
// BEFORE (line 1836):
export async function startServer(configPath: string, portOverride?: number): Promise<WorkflowExecutorServer> {
  const server = new WorkflowExecutorServer();

// AFTER:
export async function startServer(
  configPath: string,
  portOverride?: number,
  options?: { dryRun?: boolean },
): Promise<WorkflowExecutorServer> {
  const server = new WorkflowExecutorServer({ dryRun: options?.dryRun });
```

---

## Step 7 — `packages/habits/app/src/server.ts` (2 changes)

**7a. Add dryRun to HabitsServerOptions**

```typescript
export interface HabitsServerOptions {
  configPath: string;
  port?: number;
  dryRun?: boolean;   // ADD
}
```

**7b. Pass dryRun to startCortexServer**

```typescript
// BEFORE (line 117):
const server = await startCortexServer(options.configPath, options.port);

// AFTER:
const server = await startCortexServer(options.configPath, options.port, { dryRun: options.dryRun });
```

---

## Step 8 — `packages/habits/app/src/cli.ts` (2 changes)

**8a. Add --dry-run to the cortex command definition**

```typescript
// Inside the cortex command options object, after 'config':
'dry-run': {
  alias: 'd',
  describe: 'Simulate all workflow executions without running any bit',
  type: 'boolean',
  default: false,
},
```

**8b. Pass dryRun to startHabitsServer in runServerCommand**

```typescript
// BEFORE:
const server = await startHabitsServer({
  configPath,
  port: argv.port,
});

// AFTER:
const server = await startHabitsServer({
  configPath,
  port: argv.port,
  dryRun: argv['dry-run'],
});
```

---

## Usage

```bash
# Normal execution — bits run as usual
npx habits cortex --config showcase/hello-world/stack.yaml

# Dry-run — bits are skipped, /api/ returns SimulationReport
npx habits cortex --config showcase/hello-world/stack.yaml --dry-run
```

Frontend calls `/api/hello-world` identically in both modes. In dry-run mode it receives a `SimulationReport` instead of a `WorkflowExecution`.

---

## Testing Plan

All tests use `showcase/hello-world/stack.yaml` as the primary fixture because it has a clear structure: one node, two input fields, one output field referencing that node, and an HTML frontend — covering every check surface in one habit.

### 1. Build the package

Before running any test, rebuild so the `--dry-run` flag is in the binary:

```bash
pnpm nx build @ha-bits/cortex --skip-nx-cache
pnpm nx build @ha-bits/habits --skip-nx-cache
```

### 2. Test: happy path (all checks pass)

Start the server with `--dry-run` and POST the expected input:

```bash
# Terminal 1 — start dry-run server
cd /tmp && nohup npx habits cortex \
  --config /path/to/habits/showcase/hello-world/stack.yaml \
  --dry-run \
  > /tmp/habits-dryrun.log 2>&1 &
sleep 5

# Terminal 2 — send normal request
curl -s -X POST http://localhost:13000/api/hello-world \
  -H 'Content-Type: application/json' \
  -d '{"param1":"hello","param2":"world"}' | jq .
```

Expected response shape:

```json
{
  "workflowId": "hello-world",
  "workflowName": "Hello World Demo",
  "status": "pass",
  "checks": {
    "structure":        [],
    "environment":      [],
    "inputValidation":  [],
    "dataFlow": [
      {
        "nodeId": "say-hello",
        "framework": "bits",
        "resolvedParams": { "param1": "hello", "param2": "world" },
        "accessedFields": ["say-hello"],
        "issues": []
      }
    ],
    "outputResolution": [],
    "frontendAnalysis": []
  },
  "simulatedOutput": { "greeting": { "value": "[sim:say-hello]" } },
  "errors": [],
  "warnings": []
}
```

Also verify the server terminal printed a colored `✓ [DRY-RUN]` summary.

### 3. Test: missing env var (`MISSING_ENV`)

`habit-env.yaml` reads `{{habits.env.PARAM1}}`. Start the server **without** `PARAM1` set:

```bash
pkill -f habits; sleep 1
cd /tmp && nohup npx habits cortex \
  --config /path/to/habits/showcase/hello-world/stack.yaml \
  --dry-run \
  > /tmp/habits-dryrun-noenv.log 2>&1 &
sleep 5

curl -s -X POST http://localhost:13000/api/hello-world-env \
  -H 'Content-Type: application/json' \
  -d '{"param2":"world"}' | jq '.status, .checks.environment'
```

Expected: `"error"` and one `MISSING_ENV` issue for `PARAM1`.

Repeat with `PARAM1=hello` exported — expect `"pass"`:

```bash
pkill -f habits; sleep 1
PARAM1=hello npx habits cortex \
  --config /path/to/habits/showcase/hello-world/stack.yaml \
  --dry-run &
sleep 5
curl -s -X POST http://localhost:13000/api/hello-world-env \
  -H 'Content-Type: application/json' \
  -d '{"param2":"world"}' | jq '.status'
```

### 4. Test: missing required input (`REQUIRED_INPUT_MISSING`)

`hello-world` declares both `param1` and `param2` as required. POST with one missing:

```bash
curl -s -X POST http://localhost:13000/api/hello-world \
  -H 'Content-Type: application/json' \
  -d '{"param1":"hello"}' | jq '.status, .checks.inputValidation'
```

Expected: `"error"` with `REQUIRED_INPUT_MISSING` for `param2`.

### 5. Test: circular dependency and broken edge (`CIRCULAR_DEPENDENCY`, `BROKEN_EDGE_*`)

Create a temp habit file with a bad edge:

```bash
cat > /tmp/bad-habit.yaml << 'EOF'
id: bad-habit
name: Bad Habit
nodes:
  - id: node-a
    type: action
    data: { framework: bits, source: npm, module: "@ha-bits/bit-hello-world", operation: greet, params: {} }
  - id: node-b
    type: action
    data: { framework: bits, source: npm, module: "@ha-bits/bit-hello-world", operation: greet, params: {} }
edges:
  - { source: node-a, target: node-b }
  - { source: node-b, target: node-a }   # cycle
  - { source: node-a, target: ghost-node } # broken ref
EOF
```

Temporarily point the stack to this habit and run dry-run:

```bash
curl -s -X POST http://localhost:13000/api/bad-habit \
  -H 'Content-Type: application/json' \
  -d '{}' | jq '.checks.structure'
```

Expected: one `CIRCULAR_DEPENDENCY` and one `BROKEN_EDGE_TARGET` in `checks.structure`.

### 6. Test: frontend mismatch (`FRONTEND_WRONG_ENDPOINT`)

Edit `showcase/hello-world/frontend/index.html` temporarily — change `fetch('/api/hello-world')` to `fetch('/api/wrong-id')`. Restart dry-run server and POST:

```bash
curl -s -X POST http://localhost:13000/api/hello-world \
  -H 'Content-Type: application/json' \
  -d '{"param1":"hello","param2":"world"}' | jq '.checks.frontendAnalysis'
```

Expected: `FRONTEND_WRONG_ENDPOINT` error. Revert the HTML change after.

### 7. Test: normal mode is unaffected

Start **without** `--dry-run` and confirm `/api/hello-world` returns a real `WorkflowExecution`, not a `SimulationReport`:

```bash
pkill -f habits; sleep 1
cd /tmp && nohup npx habits cortex \
  --config /path/to/habits/showcase/hello-world/stack.yaml \
  > /tmp/habits-normal.log 2>&1 &
sleep 5

curl -s -X POST http://localhost:13000/api/hello-world \
  -H 'Content-Type: application/json' \
  -d '{"param1":"hello","param2":"world"}' | jq 'keys'
```

Expected keys like `executionId`, `status`, `output` — NOT `workflowId`/`checks`/`simulatedOutput`.

### 8. Test: `.habit` bundle file (same checks, packed format)

`.habit` files are ZIP archives that contain the workflow YAML, bundled JS, and optional `.env` inside a single file. The `--config` flag accepts them directly — the server unpacks to a temp directory before loading. The simulation checks should work identically because `SimulationExecutor` receives the same deserialized workflow after unpacking.

Use `showcase/hello-world-no-ui/dist/hello-world-no-ui.habit` which contains the same two-input, one-node workflow as the YAML fixture:

```bash
pkill -f habits; sleep 1
cd /tmp && nohup npx habits cortex \
  --config /path/to/habits/showcase/hello-world-no-ui/dist/hello-world-no-ui.habit \
  --dry-run \
  > /tmp/habits-habit-dryrun.log 2>&1 &
sleep 5

# Same POST as Test 2 — workflow ID is hello-world-no-ui
curl -s -X POST http://localhost:13001/api/hello-world-no-ui \
  -H 'Content-Type: application/json' \
  -d '{"param1":"hello","param2":"world"}' | jq '.status, .simulatedOutput'
```

Expected: `"pass"` and `simulatedOutput` with `[sim:say-hello]` placeholder — identical to the YAML result.

Also verify the server log shows the `📦 Loading .habit file:` banner **before** the `[DRY-RUN]` summary, confirming the unpack path ran correctly:

```bash
grep -E "Loading .habit|DRY-RUN" /tmp/habits-habit-dryrun.log
```

Expected output:

```
📦 Loading .habit file: .../hello-world-no-ui.habit
✓ [DRY-RUN] Hello World (Auto UI) (hello-world-no-ui)
```

### 9. Cleanup

```bash
pkill -f habits
```

### Summary of checks covered

| Check | Test case |
|---|---|
| `MISSING_ENV` | Test 3 (habit-env, no PARAM1 set) |
| `REQUIRED_INPUT_MISSING` | Test 4 (hello-world, param2 absent) |
| `CIRCULAR_DEPENDENCY` | Test 5 (bad-habit edges) |
| `BROKEN_EDGE_TARGET` | Test 5 (ghost-node reference) |
| `FRONTEND_WRONG_ENDPOINT` | Test 6 (wrong fetch URL) |
| `UNRESOLVED_TEMPLATE` | Covered implicitly in Test 3 (env var produces `[sim:habits.env.PARAM1]`) |
| Happy path / Proxy output | Test 2 (`[sim:say-hello]` in simulatedOutput) |
| Normal mode unaffected | Test 7 |
