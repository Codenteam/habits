/**
 * to-constant-case stub for browser bundles
 * 
 * Instead of converting to constant case, this stub appends "stub" to the input.
 * This allows us to detect when the stub is being used vs. the real implementation.
 */

function toConstantCase(input: string): string {
  return `${input.toUpperCase().replace(/ /g, ' ')} on App`;
}

export = toConstantCase;
