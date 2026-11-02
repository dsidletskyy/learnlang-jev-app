import { test, expect, type Page } from '@playwright/test';
import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';

const password = 'an unusual secret passphrase';

test('sign out all revokes both sessions, isolates other accounts, and permits manual sign-in', async ({ browser, request }) => {
  test.setTimeout(90_000);
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
  const [first, second, other] = await Promise.all(contexts.map(context => context.newPage()));
  const emails = [0, 1].map(() => `${randomUUID()}@example.com`);
  const signIn = async (page: Page, email: string) => {
    await page.goto('http://127.0.0.1:3117/sign-in');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  };
  try {
    for (const [page, email] of [[first, emails[0]], [other, emails[1]]] as const) {
      await page.goto('http://127.0.0.1:3117/register');
      await page.getByLabel('Email', { exact: true }).fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: 'Register' }).click();
      await expect(page.getByRole('status')).toContainText('verification link');
      const message = (await (await request.get('http://127.0.0.1:3115')).text()).replaceAll('=\n', '').replaceAll('=3D', '=');
      expect(message).toContain(email);
      const link = message.match(/http:\/\/127\.0\.0\.1:3117\/api\/auth\/verify-email\?[^\s]+/)?.[0];
      expect(link).toBeTruthy();
      await page.goto(link!);
      await expect(page.getByText('Verification complete.')).toBeVisible();
      await signIn(page, email);
    }
    await signIn(second, emails[0]);
    await second.getByRole('button', { name: 'Add phrase' }).first().click();
    await second.getByRole('dialog').getByLabel('Original phrase').fill('My phrase');
    await second.getByRole('dialog').getByLabel('Translation').fill('My translation');
    await second.getByRole('dialog').getByRole('button', { name: 'Save phrase' }).click();
    await expect(second.getByRole('dialog')).toBeHidden();
    const id = (await pool.query("select id from dictionary_entries where original = 'My phrase'")).rows[0].id;
    await second.getByRole('button', { name: 'Edit phrase' }).click();
    const editRequest = second.waitForRequest(req => req.method() === 'POST' && !!req.headers()['next-action']);
    await second.getByRole('dialog').getByRole('button', { name: 'Save phrase' }).click();
    const edit = (await editRequest).headers()['next-action'];
    await expect(second.getByRole('dialog')).toBeHidden();
    await second.getByRole('button', { name: 'Start learning' }).click();
    await second.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
    await second.getByLabel('Answer').fill('Different answer');
    const scoreRequest = second.waitForRequest(req => req.method() === 'POST' && !!req.headers()['next-action']);
    await second.getByRole('button', { name: 'Submit answer' }).click();
    const score = (await scoreRequest).headers()['next-action'];
    await expect(second.getByText('Estimated meaning-match score:')).toBeVisible();
    const count = async () => (await (await request.get('http://127.0.0.1:3101/request-count')).json()).count as number;
    const baseline = await count();
    const cookie = (await contexts[0].cookies()).find(c => c.name === 'better-auth.session_token')!;
    const revokeRequest = first.waitForRequest(req => req.method() === 'POST' && !!req.headers()['next-action']);
    await first.getByRole('button', { name: 'Revoke all sessions' }).click();
    const revoke = (await revokeRequest).headers()['next-action'];
    await expect(first).toHaveURL(/\/sign-in/);
    const unauthenticatedRevoke = await request.post('http://127.0.0.1:3117/', { headers: { 'next-action': revoke, 'content-type': 'text/plain;charset=UTF-8', origin: 'http://127.0.0.1:3117' }, data: '[]' });
    expect(await unauthenticatedRevoke.text()).toContain('could not be completed');
    await contexts[0].addCookies([cookie]);
    for (const page of [first, second]) {
      for (const [action, args] of [[edit, [id, { original: 'Changed', translation: 'Changed', language: 'en' }]], [score, [{ id, answer: 'Different answer' }]]] as [string, unknown[]][]) {
        const response = await page.request.post('http://127.0.0.1:3117/', { headers: { 'next-action': action, 'content-type': 'text/plain;charset=UTF-8', origin: 'http://127.0.0.1:3117' }, data: JSON.stringify(args) });
        expect(await response.text()).toContain('Session expired or unavailable');
      }
      await page.goto('http://127.0.0.1:3117/');
      await expect(page).toHaveURL(/\/sign-in/);
    }
    expect(await count()).toBe(baseline);
    expect((await pool.query('select original, translation from dictionary_entries where id=$1', [id])).rows).toEqual([{ original: 'My phrase', translation: 'My translation' }]);
    await other.reload();
    await expect(other.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
    expect((await pool.query('select u.email, count(*)::int as count from session s join "user" u on u.id=s.user_id where u.email = any($1) group by u.email', [emails])).rows).toEqual([{ email: emails[1], count: 1 }]);
    await signIn(second, emails[0]);
    await expect(second.getByRole('region', { name: 'Dictionary entries' })).toContainText('My phrase');
  } finally {
    await Promise.all(contexts.map(context => context.close()));
    await pool.query('delete from "user" where email = any($1)', [emails]);
    await pool.query('delete from auth_identifier_rate_limit where identifier_hash = any($1)', [emails.map(email => createHash('sha256').update(email).digest('hex'))]);
    await pool.end();
  }
});
