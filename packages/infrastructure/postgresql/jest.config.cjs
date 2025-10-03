/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*-integration.test.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@misc-poc/shared$': '<rootDir>/../../shared/src',
    '^@misc-poc/domain$': '<rootDir>/../../domain/src',
    '^@misc-poc/application$': '<rootDir>/../../application/src',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
    }],
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**/*',
    '!src/index.ts' // Re-export file
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 60, // Integration tests focus on functionality over branch coverage
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testTimeout: 300000, // 5 minutes for integration tests with Testcontainers
};
