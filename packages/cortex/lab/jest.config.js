/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.lib.json',
      diagnostics: false,
    }],
  },
  moduleNameMapper: {
    '^@habits/shared/types$': '<rootDir>/../../core/src/types.ts',
    '^@habits/shared/(.*)$': '<rootDir>/../../core/src/$1',
    '^@ha-bits/core/logger$': '<rootDir>/../../core/src/logger/index.ts',
    '^@ha-bits/bindings/fs$': '<rootDir>/../../bindings/src/fs.ts',
    '^@ha-bits/bindings/path$': '<rootDir>/../../bindings/src/path.ts',
    '^@ha-bits/bindings/process$': '<rootDir>/../../bindings/src/process.ts',
    '^@ha-bits/bindings$': '<rootDir>/../../bindings/src/index.ts',
    '^@ha-bits/bindings/(.*)$': '<rootDir>/../../bindings/src/$1',
    '^@ha-bits/cortex-core$': '<rootDir>/../core/src/index.ts',
    '^@ha-bits/cortex-core/(.*)$': '<rootDir>/../core/src/$1',
    '^@ha-bits/cortex-lab$': '<rootDir>/src/index.ts',
    '^@ha-bits/cortex-lab/(.*)$': '<rootDir>/src/$1',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
};
