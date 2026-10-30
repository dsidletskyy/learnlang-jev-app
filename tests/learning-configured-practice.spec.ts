import { expect, test } from './isolation/fixture';
import { selectOriginalLanguage } from './learning-helpers';

test('selects languages and practices each matching entry once with exact answers', async ({ page }) => {
  await page.goto('/');
  for (const [original, language, translation] of [['Hello', 'English', 'Привіт'], ['Goodbye', 'English', 'Бувай'], ['Hallo', 'German', 'Вітаю']]) {
    await page.getByRole('button', { name: 'Add phrase' }).first().click();
    const add = page.getByRole('dialog');
    await add.getByLabel('Original phrase').fill(original);
    await selectOriginalLanguage(add, language);
    await add.getByLabel('Translation').fill(translation);
    await add.getByRole('button', { name: 'Save phrase' }).click();
    await expect(add).toBeHidden();
  }
  await page.getByRole('button', { name: 'Start learning' }).click();
  const dialog = page.getByRole('dialog');
  const language = dialog.getByRole('button', { name: /Original language/ });
  await expect(language).toContainText('English (2)');
  await language.press('Enter');
  await expect(page.getByRole('option')).toHaveText(['English (2)', 'German (1)']);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(language).toContainText('German (1)');
  await language.press('Enter');
  await page.getByRole('option', { name: 'English (2)' }).click();
  await dialog.getByRole('button', { name: 'Start session' }).click();
  const seen = new Set<string>();
  for (let i = 1; i <= 2; i++) {
    await expect(page.getByText(`English — ${i} of 2`)).toBeVisible();
    const prompt = await page.getByLabel('Translation').innerText();
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
    const translation = await page.getByLabel('Translation').innerText();
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
    const paragraphs = reviews.nth(i).locator('p');
    await expect(paragraphs.nth(1)).toHaveCSS('font-weight', '400');
    await expect(paragraphs.nth(3)).toHaveCSS('font-weight', '400');
    await expect(paragraphs.nth(5)).toHaveCSS('font-weight', '700');
  }
});

test('language selection stays fixed while session entries load', async ({ page }) => {
  await page.goto('/');
  for (const [original, language, translation] of [['Hello', 'English', 'Greeting'], ['Hallo', 'German', 'German greeting']]) {
    await page.getByRole('button', { name: 'Add phrase' }).first().click();
    const add = page.getByRole('dialog');
    await add.getByLabel('Original phrase').fill(original);
    await selectOriginalLanguage(add, language);
    await add.getByLabel('Translation').fill(translation);
    await add.getByRole('button', { name: 'Save phrase' }).click();
    await expect(add).toBeHidden();
  }
  await page.getByRole('button', { name: 'Start learning' }).click();
  const selection = page.getByRole('dialog');
  let release!: () => void;
  let received!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const responseReceived = new Promise<void>(resolve => { received = resolve; });
  await page.route('**/', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch();
    received();
    await gate;
    await route.fulfill({ response });
  });
  await selection.getByRole('button', { name: 'Start session' }).click();
  await responseReceived;
  await expect(selection.getByLabel('Original language')).toBeDisabled();
  await expect(selection.getByRole('button', { name: /Original language/ })).toContainText('English (1)');
  await expect(selection.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(selection).toBeVisible();
  release();
  await expect(page.getByText('English — 1 of 1')).toBeVisible();
  await expect(page.getByLabel('Translation')).toHaveText('Greeting');
});
