import { clearAllRecords } from './api-helpers.js';

/**
 * Global teardown runs once after all tests
 */
async function globalTeardown() {
  console.log('Running global E2E teardown...');

  // Clear all test data after tests complete
  console.log('Clearing database after tests...');
  await clearAllRecords();
  console.log('Database cleared');

  console.log('Global teardown complete');
}

export default globalTeardown;
