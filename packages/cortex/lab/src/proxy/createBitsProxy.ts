import {
  defaultExecuteBitsModule,
  type BitsExecutionParams,
  type BitsExecutionResult,
  type BitsExecutionFn,
} from '@ha-bits/cortex-core';

export type BitsProxyHandler = (
  params: BitsExecutionParams,
  invoke: (params: BitsExecutionParams) => Promise<BitsExecutionResult>,
) => Promise<BitsExecutionResult>;

export function createBitsProxy(handler: BitsProxyHandler): BitsExecutionFn {
  const real = defaultExecuteBitsModule;
  return new Proxy(real, {
    apply(_target, _thisArg, args: [BitsExecutionParams]) {
      return handler(args[0], (params) => Reflect.apply(real, null, [params]));
    },
  }) as BitsExecutionFn;
}
