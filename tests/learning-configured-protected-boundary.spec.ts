import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { expect, test } from './isolation/fixture';

test('real action requests enforce sessions, ownership and scoring input before provider access', async ({ page, isolatedDatabase }) => {
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    const other = randomUUID();
    await pool.query('insert into "user" (id, name, email, email_verified) values ($1, $2, $3, true)', [other, 'Other', `${other}@example.com`]);
    const rows = await pool.query(`insert into dictionary_entries (original, language, translation, owner_id) values ('Mine', 'en', 'My translation', $1), ('Secret', 'en', 'Other translation', $2), ('Legacy', 'en', 'Old translation', null) returning id, original`, [isolatedDatabase, other]);
    const id = (name: string) => rows.rows.find(row => row.original === name).id as number;
    await page.goto('/');
    await page.getByRole('button', { name: 'Edit phrase' }).click();
    const editRequest = page.waitForRequest(req => req.method() === 'POST' && !!req.headers()['next-action']);
    await page.getByRole('dialog').getByRole('button', { name: 'Save phrase' }).click();
    const edit = (await editRequest).headers()['next-action'];
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.getByRole('button', { name: 'Start learning' }).click();
    const loadRequest = page.waitForRequest(req => req.method() === 'POST' && !!req.headers()['next-action']);
    await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
    const load = (await loadRequest).headers()['next-action'];
    await page.getByLabel('Answer').fill('Different answer');
    const scoreRequest = page.waitForRequest(req => req.method() === 'POST' && !!req.headers()['next-action']);
    await page.getByRole('button', { name: 'Submit answer' }).click();
    const score = (await scoreRequest).headers()['next-action'];
    await expect(page.getByText('Estimated meaning-match score:')).toBeVisible();
    const count = async () => (await (await fetch('http://127.0.0.1:3101/request-count')).json()).count as number;
    const baseline = await count();
    expect(baseline).toBeGreaterThan(0);
    const invoke = async (action: string, args: unknown[], headers: Record<string, string> = {}) => {
      const response = await page.request.post('/', { headers: { 'next-action': action, 'content-type': 'text/plain;charset=UTF-8', origin: 'http://127.0.0.1:3100', ...headers }, data: JSON.stringify(args), failOnStatusCode: false });
      return { status: response.status(), body: await response.text() };
    };
    const fields = { original: 'Changed', translation: 'Changed', language: 'en' };
    const missingEdit = await invoke(edit, [2147483647, fields]);
    for (const target of [id('Secret'), id('Legacy')]) expect((await invoke(edit, [target, fields])).body).toBe(missingEdit.body);
    expect(missingEdit.body).toContain('This phrase no longer exists');
    const missingScore = await invoke(score, [{ id: 2147483647, answer: 'answer' }]);
    for (const target of [id('Secret'), id('Legacy')]) expect((await invoke(score, [{ id: target, answer: 'answer' }])).body).toBe(missingScore.body);
    expect(missingScore.body).toContain('This phrase no longer exists');
    for (const forgedId of ['1', -1, 0, 2147483648]) {
      expect((await invoke(score, [{ id: forgedId, answer: 'answer' }])).body).toContain('Check your Jev configuration');
      expect((await invoke(edit, [forgedId, fields])).body).toContain('Check the fields');
    }
    for (const extra of [{ original: 'forged' }, { language: 'de' }, { ownerId: other }]) {
      expect((await invoke(score, [{ id: id('Mine'), answer: 'answer', ...extra }])).body).toContain('Check your Jev configuration');
    }
    const listed = await invoke(load, ['en']);
    expect(listed.body).toContain('My translation');
    expect(listed.body).not.toContain('Other translation');
    expect(listed.body).not.toContain('Old translation');
    for (const [action, args] of [[edit, [id('Mine'), fields]], [load, ['en']], [score, [{ id: id('Mine'), answer: 'answer' }]]] as [string, unknown[]][]) {
      for (const cookie of ['', 'better-auth.session_token=forged.invalid']) expect((await invoke(action, args, { cookie })).body).toContain('Session expired or unavailable');
      expect((await invoke(action, args, { origin: 'http://evil.example' })).status).toBeGreaterThanOrEqual(400);
    }
    await pool.query("update session set expires_at = now() - interval '1 second' where user_id = $1", [isolatedDatabase]);
    for (const [action, args] of [[edit, [id('Mine'), fields]], [load, ['en']], [score, [{ id: id('Mine'), answer: 'answer' }]]] as [string, unknown[]][]) {
      expect((await invoke(action, args)).body).toContain('Session expired or unavailable');
    }
    expect(await count()).toBe(baseline);
    expect((await pool.query('select original, translation from dictionary_entries where id = $1', [id('Secret')])).rows).toEqual([{ original: 'Secret', translation: 'Other translation' }]);
  } finally { await pool.end(); }
});
