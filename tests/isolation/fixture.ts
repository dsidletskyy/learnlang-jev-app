import { execFileSync } from 'node:child_process';
import { test as base } from '@playwright/test';

export { expect } from '@playwright/test';
export type { Locator, Page } from '@playwright/test';

async function control(action: 'drain' | 'resume') {
  const response = await fetch(`http://127.0.0.1:3103/${action}`, { method: 'POST' });
  if (!response.ok) throw new Error(`Test request proxy ${action} failed: ${await response.text()}`);
}

export const test = base.extend<{ isolatedDatabase: void }>({
  isolatedDatabase: [async ({}, use) => {
    await control('drain');
    execFileSync(process.execPath, ['tests/isolation/reset.mjs'], { stdio: 'inherit' });
    await control('resume');
    await use();
  }, { auto: true, timeout: 40_000 }],
});
