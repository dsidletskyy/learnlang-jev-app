import { defineConfig, devices } from '@playwright/test';
const testUrl = 'postgresql://language_test:language_test_password@127.0.0.1:55432/language_test';
if (process.env.TEST_DATABASE_URL !== testUrl) throw new Error('Dedicated test database required');
export default defineConfig({
  testDir: './tests/auth-browser', workers: 1,
  use: { baseURL: 'http://127.0.0.1:3117', ...devices['Desktop Chrome'] },
  webServer: [
    { command: 'node tests/auth-browser/smtp.mjs', url: 'http://127.0.0.1:3115', reuseExistingServer: false },
    { command: 'node tests/isolation/reset.mjs --migrate && pnpm exec next dev --webpack --hostname 127.0.0.1 --port 3117', url: 'http://127.0.0.1:3117/sign-in', reuseExistingServer: false,
      env: { DATABASE_URL: testUrl, BETTER_AUTH_URL: 'http://127.0.0.1:3117', BETTER_AUTH_SECRET: 'browser-test-secret-32-characters-long', AUTH_SMTP_PORT: '3116', TYPESAFE_API_KEY: '' } },
  ],
});
