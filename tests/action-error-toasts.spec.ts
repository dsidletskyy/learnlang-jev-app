import { expect, test } from '@playwright/test';

test('invalid dictionary submission retains inline guidance', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog.locator('#original-error')).toHaveText('Enter a value.');
  await expect(dialog.locator('#translation-error')).toHaveText('Enter a value.');
});

test('successful save still shows temporary success toast', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original phrase').fill('Success toast');
  await dialog.getByLabel('Translation').fill('Translation');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  const notification = page.getByRole('listitem').filter({ hasText: 'Phrase added.' });
  await expect(notification).toBeVisible();
  await expect(notification).toHaveAttribute('data-type', 'success');
  await expect(notification.getByRole('button', { name: /close/i })).toHaveCount(0);
  await expect(notification).toHaveCount(0, { timeout: 6500 });
});

test('failed dictionary save shows recoverable error in dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original phrase').fill('Failed save');
  await dialog.getByLabel('Translation').fill('Translation');
  await page.route('**/', route => route.request().method() === 'POST' ? route.abort() : route.continue());
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  const notification = dialog.getByRole('listitem').filter({ hasText: 'Could not save phrase. Check the database and try again.' });
  await expect(notification).toBeVisible();
  await expect(notification.getByRole('button', { name: /close/i })).toHaveCount(0);
  await expect(notification).toHaveCount(0, { timeout: 6500 });
  await expect(dialog.getByRole('alert')).toContainText('Could not save phrase. Check the database and try again.');
  await expect(dialog.getByLabel('Original phrase')).toHaveValue('Failed save');
});


test('failed deletion toast expires after closing dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original phrase').fill('Delete failure');
  await dialog.getByLabel('Translation').fill('Translation');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('article').filter({ hasText: 'Delete failure' }).first().getByRole('button', { name: 'Delete phrase' }).click();
  await page.route('**/', route => route.request().method() === 'POST' ? route.abort() : route.continue());
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  const notification = dialog.getByRole('listitem').filter({ hasText: 'Could not delete phrase.' });
  await expect(notification).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  const moved = page.getByRole('listitem').filter({ hasText: 'Could not delete phrase.' });
  await expect(moved).toBeVisible();
  await expect(moved.getByRole('button', { name: /close/i })).toHaveCount(0);
  await expect(moved).toHaveCount(0, { timeout: 6500 });
});
