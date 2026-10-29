import { expect, test } from '@playwright/test';

test('missing Jev key blocks learning with configuration guidance', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Original phrase').fill('Hello');
  await add.getByLabel('Translation').fill('Привіт');
  await add.getByRole('button', { name: 'Save phrase' }).click();
  await expect(add).toBeHidden();
  await page.getByRole('button', { name: 'Start learning' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/TYPESAFE_API_KEY/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Start session' })).toBeDisabled();
});
