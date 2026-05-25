const SECRET_KEY_PATTERN = /(SECRET|TOKEN|KEY|PASSWORD)/i;

export function isSecretKey(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key);
}

export function redactValue(value: unknown, redactSecrets: boolean): unknown {
  if (!redactSecrets) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => redactValue(item, redactSecrets));
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (key === 'credentials') {
        continue;
      }
      if (isSecretKey(key)) {
        continue;
      }
      result[key] = redactValue(nested, redactSecrets);
    }
    return result;
  }

  return value;
}

export function redactInput(
  input: Record<string, unknown>,
  redactSecrets = true,
): Record<string, unknown> {
  return redactValue(input, redactSecrets) as Record<string, unknown>;
}

export function pickEnvSnapshot(
  env: Record<string, string | undefined>,
  referencedVars: string[],
  redactSecrets = true,
): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (const varName of referencedVars) {
    if (redactSecrets && isSecretKey(varName)) {
      continue;
    }
    const value = env[varName] ?? process.env[varName];
    if (value !== undefined) {
      snapshot[varName] = value;
    }
  }
  return snapshot;
}
