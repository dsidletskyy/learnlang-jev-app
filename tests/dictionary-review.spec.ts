import { expect, test } from './isolation/fixture';

test('empty dictionary welcomes learner with an add action', async ({ page }) => {
  await page.goto('/');
  const welcome = page.getByRole('region', { name: 'Empty dictionary' });
  await expect(welcome).toContainText('Welcome');
  await welcome.getByRole('button', { name: 'Add phrase' }).click();
  await expect(page.getByRole('dialog', { name: 'Add phrase' })).toBeVisible();
});

test('dictionary displays newest entries, duplicates and full multiline text', async ({ page }) => {
  await page.goto('/');
  for (const [original, language, translation] of [
    ['Older phrase', 'en', 'Older translation'],
    ['First line\nSecond line', 'de', 'Erste Zeile\nZweite Zeile'],
    ['First line\nSecond line', 'de', 'Erste Zeile\nZweite Zeile'],
  ]) {
    await page.getByRole('button', { name: 'Add phrase' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Original phrase').fill(original);
    await dialog.getByRole('button', { name: 'Original language' }).click();
    await dialog.getByRole('option', { name: language === 'en' ? 'English' : 'German' }).click();
    await dialog.getByLabel('Translation').fill(translation);
    await dialog.getByRole('button', { name: 'Save phrase' }).click();
    await expect(dialog).toBeHidden();
  }
  await page.reload();
  const cards = page.getByRole('region', { name: 'Dictionary entries' }).locator('article');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText('First line Second line');
  await expect(cards.nth(1)).toContainText('First line Second line');
  await expect(cards.nth(2)).toContainText('Older phrase');
  for (const card of [cards.nth(0), cards.nth(1)]) {
    await expect(card).toContainText('German');
    const original = card.locator('p').first();
    const translation = card.locator('p').last();
    await expect(original).toHaveText('First line\nSecond line');
    await expect(translation).toHaveText('Erste Zeile\nZweite Zeile');
    await expect(original).toHaveCSS('white-space', 'pre-wrap');
    await expect(translation).toHaveCSS('white-space', 'pre-wrap');
    await expect(original).toHaveCSS('font-weight', '700');
    await expect(translation).toHaveCSS('font-weight', '400');
  }
});

test('entries created at the same time use descending IDs as tie-breaker', async ({ page }) => {
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    await client.connect();
    await client.query(`INSERT INTO dictionary_entries (original, language, translation, created_at) VALUES
      ('First tied entry', 'en', 'First translation', '2025-01-01T00:00:00Z'),
      ('Second tied entry', 'it', 'Second translation', '2025-01-01T00:00:00Z')`);
  } finally {
    await client.end();
  }
  await page.goto('/');
  const cards = page.getByRole('region', { name: 'Dictionary entries' }).locator('article');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText('Second tied entry');
  await expect(cards.nth(1)).toContainText('First tied entry');
});
