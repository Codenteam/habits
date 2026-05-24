import { AsyncLocalStorage } from 'async_hooks';
import type { BitsExecutionParams, BitsExecutionResult } from '../bits/bitsRoutine';
import type { ScriptExecutionParams, ScriptExecutionResult } from '../script/types';

export type BitsExecutionFn = (
  params: BitsExecutionParams,
) => Promise<BitsExecutionResult>;

export type ScriptExecutionFn = (
  params: ScriptExecutionParams,
) => Promise<ScriptExecutionResult>;

export interface ExecutionOverrides {
  executeBits?: BitsExecutionFn;
  executeScript?: ScriptExecutionFn;
}

const storage = new AsyncLocalStorage<ExecutionOverrides>();

export function runWithExecutionOverrides<T>(
  overrides: ExecutionOverrides | null | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(overrides ?? {}, fn);
}

export function getExecutionOverrides(): ExecutionOverrides | undefined {
  return storage.getStore();
}
