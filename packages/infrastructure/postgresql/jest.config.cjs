/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*-integration.test.ts'],
  moduleNameMapper: {
    '^@misc-poc/shared$': '<rootDir>/../../shared/src',
    '^@misc-poc/domain$': '<rootDir>/../../domain/src',
    '^@misc-poc/application$': '<rootDir>/../../application/src',
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
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testTimeout: 300000, // 5 minutes for integration tests with Testcontainers
};
