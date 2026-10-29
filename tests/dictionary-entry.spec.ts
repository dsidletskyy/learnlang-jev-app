import { expect, test } from '@playwright/test';

test('adds a multiline dictionary entry and retains it after reload', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original phrase').fill(`  Hello ${testInfo.project.name}\nworld  `);
  await dialog.getByLabel('Original language').selectOption('en');
  await dialog.getByLabel('Translation').fill('  Привіт\nсвіте  ');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('status').filter({ hasText: 'Phrase added' })).toBeVisible();
  await page.reload();
  await expect(page.getByText(`Hello ${testInfo.project.name} world`, { exact: true })).toBeVisible();
  await expect(page.getByText('Привіт світе', { exact: true }).first()).toBeVisible();
});

test('validates text and preserves input, including Unicode code point limits', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  const original = dialog.getByLabel('Original phrase');
  const translation = dialog.getByLabel('Translation');
  await original.fill('  ');
  await translation.fill('retained');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog.getByText('Enter a value.')).toBeVisible();
  await expect(translation).toHaveValue('retained');
  await original.fill('😀'.repeat(2001));
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog.getByText('Use at most 2,000 Unicode code points.')).toBeVisible();
  await expect(original).toHaveValue('😀'.repeat(2001));
  await original.fill('😀'.repeat(2000));
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog).toBeHidden();
});

test('languages are ordered and duplicate entries are allowed', async ({ page }, testInfo) => {
  await page.goto('/');
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Add phrase' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Original language').locator('option')).toHaveText(['English', 'German', 'Italian', 'Russian', 'Slovak', 'Ukrainian']);
    await dialog.getByLabel('Original phrase').fill(`Duplicate entry ${testInfo.project.name}`);
    await dialog.getByLabel('Original language').selectOption('de');
    await dialog.getByLabel('Translation').fill('Duplicate translation');
    await dialog.getByRole('button', { name: 'Save phrase' }).click();
    await expect(dialog).toBeHidden();
  }
  await page.reload();
  await expect(page.getByText(`Duplicate entry ${testInfo.project.name}`, { exact: true })).toHaveCount(2);
});

test('save failure keeps dialog and input for retry', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original phrase').fill('Keep this phrase');
  await dialog.getByLabel('Translation').fill('Keep this translation');
  await page.route('**/', route => route.request().method() === 'POST' ? route.abort() : route.continue());
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Could not save phrase');
  await expect(dialog.getByLabel('Original phrase')).toHaveValue('Keep this phrase');
  await expect(dialog.getByLabel('Translation')).toHaveValue('Keep this translation');
});
