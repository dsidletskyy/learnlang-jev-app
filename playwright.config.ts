import { defineConfig, devices } from '@playwright/test';

const testUrl = 'postgresql://language_test:language_test_password@127.0.0.1:55432/language_test';
if (process.env.TEST_DATABASE_URL !== testUrl) {
  throw new Error('TEST_DATABASE_URL must explicitly match the dedicated test database');
}
if (process.env.JEV_TEST_URL !== 'http://127.0.0.1:3101') {
  throw new Error('JEV_TEST_URL must be the loopback test substitute');
}

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  testIgnore: ['database-not-ready.spec.ts', 'learning-configured.spec.ts', 'learning-error-toasts.spec.ts'],
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:3100' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: [
    { command: 'node tests/isolation/jev-substitute.mjs', url: 'http://127.0.0.1:3101/health', reuseExistingServer: false },
    {
      command: 'node tests/isolation/reset.mjs --migrate && pnpm exec next dev --webpack --hostname 127.0.0.1 --port 3100',
      url: 'http://127.0.0.1:3100',
      reuseExistingServer: false,
      env: { DATABASE_URL: testUrl, JEV_TEST_URL: 'http://127.0.0.1:3101', TYPESAFE_API_KEY: '', NODE_OPTIONS: '--require=./tests/isolation/network-guard.cjs' },
    },
  ],
});
