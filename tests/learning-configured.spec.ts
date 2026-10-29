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

test('non-exact answer receives estimated meaning-match score', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Original phrase').fill('Hello');
  await add.getByLabel('Translation').fill('Private translation');
  await add.getByRole('button', { name: 'Save phrase' }).click();
  await expect(add).toBeHidden();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  await page.getByLabel('Answer').fill('Greetings');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.getByText('Estimated meaning-match score:')).toContainText('50%');
  await expect(page.getByText('Greetings', { exact: true })).toBeVisible();
});

test('completed session reviews answers in order and rounds the average', async ({ page }) => {
  await page.goto('/');
  const entries = [
    { original: 'Hello', translation: 'First\ntranslation', answer: 'Hello', score: '100%' },
    { original: 'Goodbye', translation: 'Second translation', answer: 'Farewell', score: '50%' },
    { original: 'Thanks', translation: 'Third translation', answer: 'Thank you', score: '50%' },
  ];
  for (const entry of entries) {
    await page.getByRole('button', { name: 'Add phrase' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Original phrase').fill(entry.original);
    await dialog.getByLabel('Translation').fill(entry.translation);
    await dialog.getByRole('button', { name: 'Save phrase' }).click();
    await expect(dialog).toBeHidden();
  }
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  const ordered = [];
  for (let i = 0; i < entries.length; i++) {
    await expect(page.getByText(`English — ${i + 1} of 3`)).toBeVisible();
    const translation = await page.getByLabel('Translation').inputValue();
    const entry = entries.find(item => item.translation === translation)!;
    expect(entry).toBeTruthy();
    ordered.push(entry);
    await page.getByLabel('Answer').fill(entry.answer);
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await expect(page.getByText('Estimated meaning-match score:')).toContainText(entry.score);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible();
  await expect(page.getByText('Average meaning-match score:')).toContainText('67%');
  const reviews = page.locator('main article');
  await expect(reviews).toHaveCount(3);
  for (let i = 0; i < ordered.length; i++) {
    for (const text of [ordered[i].translation, ordered[i].answer, ordered[i].original, ordered[i].score]) {
      await expect(reviews.nth(i)).toContainText(text);
    }
  }
});

test('summary navigation starts a fresh session or returns to dictionary; refresh discards progress', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Original phrase').fill('Hello');
  await add.getByLabel('Translation').fill('Привіт');
  await add.getByRole('button', { name: 'Save phrase' }).click();
  await expect(add).toBeHidden();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  await page.getByLabel('Answer').fill('unfinished');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dictionary' })).toBeVisible();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByLabel('Answer')).toBeEmpty();
  await page.getByLabel('Answer').fill('Hello');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Start another session' }).click();
  await expect(page.getByRole('dialog').getByLabel('Original language')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByLabel('Answer')).toBeEmpty();
  await page.getByLabel('Answer').fill('Hello');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Return to dictionary' }).click();
  await expect(page.getByRole('heading', { name: 'Dictionary' })).toBeVisible();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByLabel('Answer')).toBeEmpty();
  await page.getByLabel('Answer').fill('Hello');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dictionary' })).toBeVisible();
});
