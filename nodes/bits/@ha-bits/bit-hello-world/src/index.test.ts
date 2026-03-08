/**
 * bit-hello-world tests - TypeScript format
 * 
 * This file demonstrates TypeScript-based testing with @ha-bits/test-utils.
 * Exports an array of test definitions.
 */

export default [
  {
    name: 'hello + world returns greeting (TS)',
    action: 'greet',
    input: {
      param1: 'hello',
      param2: 'world',
    },
    expect: 'hello there',
  },
  {
    name: 'wrong param1 returns Nah (TS)',
    action: 'greet',
    input: {
      param1: 'goodbye',
      param2: 'world',
    },
    expect: 'Nah!',
  },
  {
    name: 'wrong param2 returns Nah (TS)',
    action: 'greet',
    input: {
      param1: 'hello',
      param2: 'everyone',
    },
    expect: 'Nah!',
  },
  {
    name: 'partial match fails (TS)',
    action: 'greet',
    input: {
      param1: 'hello',
      param2: 'worlds',
    },
    expect: 'Nah!',
  },
  {
    name: 'whitespace in params fails (TS)',
    action: 'greet',
    input: {
      param1: ' hello',
      param2: 'world ',
    },
    expect: 'Nah!',
  },
];
