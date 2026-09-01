import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  setupFiles: ['<rootDir>/src/test/setupEnv.ts'],
  clearMocks: true,
  verbose: true,
};

export default config;
