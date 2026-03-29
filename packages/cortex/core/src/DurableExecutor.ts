/*
  durable-workflow-engine.ts

  A single-file TypeScript skeleton for a durable workflow runtime that blends the
  common core of Temporal, Inngest, and OpenWorkflow:

  - append-only run history
  - memoized step checkpoints
  - durable sleep/timers
  - durable signal/event waits
  - retry + backoff
  - leased worker tasks
  - resumable execution by rerunning workflow code from the top

  IMPORTANT:
  - This file is self-contained and runnable with an in-memory adapter.
  - Workflow code should be deterministic except inside step.run()/waits/sleep.
  - step.run() bodies should be idempotent or call idempotent external systems.
  TODO: 
  - Make it work with SQLITE
*/

// =========================
// Types
// =========================

export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [k: string]: Json };

export type DurationLike = string | number;
export type RunStatus = "queued" | "running" | "waiting" | "completed" | "failed" | "cancelled";
export type StepStatus = "pending" | "running" | "completed" | "failed" | "sleeping" | "waiting";
export type TaskKind = "execute_run" | "resume_run";
export type MessageKind = "signal" | "event";

export interface WorkflowDefinition<I = any, O = any> {
  name: string;
  fn: WorkflowFn<I, O>;
}

export type WorkflowFn<I = any, O = any> = (ctx: WorkflowContext<I>) => Promise<O>;

export interface WorkflowContext<I = any> {
  runId: string;
  input: I;
  step: StepApi;
  state: StateApi;
  signal: SignalApi;
}

export interface StepRunOptions {
  retries?: number;
  backoffMs?: number;
}

export interface WaitOptions<T = any> {
  stepId?: string;
  timeout?: DurationLike;
  filter?: Json;
  match?: (payload: T) => boolean; // only in-memory in this file; production adapters should use serializable filters
}

export interface StepApi {
  run<T>(stepId: string, fn: () => Promise<T>, opts?: StepRunOptions): Promise<T>;
  sleep(stepId: string, duration: DurationLike): Promise<void>;
  waitForEvent<T = any>(name: string, opts?: WaitOptions<T>): Promise<T | null>;
  waitForSignal<T = any>(name: string, opts?: WaitOptions<T>): Promise<T | null>;
}

export interface StateApi {
  get<T = any>(key: string): T | undefined;
  set(key: string, value: Json): Promise<void>;
  all(): Promise<Record<string, Json>>;
}

export interface SignalApi {
  wait<T = any>(name: string, opts?: Omit<WaitOptions<T>, "stepId">): Promise<T | null>;
}

export interface WorkflowRun {
  id: string;
  workflowName: string;
  status: RunStatus;
  input: Json;
  output?: Json;
  error?: SerializedError;
  state: Record<string, Json>;
  currentTaskId?: string | null;
  lockOwner?: string | null;
  lockExpiresAt?: number | null;
  createdAt: number;
  updatedAt: number;
  completedAt?: number | null;
}

export interface WorkflowHistoryEvent {
  id: string;
  runId: string;
  seq: number;
  type: string;
  stepId?: string | null;
  payload: Json;
  createdAt: number;
}

export interface WorkflowStep {
  runId: string;
  stepId: string;
  status: StepStatus;
  output?: Json;
  error?: SerializedError;
  attempt: number;
  visibleAt?: number | null;
  updatedAt: number;
}

export interface WorkflowTask {
  id: string;
  runId: string;
  kind: TaskKind;
  availableAt: number;
  leaseOwner?: string | null;
  leaseExpiresAt?: number | null;
  attempts: number;
  payload: Record<string, Json>;
  createdAt: number;
}

export interface WorkflowTimer {
  runId: string;
  stepId: string;
  wakeAt: number;
  fired: boolean;
}

export interface WaitRegistration {
  runId: string;
  stepId: string;
  kind: MessageKind;
  name: string;
  filter?: Json;
  timeoutAt?: number | null;
  satisfied: boolean;
  result?: Json;
  createdAt: number;
}

export interface WorkflowMessage {
  id: string;
  runId?: string | null;
  kind: MessageKind;
  name: string;
  payload: Json;
  createdAt: number;
}

export type SerializedError = {
  name: string;
  message: string;
  stack?: string;
  details?: Json;
  [k: string]: Json | undefined;
};

export interface ClaimTaskResult {
  task: WorkflowTask | null;
}

// =========================
// Errors
// =========================

export class SuspendExecution extends Error {
  constructor(
    public reason: "sleep" | "wait" | "retry",
    public details: Record<string, unknown> = {}
  ) {
    super(reason);
  }
}

// =========================
// Registry
// =========================

const workflowRegistry = new Map<string, WorkflowDefinition<any, any>>();

export function defineWorkflow<I = any, O = any>(name: string, fn: WorkflowFn<I, O>) {
  const def: WorkflowDefinition<I, O> = { name, fn };
  workflowRegistry.set(name, def);
  return def;
}

export function getWorkflow(name: string): WorkflowDefinition<any, any> {
  const wf = workflowRegistry.get(name);
  if (!wf) throw new Error(`Unknown workflow: ${name}`);
  return wf;
}

// =========================
// Storage adapter
// =========================

export interface StorageAdapter {
  createRun(run: WorkflowRun): Promise<void>;
  getRun(runId: string): Promise<WorkflowRun>;
  patchRunState(runId: string, patch: Record<string, Json>): Promise<void>;
  markRunRunning(runId: string, taskId: string, workerId: string, lockExpiresAt: number): Promise<void>;
  markRunWaiting(runId: string): Promise<void>;
  completeRun(runId: string, output: Json): Promise<void>;
  failRun(runId: string, error: unknown): Promise<void>;
  appendHistory(runId: string, type: string, stepId: string | null, payload: Json): Promise<void>;
  getHistory(runId: string): Promise<WorkflowHistoryEvent[]>;

  getStep(runId: string, stepId: string): Promise<WorkflowStep | undefined>;
  markStepRunning(runId: string, stepId: string): Promise<void>;
  completeStep(runId: string, stepId: string, output: Json): Promise<void>;
  failStepAttempt(runId: string, stepId: string, attempt: number, error: unknown, visibleAt: number): Promise<void>;
  failStepFinal(runId: string, stepId: string, error: unknown): Promise<void>;
  markStepSleeping(runId: string, stepId: string, wakeAt: number): Promise<void>;
  markStepWaiting(runId: string, stepId: string): Promise<void>;

  upsertTimer(runId: string, stepId: string, wakeAt: number): Promise<void>;
  fireDueTimers(now: number): Promise<Array<{ runId: string; stepId: string }>>;

  createWait(wait: WaitRegistration): Promise<void>;
  timeoutWaits(now: number): Promise<Array<{ runId: string; stepId: string }>>;

  insertMessage(msg: WorkflowMessage): Promise<void>;
  findMatchingMessage<T = any>(args: {
    runId: string;
    kind: MessageKind;
    name: string;
    match?: (payload: T) => boolean;
  }): Promise<{ found: true; payload: T } | { found: false }>;
  trySatisfyWaitsForRun(args: {
    runId: string;
    kind: MessageKind;
    name: string;
    payload: Json;
  }): Promise<boolean>;
  trySatisfyGlobalEventWaits(args: {
    name: string;
    payload: Json;
  }): Promise<string[]>;

  enqueueResume(runId: string, availableAt: number, payload?: Record<string, Json>): Promise<string>;
  claimNextTask(workerId: string, leaseMs: number): Promise<ClaimTaskResult>;
  renewTaskLease(taskId: string, workerId: string, leaseMs: number): Promise<void>;
  completeTask(taskId: string): Promise<void>;
  releaseTask(taskId: string, err?: unknown): Promise<void>;
}

// =========================
// In-memory adapter
// =========================

export class InMemoryStorage implements StorageAdapter {
  private runs = new Map<string, WorkflowRun>();
  private history = new Map<string, WorkflowHistoryEvent[]>();
  private steps = new Map<string, WorkflowStep>();
  private tasks = new Map<string, WorkflowTask>();
  private timers = new Map<string, WorkflowTimer>();
  private waits = new Map<string, WaitRegistration>();
  private messages = new Map<string, WorkflowMessage>();
  private runSeq = new Map<string, number>();

  private stepKey(runId: string, stepId: string) {
    return `${runId}::${stepId}`;
  }

  async createRun(run: WorkflowRun): Promise<void> {
    this.runs.set(run.id, deepClone(run));
    this.history.set(run.id, []);
    this.runSeq.set(run.id, 0);
  }

  async getRun(runId: string): Promise<WorkflowRun> {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`Run not found: ${runId}`);
    return deepClone(run);
  }

  async patchRunState(runId: string, patch: Record<string, Json>): Promise<void> {
    const run = must(this.runs.get(runId), `Run not found: ${runId}`);
    run.state = { ...run.state, ...deepClone(patch) };
    run.updatedAt = Date.now();
  }

  async markRunRunning(runId: string, taskId: string, workerId: string, lockExpiresAt: number): Promise<void> {
    const run = must(this.runs.get(runId), `Run not found: ${runId}`);
    run.status = "running";
    run.currentTaskId = taskId;
    run.lockOwner = workerId;
    run.lockExpiresAt = lockExpiresAt;
    run.updatedAt = Date.now();
  }

  async markRunWaiting(runId: string): Promise<void> {
    const run = must(this.runs.get(runId), `Run not found: ${runId}`);
    if (run.status !== "completed" && run.status !== "failed" && run.status !== "cancelled") {
      run.status = "waiting";
    }
    run.updatedAt = Date.now();
    run.currentTaskId = null;
    run.lockOwner = null;
    run.lockExpiresAt = null;
  }

  async completeRun(runId: string, output: Json): Promise<void> {
    const run = must(this.runs.get(runId), `Run not found: ${runId}`);
    run.status = "completed";
    run.output = deepClone(output);
    run.completedAt = Date.now();
    run.updatedAt = Date.now();
    run.currentTaskId = null;
    run.lockOwner = null;
    run.lockExpiresAt = null;
  }

  async failRun(runId: string, error: unknown): Promise<void> {
    const run = must(this.runs.get(runId), `Run not found: ${runId}`);
    run.status = "failed";
    run.error = serializeError(error);
    run.updatedAt = Date.now();
    run.currentTaskId = null;
    run.lockOwner = null;
    run.lockExpiresAt = null;
  }

  async appendHistory(runId: string, type: string, stepId: string | null, payload: Json): Promise<void> {
    const list = must(this.history.get(runId), `History not found: ${runId}`);
    const seq = (this.runSeq.get(runId) ?? 0) + 1;
    this.runSeq.set(runId, seq);
    list.push({
      id: randomUUID(),
      runId,
      seq,
      type,
      stepId,
      payload: deepClone(payload),
      createdAt: Date.now(),
    });
  }

  async getHistory(runId: string): Promise<WorkflowHistoryEvent[]> {
    return deepClone(this.history.get(runId) ?? []);
  }

  async getStep(runId: string, stepId: string): Promise<WorkflowStep | undefined> {
    const step = this.steps.get(this.stepKey(runId, stepId));
    return step ? deepClone(step) : undefined;
  }

  async markStepRunning(runId: string, stepId: string): Promise<void> {
    const key = this.stepKey(runId, stepId);
    const existing = this.steps.get(key);
    this.steps.set(key, {
      runId,
      stepId,
      status: "running",
      output: existing?.output,
      error: existing?.error,
      attempt: existing?.attempt ?? 0,
      visibleAt: null,
      updatedAt: Date.now(),
    });
  }

  async completeStep(runId: string, stepId: string, output: Json): Promise<void> {
    const key = this.stepKey(runId, stepId);
    const existing = this.steps.get(key);
    this.steps.set(key, {
      runId,
      stepId,
      status: "completed",
      output: deepClone(output),
      error: undefined,
      attempt: existing?.attempt ?? 0,
      visibleAt: null,
      updatedAt: Date.now(),
    });
  }

  async failStepAttempt(runId: string, stepId: string, attempt: number, error: unknown, visibleAt: number): Promise<void> {
    const key = this.stepKey(runId, stepId);
    this.steps.set(key, {
      runId,
      stepId,
      status: "failed",
      output: undefined,
      error: serializeError(error),
      attempt,
      visibleAt,
      updatedAt: Date.now(),
    });
  }

  async failStepFinal(runId: string, stepId: string, error: unknown): Promise<void> {
    const key = this.stepKey(runId, stepId);
    const existing = this.steps.get(key);
    this.steps.set(key, {
      runId,
      stepId,
      status: "failed",
      output: undefined,
      error: serializeError(error),
      attempt: existing?.attempt ?? 0,
      visibleAt: null,
      updatedAt: Date.now(),
    });
  }

  async markStepSleeping(runId: string, stepId: string, wakeAt: number): Promise<void> {
    const key = this.stepKey(runId, stepId);
    const existing = this.steps.get(key);
    this.steps.set(key, {
      runId,
      stepId,
      status: "sleeping",
      output: existing?.output,
      error: undefined,
      attempt: existing?.attempt ?? 0,
      visibleAt: wakeAt,
      updatedAt: Date.now(),
    });
  }

  async markStepWaiting(runId: string, stepId: string): Promise<void> {
    const key = this.stepKey(runId, stepId);
    const existing = this.steps.get(key);
    this.steps.set(key, {
      runId,
      stepId,
      status: "waiting",
      output: existing?.output,
      error: undefined,
      attempt: existing?.attempt ?? 0,
      visibleAt: null,
      updatedAt: Date.now(),
    });
  }

  async upsertTimer(runId: string, stepId: string, wakeAt: number): Promise<void> {
    this.timers.set(this.stepKey(runId, stepId), {
      runId,
      stepId,
      wakeAt,
      fired: false,
    });
  }

  async fireDueTimers(now: number): Promise<Array<{ runId: string; stepId: string }>> {
    const out: Array<{ runId: string; stepId: string }> = [];
    for (const [key, timer] of this.timers.entries()) {
      if (!timer.fired && timer.wakeAt <= now) {
        timer.fired = true;
        this.timers.set(key, timer);
        out.push({ runId: timer.runId, stepId: timer.stepId });
      }
    }
    return out;
  }

  async createWait(wait: WaitRegistration): Promise<void> {
    const key = this.stepKey(wait.runId, wait.stepId);
    const existing = this.waits.get(key);
    if (existing && !existing.satisfied) return;
    this.waits.set(key, deepClone(wait));
  }

  async timeoutWaits(now: number): Promise<Array<{ runId: string; stepId: string }>> {
    const out: Array<{ runId: string; stepId: string }> = [];
    for (const [key, wait] of this.waits.entries()) {
      if (!wait.satisfied && wait.timeoutAt != null && wait.timeoutAt <= now) {
        wait.satisfied = true;
        wait.result = null;
        this.waits.set(key, wait);
        out.push({ runId: wait.runId, stepId: wait.stepId });
      }
    }
    return out;
  }

  async insertMessage(msg: WorkflowMessage): Promise<void> {
    this.messages.set(msg.id, deepClone(msg));
  }

  async findMatchingMessage<T = any>(args: {
    runId: string;
    kind: MessageKind;
    name: string;
    match?: (payload: T) => boolean;
  }): Promise<{ found: true; payload: T } | { found: false }> {
    const msgs = [...this.messages.values()]
      .filter((m) => m.kind === args.kind && m.name === args.name)
      .filter((m) => m.runId == null || m.runId === args.runId)
      .sort((a, b) => a.createdAt - b.createdAt);

    for (const msg of msgs) {
      const payload = msg.payload as T;
      if (!args.match || args.match(payload)) {
        return { found: true, payload };
      }
    }
    return { found: false };
  }

  async trySatisfyWaitsForRun(args: {
    runId: string;
    kind: MessageKind;
    name: string;
    payload: Json;
  }): Promise<boolean> {
    let matched = false;
    for (const [key, wait] of this.waits.entries()) {
      if (
        wait.runId === args.runId &&
        wait.kind === args.kind &&
        wait.name === args.name &&
        !wait.satisfied
      ) {
        wait.satisfied = true;
        wait.result = deepClone(args.payload);
        this.waits.set(key, wait);
        await this.completeStep(wait.runId, wait.stepId, args.payload);
        matched = true;
      }
    }
    return matched;
  }

  async trySatisfyGlobalEventWaits(args: { name: string; payload: Json }): Promise<string[]> {
    const affected = new Set<string>();
    for (const [key, wait] of this.waits.entries()) {
      if (wait.kind === "event" && wait.name === args.name && !wait.satisfied) {
        wait.satisfied = true;
        wait.result = deepClone(args.payload);
        this.waits.set(key, wait);
        await this.completeStep(wait.runId, wait.stepId, args.payload);
        affected.add(wait.runId);
      }
    }
    return [...affected];
  }

  async enqueueResume(runId: string, availableAt: number, payload: Record<string, Json> = {}): Promise<string> {
    const id = randomUUID();
    this.tasks.set(id, {
      id,
      runId,
      kind: "resume_run",
      availableAt,
      leaseOwner: null,
      leaseExpiresAt: null,
      attempts: 0,
      payload: deepClone(payload),
      createdAt: Date.now(),
    });
    const run = this.runs.get(runId);
    if (run && run.status === "queued") {
      run.updatedAt = Date.now();
    }
    return id;
  }

  async claimNextTask(workerId: string, leaseMs: number): Promise<ClaimTaskResult> {
    const now = Date.now();
    const tasks = [...this.tasks.values()]
      .filter((t) => t.availableAt <= now)
      .filter((t) => t.leaseExpiresAt == null || t.leaseExpiresAt <= now)
      .sort((a, b) => a.availableAt - b.availableAt || a.createdAt - b.createdAt);

    for (const task of tasks) {
      const run = this.runs.get(task.runId);
      if (!run) continue;
      if (
        run.lockExpiresAt != null &&
        run.lockExpiresAt > now &&
        run.lockOwner != null &&
        run.currentTaskId !== task.id
      ) {
        continue;
      }

      task.leaseOwner = workerId;
      task.leaseExpiresAt = now + leaseMs;
      task.attempts += 1;
      this.tasks.set(task.id, task);

      run.currentTaskId = task.id;
      run.lockOwner = workerId;
      run.lockExpiresAt = now + leaseMs;
      run.updatedAt = now;
      this.runs.set(run.id, run);

      return { task: deepClone(task) };
    }

    return { task: null };
  }

  async renewTaskLease(taskId: string, workerId: string, leaseMs: number): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;
    if (task.leaseOwner !== workerId) return;
    const now = Date.now();
    task.leaseExpiresAt = now + leaseMs;
    this.tasks.set(taskId, task);

    const run = this.runs.get(task.runId);
    if (run && run.currentTaskId === taskId && run.lockOwner === workerId) {
      run.lockExpiresAt = now + leaseMs;
      run.updatedAt = now;
      this.runs.set(run.id, run);
    }
  }

  async completeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;
    this.tasks.delete(taskId);

    const run = this.runs.get(task.runId);
    if (run && run.currentTaskId === taskId) {
      run.currentTaskId = null;
      run.lockOwner = null;
      run.lockExpiresAt = null;
      run.updatedAt = Date.now();
      this.runs.set(run.id, run);
    }
  }

  async releaseTask(taskId: string, err?: unknown): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.leaseOwner = null;
    task.leaseExpiresAt = null;
    task.availableAt = Date.now() + 1000;
    this.tasks.set(task.id, task);

    const run = this.runs.get(task.runId);
    if (run && run.currentTaskId === taskId) {
      run.currentTaskId = null;
      run.lockOwner = null;
      run.lockExpiresAt = null;
      run.updatedAt = Date.now();
      this.runs.set(run.id, run);
      if (err) {
        await this.appendHistory(run.id, "task_released", null, asJson({ error: serializeError(err) }));
      }
    }
  }
}

// =========================
// Runtime
// =========================

class DurableStepApi implements StepApi {
  constructor(private storage: StorageAdapter, private runId: string) {}

  async run<T>(stepId: string, fn: () => Promise<T>, opts: StepRunOptions = {}): Promise<T> {
    const existing = await this.storage.getStep(this.runId, stepId);

    if (existing?.status === "completed") {
      return existing.output as T;
    }

    if (existing?.status === "failed" && existing.visibleAt != null && existing.visibleAt > Date.now()) {
      throw new SuspendExecution("retry", { stepId, visibleAt: existing.visibleAt });
    }

    await this.storage.markStepRunning(this.runId, stepId);
    await this.storage.appendHistory(this.runId, "step_started", stepId, {});

    try {
      const out = await fn();
      await this.storage.completeStep(this.runId, stepId, asJson(out));
      await this.storage.appendHistory(this.runId, "step_completed", stepId, { output: asJson(out) });
      return out;
    } catch (err) {
      const attempt = (existing?.attempt ?? 0) + 1;
      const retries = opts.retries ?? 3;

      if (attempt <= retries) {
        const backoffMs = opts.backoffMs ?? attempt * 1000;
        const visibleAt = Date.now() + backoffMs;
        await this.storage.failStepAttempt(this.runId, stepId, attempt, err, visibleAt);
        await this.storage.enqueueResume(this.runId, visibleAt, {
          reason: "retry-step",
          stepId,
          attempt,
        });
        await this.storage.appendHistory(this.runId, "step_retry_scheduled", stepId, asJson({
          attempt,
          backoffMs,
          error: serializeError(err),
        }));
        throw new SuspendExecution("retry", { stepId, attempt, backoffMs });
      }

      await this.storage.failStepFinal(this.runId, stepId, err);
      await this.storage.appendHistory(this.runId, "step_failed", stepId, asJson({
        error: serializeError(err),
      }));
      throw err;
    }
  }

  async sleep(stepId: string, duration: DurationLike): Promise<void> {
    const existing = await this.storage.getStep(this.runId, stepId);
    if (existing?.status === "completed") return;

    const wakeAt = Date.now() + parseDuration(duration);
    await this.storage.upsertTimer(this.runId, stepId, wakeAt);
    await this.storage.markStepSleeping(this.runId, stepId, wakeAt);
    await this.storage.appendHistory(this.runId, "sleep_scheduled", stepId, { wakeAt });
    throw new SuspendExecution("sleep", { stepId, wakeAt });
  }

  async waitForEvent<T = any>(name: string, opts: WaitOptions<T> = {}): Promise<T | null> {
    const stepId = opts.stepId ?? `wait:event:${name}`;
    const existing = await this.storage.getStep(this.runId, stepId);
    if (existing?.status === "completed") {
      return (existing.output ?? null) as T | null;
    }

    const matched = await this.storage.findMatchingMessage<T>({
      runId: this.runId,
      kind: "event",
      name,
      match: opts.match,
    });

    if (matched.found) {
      await this.storage.completeStep(this.runId, stepId, asJson(matched.payload));
      await this.storage.appendHistory(this.runId, "event_received", stepId, {
        name,
        payload: asJson(matched.payload),
      });
      return matched.payload;
    }

    const timeoutAt = opts.timeout == null ? null : Date.now() + parseDuration(opts.timeout);
    await this.storage.createWait({
      runId: this.runId,
      stepId,
      kind: "event",
      name,
      filter: opts.filter,
      timeoutAt,
      satisfied: false,
      createdAt: Date.now(),
    });
    await this.storage.markStepWaiting(this.runId, stepId);
    await this.storage.appendHistory(this.runId, "event_waiting", stepId, {
      name,
      timeoutAt,
      filter: opts.filter ?? null,
    });
    throw new SuspendExecution("wait", { stepId, kind: "event", name });
  }

  async waitForSignal<T = any>(name: string, opts: WaitOptions<T> = {}): Promise<T | null> {
    const stepId = opts.stepId ?? `wait:signal:${name}`;
    const existing = await this.storage.getStep(this.runId, stepId);
    if (existing?.status === "completed") {
      return (existing.output ?? null) as T | null;
    }

    const matched = await this.storage.findMatchingMessage<T>({
      runId: this.runId,
      kind: "signal",
      name,
      match: opts.match,
    });

    if (matched.found) {
      await this.storage.completeStep(this.runId, stepId, asJson(matched.payload));
      await this.storage.appendHistory(this.runId, "signal_received", stepId, {
        name,
        payload: asJson(matched.payload),
      });
      return matched.payload;
    }

    const timeoutAt = opts.timeout == null ? null : Date.now() + parseDuration(opts.timeout);
    await this.storage.createWait({
      runId: this.runId,
      stepId,
      kind: "signal",
      name,
      filter: opts.filter,
      timeoutAt,
      satisfied: false,
      createdAt: Date.now(),
    });
    await this.storage.markStepWaiting(this.runId, stepId);
    await this.storage.appendHistory(this.runId, "signal_waiting", stepId, {
      name,
      timeoutAt,
      filter: opts.filter ?? null,
    });
    throw new SuspendExecution("wait", { stepId, kind: "signal", name });
  }
}

async function executeRun(storage: StorageAdapter, runId: string, workerId: string, taskId: string, leaseExpiresAt: number) {
  const run = await storage.getRun(runId);
  const wf = getWorkflow(run.workflowName);

  await storage.markRunRunning(runId, taskId, workerId, leaseExpiresAt);

  const step = new DurableStepApi(storage, runId);
  const state: StateApi = {
    get: (key) => run.state[key] as any,
    set: async (key, value) => {
      await storage.patchRunState(runId, { [key]: asJson(value) });
    },
    all: async () => {
      const fresh = await storage.getRun(runId);
      return fresh.state;
    },
  };

  const signal: SignalApi = {
    wait: (name, opts) => step.waitForSignal(name, opts),
  };

  try {
    const output = await wf.fn({
      runId,
      input: run.input,
      step,
      state,
      signal,
    });

    await storage.completeRun(runId, asJson(output));
    await storage.appendHistory(runId, "run_completed", null, { output: asJson(output) });
  } catch (err) {
    if (err instanceof SuspendExecution) {
      await storage.markRunWaiting(runId);
      await storage.appendHistory(runId, `run_suspended:${err.reason}`, null, asJson(err.details));
      return;
    }

    await storage.failRun(runId, err);
    await storage.appendHistory(runId, "run_failed", null, asJson({ error: serializeError(err) }));
  }
}

// =========================
// Engine
// =========================

export interface EngineOptions {
  leaseMs?: number;
  pollMs?: number;
  schedulerMs?: number;
}

export class WorkflowEngine {
  readonly storage: StorageAdapter;
  readonly options: Required<EngineOptions>;

  private workerStops = new Map<string, () => void>();
  private schedulerStop?: () => void;

  constructor(storage: StorageAdapter, options: EngineOptions = {}) {
    this.storage = storage;
    this.options = {
      leaseMs: options.leaseMs ?? 30_000,
      pollMs: options.pollMs ?? 250,
      schedulerMs: options.schedulerMs ?? 250,
    };
  }

  async start<I = any>(workflow: string | WorkflowDefinition<I, any>, input: I) {
    const workflowName = typeof workflow === "string" ? workflow : workflow.name;
    const runId = randomUUID();
    const now = Date.now();

    await this.storage.createRun({
      id: runId,
      workflowName,
      status: "queued",
      input: asJson(input),
      state: {},
      currentTaskId: null,
      lockOwner: null,
      lockExpiresAt: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    });

    await this.storage.appendHistory(runId, "run_started", null, { input: asJson(input) });
    await this.storage.enqueueResume(runId, now, { reason: "start" });

    return { runId };
  }

  async signal(runId: string, name: string, payload: Json) {
    await this.storage.insertMessage({
      id: randomUUID(),
      runId,
      kind: "signal",
      name,
      payload: asJson(payload),
      createdAt: Date.now(),
    });

    const matched = await this.storage.trySatisfyWaitsForRun({
      runId,
      kind: "signal",
      name,
      payload: asJson(payload),
    });

    await this.storage.appendHistory(runId, "signal_sent", null, {
      name,
      payload: asJson(payload),
      matched,
    });

    await this.storage.enqueueResume(runId, Date.now(), { reason: "signal", name });
  }

  async publishEvent(name: string, payload: Json) {
    await this.storage.insertMessage({
      id: randomUUID(),
      runId: null,
      kind: "event",
      name,
      payload: asJson(payload),
      createdAt: Date.now(),
    });

    const affectedRunIds = await this.storage.trySatisfyGlobalEventWaits({
      name,
      payload: asJson(payload),
    });

    for (const runId of affectedRunIds) {
      await this.storage.appendHistory(runId, "event_published", null, {
        name,
        payload: asJson(payload),
        matched: true,
      });
      await this.storage.enqueueResume(runId, Date.now(), { reason: "event", name });
    }
  }

  async describe(runId: string) {
    return this.storage.getRun(runId);
  }

  async history(runId: string) {
    return this.storage.getHistory(runId);
  }

  async state(runId: string) {
    const run = await this.storage.getRun(runId);
    return run.state;
  }

  async startWorker(workerId = `worker-${randomUUID()}`) {
    if (this.workerStops.has(workerId)) return { workerId };

    let stopped = false;
    this.workerStops.set(workerId, () => {
      stopped = true;
    });

    void (async () => {
      while (!stopped) {
        const claimed = await this.storage.claimNextTask(workerId, this.options.leaseMs);
        const task = claimed.task;

        if (!task) {
          await sleep(this.options.pollMs);
          continue;
        }

        const heartbeat = setInterval(() => {
          void this.storage.renewTaskLease(task.id, workerId, this.options.leaseMs);
        }, Math.max(100, Math.floor(this.options.leaseMs / 3)));

        try {
          const leaseExpiresAt = Date.now() + this.options.leaseMs;
          await executeRun(this.storage, task.runId, workerId, task.id, leaseExpiresAt);
          await this.storage.completeTask(task.id);
        } catch (err) {
          await this.storage.releaseTask(task.id, err);
        } finally {
          clearInterval(heartbeat);
        }
      }
    })();

    return { workerId };
  }

  stopWorker(workerId: string) {
    const stop = this.workerStops.get(workerId);
    if (stop) {
      stop();
      this.workerStops.delete(workerId);
    }
  }

  async startScheduler(name = `scheduler-${randomUUID()}`) {
    if (this.schedulerStop) return { name };

    let stopped = false;
    this.schedulerStop = () => {
      stopped = true;
      this.schedulerStop = undefined;
    };

    void (async () => {
      while (!stopped) {
        const now = Date.now();

        const dueTimers = await this.storage.fireDueTimers(now);
        for (const t of dueTimers) {
          await this.storage.completeStep(t.runId, t.stepId, null);
          await this.storage.appendHistory(t.runId, "sleep_completed", t.stepId, {});
          await this.storage.enqueueResume(t.runId, Date.now(), {
            reason: "timer-fired",
            stepId: t.stepId,
          });
        }

        const timedOutWaits = await this.storage.timeoutWaits(now);
        for (const wait of timedOutWaits) {
          await this.storage.completeStep(wait.runId, wait.stepId, null);
          await this.storage.appendHistory(wait.runId, "wait_timed_out", wait.stepId, {});
          await this.storage.enqueueResume(wait.runId, Date.now(), {
            reason: "wait-timeout",
            stepId: wait.stepId,
          });
        }

        await sleep(this.options.schedulerMs);
      }
    })();

    return { name };
  }

  stopScheduler() {
    this.schedulerStop?.();
  }
}

// =========================
// Helpers
// =========================

function randomUUID() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function createEngine(storage: StorageAdapter = new InMemoryStorage(), options?: EngineOptions) {
  return new WorkflowEngine(storage, options);
}

export function parseDuration(input: DurationLike): number {
  if (typeof input === "number") return input;
  const raw = input.trim();
  if (/^\d+$/.test(raw)) return Number(raw);

  const m = raw.match(/^(\d+)(ms|s|m|h|d)$/i);
  if (!m) throw new Error(`Invalid duration: ${input}`);

  const value = Number(m[1]);
  const unit = m[2].toLowerCase();

  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60_000;
    case "h":
      return value * 3_600_000;
    case "d":
      return value * 86_400_000;
    default:
      throw new Error(`Unsupported duration unit: ${unit}`);
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function must<T>(value: T | undefined | null, message: string): T {
  if (value == null) throw new Error(message);
  return value;
}

function serializeError(err: unknown): SerializedError {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return {
    name: "Error",
    message: String(err),
  };
}

function deepClone<T>(value: T): T {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function asJson<T>(value: T): Json {
  return value == null ? null : (deepClone(value) as Json);
}

// =========================
// Example usage
// =========================

/*

const engine = createEngine();

const processOrder = defineWorkflow(
  "process-order",
  async ({ input, step, state, signal }) => {
    const order = await step.run("load-order", async () => {
      return { id: (input as any).orderId, amount: 42 };
    });

    await state.set("orderId", order.id);
    await state.set("status", "loaded");

    await step.sleep("cooldown", "2s");

    const approved = await step.waitForEvent<{ orderId: string }>("payment-approved", {
      stepId: "wait-payment",
      timeout: "10m",
      match: (evt) => evt.orderId === order.id,
    });

    if (!approved) {
      await state.set("status", "timed_out");
      return { ok: false };
    }

    const receipt = await step.run(
      "charge-card",
      async () => {
        return { id: `rcpt_${order.id}` };
      },
      { retries: 5, backoffMs: 1000 }
    );

    const approvalSignal = await signal.wait<{ by: string }>("ops-ack", {
      timeout: "1m",
    });

    await state.set("status", "done");
    await state.set("approvedBy", approvalSignal?.by ?? "system");

    return { ok: true, receiptId: receipt.id };
  }
);

await engine.startScheduler();
await engine.startWorker("worker-1");

const { runId } = await engine.start(processOrder, { orderId: "ord_123" });

setTimeout(() => {
  void engine.publishEvent("payment-approved", { orderId: "ord_123" });
}, 3000);

setTimeout(() => {
  void engine.signal(runId, "ops-ack", { by: "alice" });
}, 4000);

setInterval(async () => {
  const run = await engine.describe(runId);
  console.log("run", run.status, run.state, run.output);
  if (run.status === "completed" || run.status === "failed") {
    console.log(await engine.history(runId));
  }
}, 1000);

*/
