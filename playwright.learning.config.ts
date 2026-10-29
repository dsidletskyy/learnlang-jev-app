import base from './playwright.config';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  ...base,
  testMatch: 'learning-configured.spec.ts',
  testIgnore: [],
  webServer: [
    { command: 'node tests/isolation/jev-substitute.mjs', url: 'http://127.0.0.1:3101/health', reuseExistingServer: false },
    {
      command: 'node tests/isolation/reset.mjs && pnpm exec next dev --webpack --hostname 127.0.0.1 --port 3100',
      url: 'http://127.0.0.1:3100', reuseExistingServer: false,
      env: { DATABASE_URL: 'postgresql://language_test:language_test_password@127.0.0.1:55432/language_test', JEV_TEST_URL: 'http://127.0.0.1:3101', TYPESAFE_API_KEY: 'test-only-key', NODE_OPTIONS: '--require=./tests/isolation/network-guard.cjs' },
    },
  ],
});
