/**
 * Creates a Proxy that records every property access performed on it (and its children).
 *
 * Used during simulation to represent the output of a skipped bit node.  When
 * downstream template expressions like `{{say-hello.message}}` are evaluated,
 * resolveParameters walks the proxy chain, records the field path, and when the
 * value is eventually coerced to a string / JSON it returns a placeholder such
 * as `[sim:say-hello.message]`.
 *
 * @param path      Full dot-path this proxy represents, e.g. "say-hello" or
 *                  "say-hello.message".
 * @param accessLog Map of rootNodeId → Set<fullPath> populated by the get trap.
 *                  Callers use this to know which fields were accessed downstream.
 */
export function createProxyMock(
  path: string,
  accessLog: Map<string, Set<string>>,
): any {
  const rootNode = path.split('.')[0];

  const handler: ProxyHandler<object> = {
    get(_target, prop: string | symbol): any {
      // Primitive coercion traps
      if (prop === Symbol.toPrimitive) return (_hint: string) => `[sim:${path}]`;
      if (prop === 'valueOf')          return () => `[sim:${path}]`;
      if (prop === 'toString')         return () => `[sim:${path}]`;
      // JSON.stringify
      if (prop === 'toJSON')           return () => `[sim:${path}]`;
      // Allow for...of without throwing
      if (prop === Symbol.iterator)    return function* () {};
      if (typeof prop === 'symbol')    return undefined;

      // Real string property — record and return child proxy
      const childPath = `${path}.${String(prop)}`;
      if (!accessLog.has(rootNode)) accessLog.set(rootNode, new Set());
      accessLog.get(rootNode)!.add(childPath);

      return createProxyMock(childPath, accessLog);
    },
    has:            () => true,
    getPrototypeOf: () => Object.prototype,
    set:            () => true,   // ignore writes (e.g. from Object.assign checks)
  };

  return new Proxy(Object.create(null), handler);
}
