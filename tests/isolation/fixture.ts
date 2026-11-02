import { execFileSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import pg from 'pg';
import { test as base } from '@playwright/test';

export { expect } from '@playwright/test';
export type { Locator, Page } from '@playwright/test';

async function control(action: 'drain' | 'resume') {
  const response = await fetch(`http://127.0.0.1:3103/${action}`, { method: 'POST' });
  if (!response.ok) throw new Error(`Test request proxy ${action} failed: ${await response.text()}`);
}

export const test = base.extend<{ isolatedDatabase: string }>({
  isolatedDatabase: [async ({ context }, use) => {
    await control('drain');
    execFileSync(process.execPath, ['tests/isolation/reset.mjs'], { stdio: 'inherit' });
    const id = randomUUID();
    const token = randomUUID();
    const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
    try {
      await client.connect();
      await client.query(`insert into "user" (id, name, email, email_verified) values ($1, 'Browser test', $2, true)`, [id, `${id}@example.com`]);
      await client.query(`insert into session (id, token, user_id, expires_at) values ($1, $2, $3, now() + interval '1 day')`, [randomUUID(), token, id]);
    } finally {
      await client.end();
    }
    const signature = createHmac('sha256', 'browser-test-secret-32-characters-long').update(token).digest('base64');
    await context.addCookies([{ name: 'better-auth.session_token', value: encodeURIComponent(`${token}.${signature}`), url: 'http://127.0.0.1:3100', httpOnly: true, sameSite: 'Lax' }]);
    await control('resume');
    await use(id);
  }, { auto: true, timeout: 40_000 }],
});
