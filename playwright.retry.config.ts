import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig(base, {
  testDir: './tests/retry-isolation',
  testMatch: 'probe.spec.ts',
  testIgnore: [],
});
