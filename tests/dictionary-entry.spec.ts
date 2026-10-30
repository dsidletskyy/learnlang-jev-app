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

test('edits all fields without changing entry order and retains changes after reload', async ({ page }) => {
  await page.goto('/');
  for (const phrase of ['Older phrase', 'Newer phrase']) {
    await page.getByRole('button', { name: 'Add phrase' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Original phrase').fill(phrase);
    await dialog.getByLabel('Translation').fill('Original translation');
    await dialog.getByRole('button', { name: 'Save phrase' }).click();
    await expect(dialog).toBeHidden();
  }
  const cards = page.getByRole('region', { name: 'Dictionary entries' }).locator('article');
  await cards.filter({ hasText: 'Older phrase' }).getByRole('button', { name: 'Edit phrase' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Original phrase')).toHaveValue('Older phrase');
  await dialog.getByLabel('Original phrase').fill('  Updated\nphrase  ');
  await dialog.getByLabel('Original language').selectOption('it');
  await dialog.getByLabel('Translation').fill('  Updated\ntranslation  ');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('status').filter({ hasText: 'Phrase updated.' })).toBeVisible();
  await page.reload();
  await expect(cards.nth(0)).toContainText('Newer phrase');
  await expect(cards.nth(1)).toContainText('Updated phrase');
  await expect(cards.nth(1)).toContainText('Italian');
  await expect(cards.nth(1)).toContainText('Updated translation');
});

test('editing validates fields and preserves input for recovery from a failed save', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original phrase').fill('Edit validation');
  await dialog.getByLabel('Translation').fill('Translation');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog).toBeHidden();
  await page.locator('article').filter({ hasText: 'Edit validation' }).getByRole('button', { name: 'Edit phrase' }).click();
  await dialog.getByLabel('Original phrase').fill('  ');
  await dialog.getByLabel('Translation').fill('Keep translation');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog.getByText('Enter a value.')).toBeVisible();
  await expect(dialog.getByLabel('Translation')).toHaveValue('Keep translation');
  await dialog.getByLabel('Original phrase').fill('😀'.repeat(2001));
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog.getByText('Use at most 2,000 Unicode code points.')).toBeVisible();
  await dialog.getByLabel('Original phrase').fill('Recovered phrase');
  await page.route('**/', route => route.request().method() === 'POST' ? route.abort() : route.continue());
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Could not save phrase');
  await expect(dialog.getByLabel('Original phrase')).toHaveValue('Recovered phrase');
  await expect(dialog.getByLabel('Translation')).toHaveValue('Keep translation');
  await page.unrouteAll();
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('article').filter({ hasText: 'Recovered phrase' }).first()).toBeVisible();
});

test('deleted entry cannot be recreated by an open edit dialog', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original phrase').fill('Deleted elsewhere');
  await dialog.getByLabel('Translation').fill('Old translation');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog).toBeHidden();
  await page.locator('article').filter({ hasText: 'Deleted elsewhere' }).getByRole('button', { name: 'Edit phrase' }).click();
  await dialog.getByLabel('Original phrase').fill('Unsaved correction');
  const other = await context.newPage();
  await other.goto('/');
  await other.locator('article').filter({ hasText: 'Deleted elsewhere' }).getByRole('button', { name: 'Delete phrase' }).click();
  await other.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(other.getByRole('dialog')).toBeHidden();
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog.getByRole('alert')).toContainText('no longer exists');
  await expect(dialog.getByLabel('Original phrase')).toHaveValue('Unsaved correction');
  await expect(dialog.getByLabel('Translation')).toHaveValue('Old translation');
  await other.reload();
  await expect(other.getByText('Unsaved correction')).toHaveCount(0);
  await expect(other.getByText('Deleted elsewhere')).toHaveCount(0);
});

test('last successful concurrent edit wins', async ({ page, context }, testInfo) => {
  const phrase = `Concurrent phrase ${testInfo.project.name}`;
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original phrase').fill(phrase);
  await dialog.getByLabel('Translation').fill('Original translation');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog).toBeHidden();
  const other = await context.newPage();
  await other.goto('/');
  await page.locator('article').filter({ hasText: phrase }).getByRole('button', { name: 'Edit phrase' }).click();
  await other.locator('article').filter({ hasText: phrase }).getByRole('button', { name: 'Edit phrase' }).click();
  await other.getByRole('dialog').getByLabel('Translation').fill('First save');
  await other.getByRole('dialog').getByRole('button', { name: 'Save phrase' }).click();
  await expect(other.getByRole('dialog')).toBeHidden();
  await dialog.getByLabel('Translation').fill('Last save');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(page.locator('article').filter({ hasText: phrase })).toContainText('Last save');
});

test('keyboard activation saves a dictionary entry and keeps button focus visible', async ({ page }) => {
  await page.goto('/');
  const add = page.getByRole('button', { name: 'Add phrase' }).first();
  await add.focus();
  await expect(add).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original phrase').fill('Keyboard phrase');
  await dialog.getByLabel('Translation').fill('Keyboard translation');
  await dialog.getByRole('button', { name: 'Save phrase' }).focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('status').filter({ hasText: 'Phrase added' })).toBeVisible();
});
