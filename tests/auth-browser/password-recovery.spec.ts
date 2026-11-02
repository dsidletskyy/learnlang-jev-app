import { test, expect } from '@playwright/test';
import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';

test('recovery validates, revokes sessions, and requires manual sign in', async ({ page, request }) => {
  const email = `${randomUUID()}@example.com`;
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    await page.goto('/register');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password').fill('an unusual secret passphrase');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.getByRole('status')).toContainText('verification link');
    const verification = (await (await request.get('http://127.0.0.1:3115')).text()).replaceAll('=\n', '').replaceAll('=3D', '=').match(/http:\/\/127\.0\.0\.1:3117\/api\/auth\/verify-email\?[^\s]+/)![0];
    await page.goto(verification);
    await page.goto('/sign-in');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill('an unusual secret passphrase');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    const cookie = (await page.context().cookies()).find(c => c.name === 'better-auth.session_token')!;
    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Send recovery link' }).click();
    await expect(page.getByRole('status')).toContainText('If recovery is available', { timeout: 20_000 });
    const message = (await (await request.get('http://127.0.0.1:3115')).text()).replaceAll('=\n', '').replaceAll('=3D', '=');
    const link = message.match(/http:\/\/127\.0\.0\.1:3117\/reset-password\?[^\s]+/)![0];
    await page.goto(link);
    await page.getByLabel('New password').fill('another unusual passphrase');
    await page.getByLabel('Confirm password').fill('different unusual passphrase');
    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(page.getByRole('status')).toContainText('do not match');
    await page.getByLabel('Confirm password').fill('another unusual passphrase');
    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(page.getByRole('status')).toContainText('Password reset complete');
    await page.goto('/');
    await expect(page).toHaveURL(/sign-in/);
    await page.context().addCookies([cookie]);
    await page.goto('/');
    await expect(page).toHaveURL(/sign-in/);
    await page.goto(link);
    await page.getByLabel('New password').fill('another unusual passphrase');
    await page.getByLabel('Confirm password').fill('another unusual passphrase');
    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(page.getByRole('status')).toContainText('invalid or expired');
    await page.goto('/sign-in');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill('another unusual passphrase');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  } finally {
    await pool.query('delete from "user" where email=$1', [email]);
    await pool.query('delete from auth_identifier_rate_limit where identifier_hash=$1', [createHash('sha256').update(email).digest('hex')]);
    await pool.end();
  }
});

test('recovery responses and throttling match for known and unknown identifiers without leaking links', async ({ browser, request }) => {
  test.setTimeout(90_000);
  const known = `${randomUUID()}@example.com`;
  const unknown = `${randomUUID()}@example.com`;
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const contexts = await Promise.all(Array.from({ length: 8 }, () => browser.newContext()));
  try {
    await pool.query('insert into "user" (id, name, email, email_verified) values ($1, $2, $3, true)', [randomUUID(), 'Person', known]);
    await request.post('http://127.0.0.1:3115/clear');
    await request.post('http://127.0.0.1:3115/delay');
    const pages = await Promise.all(contexts.map(context => context.newPage()));
    await Promise.all(pages.map(page => page.goto('http://127.0.0.1:3117/forgot-password')));
    const responses: string[] = [];
    await Promise.all(pages.map(page => page.route('**/forgot-password', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      const response = await route.fetch();
      responses.push(await response.text());
      await route.fulfill({ response });
    })));
    const durations: { email: string; ms: number }[] = [];
    async function submit(index: number, email: string) {
      const page = pages[index];
      await page.getByLabel('Email').fill(email);
      const start = Date.now();
      await page.getByRole('button', { name: 'Send recovery link' }).click();
      await expect(page.getByRole('status')).toHaveText('If recovery is available, a link will be sent to the local inbox.', { timeout: 20_000 });
      durations.push({ email, ms: Date.now() - start });
    }
    await Promise.all([0, 1, 2].flatMap(i => [submit(i, known), submit(i + 4, unknown)]));
    const before = (await pool.query('select token_hash from password_recovery')).rows[0].token_hash;
    await Promise.all([submit(3, known), submit(7, unknown)]);
    assertRecoveryTiming(durations, known, unknown);
    expect((await pool.query('select token_hash from password_recovery')).rows[0].token_hash).toBe(before);
    const counts = await pool.query("select cardinality(attempts) n from auth_identifier_rate_limit where operation='reset' and identifier_hash = any($1)", [[known, unknown].map(email => createHash('sha256').update(email).digest('hex'))]);
    expect(counts.rows.map(row => row.n).sort()).toEqual([3, 3]);
    const messages: string[] = await (await request.get('http://127.0.0.1:3115/messages')).json();
    const links = messages.flatMap(message => [...message.replaceAll('=\n', '').replaceAll('=3D', '=').matchAll(/http:\/\/127\.0\.0\.1:3117\/reset-password\?[^\s]+/g)].map(match => match[0]));
    expect(links).toHaveLength(3);
    for (const link of links) {
      const navigation = await pages[0].goto(link);
      responses.push((await navigation!.text()).replaceAll('&amp;', '&'));
    }
    const { readFile } = await import('node:fs/promises');
    const log = await readFile('/tmp/learnlang-auth-browser-server.log', 'utf8');
    // Reset navigation necessarily renders its own token; check other responses
    // and server logs instead of treating the reset form as a leak.
    const requestResponses = responses.slice(0, -links.length).join('\n');
    for (const link of links) {
      const token = new URL(link).searchParams.get('token')!;
      expect(requestResponses).not.toContain(link);
      expect(requestResponses).not.toContain(token);
      expect(log).not.toContain(link);
      expect(log).not.toContain(token);
    }
  } finally {
    await request.post('http://127.0.0.1:3115/resume');
    await Promise.all(contexts.map(context => context.close()));
    await pool.query('delete from "user" where email=$1', [known]);
    await pool.query('delete from auth_identifier_rate_limit where identifier_hash = any($1)', [[known, unknown].map(email => createHash('sha256').update(email).digest('hex'))]);
    await pool.end();
  }
});

function assertRecoveryTiming(durations: { email: string; ms: number }[], known: string, unknown: string) {
  expect(durations).toHaveLength(8);
  for (const { ms } of durations) expect(ms).toBeGreaterThanOrEqual(9900);
  const knownTimes = durations.filter(value => value.email === known).map(value => value.ms);
  const unknownTimes = durations.filter(value => value.email === unknown).map(value => value.ms);
  expect(knownTimes).toHaveLength(4);
  expect(unknownTimes).toHaveLength(4);
  expect(Math.max(...knownTimes) - Math.min(...unknownTimes)).toBeLessThan(3000);
}
