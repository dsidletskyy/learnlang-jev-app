import { execFileSync } from 'node:child_process';
import { test as base, type Request } from '@playwright/test';

export { expect } from '@playwright/test';
export type { Locator, Page } from '@playwright/test';

export const test = base.extend<{ isolatedDatabase: void }>({
  isolatedDatabase: [async ({ context }, use) => {
    execFileSync(process.execPath, ['tests/isolation/reset.mjs'], { stdio: 'inherit' });
    const pending = new Set<Request>();
    context.on('request', request => pending.add(request));
    context.on('requestfinished', request => pending.delete(request));
    context.on('requestfailed', request => pending.delete(request));
    await use();
    {
      const deadline = Date.now() + 35_000;
      while (pending.size > 0 && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      if (pending.size > 0) throw new Error('Browser requests did not settle before database reset');
    }
  }, { auto: true, timeout: 40_000 }],
});
