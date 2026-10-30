import { expect, test } from '@playwright/test';

test('dictionary validation appears on save and updates as fields are corrected', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  const original = dialog.getByLabel('Original phrase');
  const translation = dialog.getByLabel('Translation');
  await original.fill('   ');
  await expect(original).not.toHaveAttribute('aria-invalid', 'true');
  await expect(dialog.getByText('Enter a value.')).toHaveCount(0);

  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  for (const field of [original, translation]) {
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription('Enter a value.');
    await expect(field).toHaveCSS('border-style', 'solid');
    await expect(field).toHaveCSS('border-color', 'rgb(220, 38, 38)');
  }
  const errors = dialog.getByText('Enter a value.');
  await expect(errors).toHaveCount(2);
  await expect(errors.first()).toHaveCSS('color', 'rgb(220, 38, 38)');
  await expect(errors.last()).toHaveCSS('color', 'rgb(220, 38, 38)');
  await expect(page.getByRole('listitem').filter({ hasText: 'Check the highlighted fields and try again.' })).toHaveCount(0);

  await original.fill('Valid phrase');
  await expect(original).not.toHaveAttribute('aria-invalid', 'true');
  await expect(original).not.toHaveAccessibleDescription('Enter a value.');
  await expect(translation).toHaveAccessibleDescription('Enter a value.');
  await original.fill('😀'.repeat(2001));
  await expect(original).toHaveAccessibleDescription('Use at most 2,000 Unicode code points.');
  await original.fill('Valid phrase');
  await translation.fill('Valid translation');
  await expect(dialog.getByText('Enter a value.')).toHaveCount(0);
  await translation.fill(' ');
  await expect(translation).toHaveAccessibleDescription('Enter a value.');
  await translation.fill('Valid translation');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog).toBeHidden();
});

test('failed dictionary save shows recoverable error in dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original phrase').fill('Failed save');
  await dialog.getByLabel('Translation').fill('Translation');
  await page.route('**/', route => route.request().method() === 'POST' ? route.abort() : route.continue());
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog.getByRole('listitem')).toContainText('Could not save phrase. Check the database and try again.');
  await expect(dialog.getByLabel('Original phrase')).toHaveValue('Failed save');
});


test('failed deletion remains dismissible after closing dialog', async ({ page }) => {
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
  await moved.getByRole('button', { name: /close toast/i }).click();
  await expect(moved).toBeHidden();
});
