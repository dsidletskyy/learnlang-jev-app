import { test, expect } from './isolation/fixture';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

test('direct delete action enforces ownership, origin, cookie signature and session expiry', async ({ page, isolatedDatabase }) => {
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    const other = randomUUID();
    await pool.query('insert into "user" (id, name, email, email_verified) values ($1, $2, $3, true)', [other, 'Other', `${other}@example.com`]);
    const rows = await pool.query(`insert into dictionary_entries (original, language, translation, owner_id) values ('Mine', 'en', 'Mine', $1), ('Other', 'en', 'Other', $2) returning id, owner_id`, [isolatedDatabase, other]);
    const mine = rows.rows.find(row => row.owner_id === isolatedDatabase).id;
    const foreign = rows.rows.find(row => row.owner_id === other).id;
    await page.goto('/');
    await expect(page.getByText('Other', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Delete phrase' }).click();
    const pending = page.waitForRequest(req => req.method() === 'POST' && !!req.headers()['next-action']);
    await page.getByRole('dialog', { name: 'Delete phrase?' }).getByRole('button', { name: 'Delete', exact: true }).click();
    const original = await pending;
    expect(original.postData()).toBe(JSON.stringify([mine]));
    const action = original.headers()['next-action'];
    const invoke = (id: number, headers: Record<string, string> = {}) => page.request.post('/', { headers: { 'next-action': action, 'content-type': 'text/plain;charset=UTF-8', origin: 'http://127.0.0.1:3100', ...headers }, data: JSON.stringify([id]), failOnStatusCode: false });
    const foreignResponse = await invoke(foreign);
    const missingResponse = await invoke(2147483647);
    expect(await foreignResponse.text()).toContain('"deleted":false');
    expect(await missingResponse.text()).toContain('"deleted":false');
    const crossOrigin = await invoke(foreign, { origin: 'http://evil.example' });
    expect(crossOrigin.status()).toBeGreaterThanOrEqual(400);
    const forged = await invoke(foreign, { cookie: 'better-auth.session_token=forged.invalid' });
    expect(await forged.text()).toContain('Session expired or unavailable');
    await pool.query("update session set expires_at = now() - interval '1 second' where user_id = $1", [isolatedDatabase]);
    const expired = await invoke(foreign);
    expect(await expired.text()).toContain('Session expired or unavailable');
    expect((await pool.query('select original from dictionary_entries where id=$1', [foreign])).rows).toEqual([{ original: 'Other' }]);
  } finally { await pool.end(); }
});
