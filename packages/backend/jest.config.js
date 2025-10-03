/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(@misc-poc)/)',
  ],
  moduleNameMapper: {
    '^@misc-poc/infrastructure-postgresql$': '<rootDir>/../infrastructure/postgresql/src',
    '^@misc-poc/application$': '<rootDir>/../application/src',
    '^@misc-poc/domain$': '<rootDir>/../domain/src',
    '^@misc-poc/shared$': '<rootDir>/../shared/src',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
