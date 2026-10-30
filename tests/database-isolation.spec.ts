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
  await page.goto('/');
  await expect(page.getByText('Isolation marker', { exact: true })).toHaveCount(0);
});
