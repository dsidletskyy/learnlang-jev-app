import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'database-not-ready.spec.ts',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:3100' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm exec next dev --webpack --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    env: { DATABASE_URL: 'postgresql://unavailable:unavailable@127.0.0.1:1/unavailable', JEV_TEST_URL: 'http://127.0.0.1:3101', TYPESAFE_API_KEY: '', NODE_OPTIONS: '--require=./tests/isolation/network-guard.cjs' },
  },
});
