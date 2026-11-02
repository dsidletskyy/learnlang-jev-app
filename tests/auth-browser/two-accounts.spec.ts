import { test, expect, type Page } from '@playwright/test';
import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';

const password = 'an unusual secret passphrase';

test('independently verified accounts isolate dictionary and learning in both directions', async ({ browser, request }) => {
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  const pages = await Promise.all(contexts.map(context => context.newPage()));
  const emails = pages.map(() => `${randomUUID()}@example.com`);
  const count = async () => (await (await request.get('http://127.0.0.1:3101/request-count')).json()).count as number;
  let legacy: number | undefined;
  try {
    legacy = (await pool.query("insert into dictionary_entries (original, language, translation, owner_id) values ('Legacy hidden', 'en', 'Legacy translation', null) returning id")).rows[0].id;
    for (const [index, page] of pages.entries()) {
      await page.goto('http://127.0.0.1:3117/register');
      await page.getByLabel('Email', { exact: true }).fill(emails[index]);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: 'Register' }).click();
      await expect(page.getByRole('status')).toContainText('verification link');
      const message = (await (await request.get('http://127.0.0.1:3115')).text()).replaceAll('=\n', '').replaceAll('=3D', '=');
      expect(message).toContain(emails[index]);
      const link = message.match(/http:\/\/127\.0\.0\.1:3117\/api\/auth\/verify-email\?[^\s]+/)?.[0];
      expect(link).toBeTruthy();
      await page.goto(link!);
      await expect(page.getByText('Verification complete.')).toBeVisible();
      await page.getByRole('link', { name: 'Sign in' }).click();
      await page.getByLabel('Email', { exact: true }).fill(emails[index]);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
      await page.getByRole('button', { name: 'Add phrase' }).first().click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Original phrase').fill(`Owner ${index} phrase`);
      await dialog.getByLabel('Translation').fill(`Owner ${index} translation`);
      await dialog.getByRole('button', { name: 'Save phrase' }).click();
      await expect(dialog).toBeHidden();
    }
    const rows = (await pool.query('select id, original from dictionary_entries where original like $1', ['Owner % phrase'])).rows;
    const ids = pages.map((_, index) => rows.find(row => row.original === `Owner ${index} phrase`).id);
    const invoke = async (page: Page, action: string, args: unknown[]) => {
      const response = await page.request.post('http://127.0.0.1:3117/', { headers: { 'next-action': action, 'content-type': 'text/plain;charset=UTF-8', origin: 'http://127.0.0.1:3117' }, data: JSON.stringify(args) });
      return response.text();
    };
    for (const [index, page] of pages.entries()) {
      await page.reload();
      await expect(page.getByRole('region', { name: 'Dictionary entries' })).toContainText(`Owner ${index} phrase`);
      await expect(page.getByRole('region', { name: 'Dictionary entries' })).not.toContainText(`Owner ${1 - index} phrase`);
      await expect(page.locator('main')).not.toContainText('Legacy hidden');
      await page.getByRole('button', { name: 'Add phrase' }).first().click();
      await page.getByRole('dialog').getByLabel('Original phrase').fill(`Disposable ${index}`);
      await page.getByRole('dialog').getByLabel('Translation').fill('Disposable translation');
      await page.getByRole('dialog').getByRole('button', { name: 'Save phrase' }).click();
      await expect(page.getByRole('dialog')).toBeHidden();
      await page.locator('article').filter({ hasText: `Disposable ${index}` }).getByRole('button', { name: 'Delete phrase' }).click();
      const deleteRequest = page.waitForRequest(req => req.method() === 'POST' && !!req.headers()['next-action']);
      await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
      const remove = (await deleteRequest).headers()['next-action'];
      await expect(page.getByRole('dialog')).toBeHidden();
      await page.getByRole('button', { name: 'Edit phrase' }).click();
      const editRequest = page.waitForRequest(req => req.method() === 'POST' && !!req.headers()['next-action']);
      await page.getByRole('dialog').getByLabel('Translation').fill(`Edited ${index}`);
      await page.getByRole('dialog').getByRole('button', { name: 'Save phrase' }).click();
      const edit = (await editRequest).headers()['next-action'];
      await expect(page.getByRole('dialog')).toBeHidden();
      await page.getByRole('button', { name: 'Start learning' }).click();
      const loadRequest = page.waitForRequest(req => req.method() === 'POST' && !!req.headers()['next-action']);
      await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
      const load = (await loadRequest).headers()['next-action'];
      await expect(page.getByLabel('Translation')).toHaveText(`Edited ${index}`);
      await page.getByLabel('Answer').fill('Different answer');
      const scoreRequest = page.waitForRequest(req => req.method() === 'POST' && !!req.headers()['next-action']);
      await page.getByRole('button', { name: 'Submit answer' }).click();
      const score = (await scoreRequest).headers()['next-action'];
      await expect(page.getByText('Estimated meaning-match score:')).toBeVisible();
      const baseline = await count();
      for (const target of [ids[1 - index], legacy]) {
        expect(await invoke(page, remove, [target])).toContain('"deleted":false');
        expect(await invoke(page, edit, [target, { original: 'Forged', translation: 'Forged', language: 'en' }])).toContain('This phrase no longer exists');
        expect(await invoke(page, score, [{ id: target, answer: 'Different answer' }])).toContain('This phrase no longer exists');
      }
      const listed = await invoke(page, load, ['en']);
      expect(listed).toContain(`Edited ${index}`);
      expect(listed).not.toContain('Legacy translation');
      expect(listed).not.toContain(`Edited ${1 - index}`);
      expect(await count()).toBe(baseline);
      await page.getByRole('button', { name: 'Exit session' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Exit session' }).click();
    }
    expect((await pool.query('select original, translation from dictionary_entries where id = any($1) order by id', [ids])).rows).toEqual([
      { original: 'Owner 0 phrase', translation: 'Edited 0' },
      { original: 'Owner 1 phrase', translation: 'Edited 1' },
    ]);
    for (const page of pages) {
      await page.getByRole('button', { name: 'Delete phrase' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(page.getByRole('region', { name: 'Empty dictionary' })).toBeVisible();
    }
    expect((await pool.query('select original from dictionary_entries where id=$1', [legacy])).rows).toEqual([{ original: 'Legacy hidden' }]);
  } finally {
    if (legacy !== undefined) await pool.query('delete from dictionary_entries where id=$1', [legacy]);
    await Promise.all(contexts.map(context => context.close()));
    await pool.query('delete from "user" where email = any($1)', [emails]);
    await pool.query('delete from auth_identifier_rate_limit where identifier_hash = any($1)', [emails.map(email => createHash('sha256').update(email).digest('hex'))]);
    await pool.end();
  }
});
