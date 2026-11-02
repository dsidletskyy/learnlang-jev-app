import { expect, test } from '../isolation/fixture';

test.describe.configure({ retries: 1 });
test('retry starts clean after a failed attempt leaves an entry', async ({ page }, testInfo) => {
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    await client.connect();
    expect((await client.query('select count(*)::int as count from dictionary_entries')).rows[0].count).toBe(0);
  } finally {
    await client.end();
  }
  await page.goto('/');
  await expect(page.getByText('Isolation marker', { exact: true })).toHaveCount(0);
  if (testInfo.retry === 0) {
    await page.getByRole('button', { name: 'Add phrase' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Original phrase').fill('Isolation marker');
    await dialog.getByLabel('Translation').fill('Isolation translation');
    await dialog.getByRole('button', { name: 'Save phrase' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Isolation marker', { exact: true })).toBeVisible();
    throw new Error('Intentional first-attempt failure to verify retry isolation');
  }
});
