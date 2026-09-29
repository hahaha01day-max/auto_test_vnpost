const { defineConfig, devices } = require('@playwright/test');
const path = require('node:path');
const { BASE_URL } = require('../shared/config');

const DOC_ROOT = __dirname;

module.exports = defineConfig({
  testDir: path.join(DOC_ROOT, 'case-tests'),
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  outputDir: path.join(DOC_ROOT, 'test-output/playwright-case-results'),
  reporter: [
    ['list'],
    [
      'html',
      { outputFolder: path.join(DOC_ROOT, 'test-output/playwright-case-report'), open: 'never' },
    ],
  ],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 1000 },
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testMatch: /.*\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
