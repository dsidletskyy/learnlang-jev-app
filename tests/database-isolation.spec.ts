import { expect, test } from './isolation/fixture';

async function addMarker(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original phrase').fill('Isolation marker');
  await dialog.getByLabel('Translation').fill('Isolation translation');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog).toBeHidden();
}

test('leaves a dictionary entry for the next test', async ({ page }) => {
  await page.goto('/');
  await addMarker(page);
  await expect(page.getByText('Isolation marker', { exact: true })).toBeVisible();
});

test('starts without the preceding test entry', async ({ page }) => {
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
});
