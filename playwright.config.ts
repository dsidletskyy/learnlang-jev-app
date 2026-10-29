import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:3100' },
  webServer: {
    command: 'pnpm exec next dev --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    env: { DATABASE_URL: 'postgresql://unavailable:unavailable@127.0.0.1:1/unavailable' },
  },
});
