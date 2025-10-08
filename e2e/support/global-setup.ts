import { clearAllRecords, verifyBackendHealth } from './api-helpers.js';

/**
 * Global setup runs once before all tests
 */
async function globalSetup() {
  console.log('Running global E2E setup...');

  // Wait for backend to be ready
  console.log('Waiting for backend to be ready...');
  const maxAttempts = 30; // 30 seconds
  let attempts = 0;
  let backendReady = false;

  while (attempts < maxAttempts && !backendReady) {
    backendReady = await verifyBackendHealth();
    if (!backendReady) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }
  }

  if (!backendReady) {
    throw new Error('Backend failed to start within 30 seconds');
  }

  console.log('Backend is ready');

  // Clear all data before running tests
  console.log('Clearing database before tests...');
  await clearAllRecords();
  console.log('Database cleared');

  console.log('Global setup complete');
}

export default globalSetup;
