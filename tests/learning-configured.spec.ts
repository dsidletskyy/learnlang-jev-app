import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';

test.beforeEach(() => { execFileSync('node', ['tests/isolation/reset.mjs'], { stdio: 'pipe' }); });

test('selects languages and practices each matching entry once with exact answers', async ({ page }) => {
  await page.goto('/');
  for (const [original, language, translation] of [['Hello', 'en', 'Привіт'], ['Goodbye', 'en', 'Бувай'], ['Hallo', 'de', 'Вітаю']]) {
    await page.getByRole('button', { name: 'Add phrase' }).first().click();
    const add = page.getByRole('dialog');
    await add.getByLabel('Original phrase').fill(original);
    await add.getByLabel('Original language').selectOption(language);
    await add.getByLabel('Translation').fill(translation);
    await add.getByRole('button', { name: 'Save phrase' }).click();
    await expect(add).toBeHidden();
  }
  await page.getByRole('button', { name: 'Start learning' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Original language').locator('option')).toHaveText(['English (2)', 'German (1)']);
  await dialog.getByRole('button', { name: 'Start session' }).click();
  const seen = new Set<string>();
  for (let i = 1; i <= 2; i++) {
    await expect(page.getByText(`English — ${i} of 2`)).toBeVisible();
    const prompt = await page.getByLabel('Translation').inputValue();
    expect(['Привіт', 'Бувай']).toContain(prompt);
    expect(seen.has(prompt)).toBe(false);
    seen.add(prompt);
    const answer = page.getByLabel('Answer');
    await answer.fill('   ');
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await expect(page.getByText('Enter a value.')).toBeVisible();
    await answer.fill('😀'.repeat(2001));
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await expect(page.getByText('Use at most 2,000 Unicode code points.')).toBeVisible();
    const original = prompt === 'Привіт' ? 'Hello' : 'Goodbye';
    await answer.fill(`  ${original.toUpperCase()}  `);
    await answer.press('Control+Enter');
    await expect(page.getByText('100%')).toBeVisible();
    await expect(page.getByText(original, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
});


test('loading failure preserves selected language and allows retry', async ({ page }) => {
  await page.goto('/');
  for (const language of ['en', 'de']) {
    await page.getByRole('button', { name: 'Add phrase' }).first().click();
    const add = page.getByRole('dialog');
    await add.getByLabel('Original phrase').fill('Original');
    await add.getByLabel('Original language').selectOption(language);
    await add.getByLabel('Translation').fill('Translation');
    await add.getByRole('button', { name: 'Save phrase' }).click();
    await expect(add).toBeHidden();
  }
  await page.getByRole('button', { name: 'Start learning' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original language').selectOption('de');
  await page.route('**/', route => route.request().method() === 'POST' ? route.abort() : route.continue());
  await dialog.getByRole('button', { name: 'Start session' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Could not load entries');
  await expect(dialog.getByLabel('Original language')).toHaveValue('de');
  await page.unrouteAll();
  await dialog.getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByText('German — 1 of 1')).toBeVisible();
});
