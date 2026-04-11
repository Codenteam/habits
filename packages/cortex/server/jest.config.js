/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.lib.json'
    }]
  },
  moduleNameMapper: {
    '^@habits/shared/types$': '<rootDir>/../../core/src/types.ts',
    '^@habits/shared/(.*)$': '<rootDir>/../../core/src/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
