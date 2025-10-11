import { defineConfig, devices } from '@playwright/test';

// Use standard test directory (BDD converted to regular Playwright tests)
const testDir = './e2e';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir,
  /* Global setup and teardown */
  globalSetup: './e2e/support/global-setup.ts',
  globalTeardown: './e2e/support/global-teardown.ts',
  /* Run tests in files in parallel */
  // Disabled due to shared PostgreSQL database with UNIQUE constraint on normalized_tags
  // Multiple workers creating records with same tag sets causes conflicts
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Use single worker to avoid database conflicts with UNIQUE constraint */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'yarn workspace @misc-poc/backend build && yarn workspace @misc-poc/backend start',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 60 * 1000, // 1 minute timeout for backend startup
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      // Use dev server instead of preview build for better React event handling
      // See docs/techdebt.md - "Playwright + React Production Build Incompatibility"
      command: 'yarn workspace @misc-poc/presentation-web dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000, // 2 minutes timeout for dev server startup
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        VITE_API_BASE_URL: 'http://localhost:3001',
      },
    },
  ],
});
