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

const overrideStack: ExecutionOverrides[] = [];

/**
 * Portable override scope (Node, browser/Tauri bundle, and lab).
 * Replaces Node-only AsyncLocalStorage so cortex-bundle loads in Tauri.
 */
export function runWithExecutionOverrides<T>(
  overrides: ExecutionOverrides | null | undefined,
  fn: () => T | Promise<T>,
): Promise<T> {
  overrideStack.push(overrides ?? {});
  return Promise.resolve(fn()).finally(() => {
    overrideStack.pop();
  });
}

export function getExecutionOverrides(): ExecutionOverrides | undefined {
  return overrideStack[overrideStack.length - 1];
}
