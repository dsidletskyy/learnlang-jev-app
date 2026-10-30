import { expect, test } from './isolation/fixture';
import { selectOriginalLanguage } from './learning-helpers';

test('sessions retain snapshots when another tab edits and deletes entries', async ({ page, context }) => {
  await page.goto('/');
  for (const [original, translation] of [['Hello', 'Greeting'], ['Goodbye', 'Farewell']]) {
    await page.getByRole('button', { name: 'Add phrase' }).first().click();
    const add = page.getByRole('dialog');
    await add.getByLabel('Original phrase').fill(original);
    await add.getByLabel('Translation').fill(translation);
    await add.getByRole('button', { name: 'Save phrase' }).click();
    await expect(add).toBeHidden();
  }
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  const other = await context.newPage();
  await other.goto('/');
  await other.getByRole('article').filter({ hasText: 'Hello' }).getByRole('button', { name: 'Edit phrase' }).click();
  const edit = other.getByRole('dialog');
  await edit.getByLabel('Original phrase').fill('Hello changed');
  await edit.getByLabel('Translation').fill('Greeting changed');
  await edit.getByRole('button', { name: 'Save phrase' }).click();
  await expect(edit).toBeHidden();
  await other.getByRole('article').filter({ hasText: 'Goodbye' }).getByRole('button', { name: 'Delete phrase' }).click();
  await other.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(other.getByRole('dialog')).toBeHidden();
  await other.getByRole('button', { name: 'Start learning' }).click();
  await other.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  await expect(other.getByText('English — 1 of 1')).toBeVisible();
  await expect(other.getByLabel('Translation')).toHaveText('Greeting changed');
  await other.getByLabel('Answer').fill('Hello changed');
  await other.getByRole('button', { name: 'Submit answer' }).click();
  await expect(other.getByText('Estimated meaning-match score:')).toContainText('100%');
  await expect(other.getByText('Hello changed', { exact: true })).toHaveCount(2);
  const seen = new Set<string>();
  for (let i = 0; i < 2; i++) {
    await expect(page.getByText(`English — ${i + 1} of 2`)).toBeVisible();
    const translation = await page.getByLabel('Translation').innerText();
    expect(['Greeting', 'Farewell']).toContain(translation);
    expect(seen.has(translation)).toBe(false);
    seen.add(translation);
    const original = translation === 'Greeting' ? 'Hello' : 'Goodbye';
    await page.getByLabel('Answer').fill(original);
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await expect(page.getByText('Estimated meaning-match score:')).toContainText('100%');
    await expect(page.getByText(original, { exact: true })).toHaveCount(2);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  const reviews = page.locator('main article');
  await expect(reviews).toHaveCount(2);
  await expect(reviews.filter({ hasText: 'Greeting' })).toContainText('Hello');
  await expect(reviews.filter({ hasText: 'Farewell' })).toContainText('Goodbye');
  await expect(page.getByText('Hello changed', { exact: true })).toHaveCount(0);
  await expect(other.getByText('Estimated meaning-match score:')).toContainText('100%');
  await other.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(other.getByRole('heading', { name: 'Session complete' })).toBeVisible();
});

test('stale language selection does not start an empty session after another tab deletes its entries', async ({ page, context }) => {
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
  const other = await context.newPage();
  await other.goto('/');
  await page.getByRole('button', { name: 'Start learning' }).click();
  const selection = page.getByRole('dialog');
  await expect(selection.getByRole('button', { name: /Original language/ })).toContainText('English (1)');
  await other.getByRole('article').filter({ hasText: 'Hello' }).getByRole('button', { name: 'Delete phrase' }).click();
  await other.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(other.getByRole('dialog')).toBeHidden();
  await selection.getByRole('button', { name: 'Start session' }).click();
  await expect(selection.getByRole('alert')).toContainText('No entries remain for this language');
  await expect(page.getByLabel('Answer')).toHaveCount(0);
  await selection.getByRole('button', { name: /Original language/ }).click();
  await page.getByRole('option', { name: 'German (1)' }).click();
  await selection.getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByText('German — 1 of 1')).toBeVisible();
  await expect(page.getByLabel('Translation')).toHaveText('German greeting');
});
