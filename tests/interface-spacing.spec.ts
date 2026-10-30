import { expect, test, type Locator } from './isolation/fixture';

async function verticalGap(upper: Locator, lower: Locator) {
  const a = await upper.boundingBox();
  const b = await lower.boundingBox();
  expect(a).not.toBeNull();
  expect(b).not.toBeNull();
  return b!.y - (a!.y + a!.height);
}

test('Dictionary entry fields have consistent spacing in Add and Edit dialogs', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  const original = dialog.getByLabel('Original phrase');
  const language = dialog.getByRole('button', { name: 'Original language' });
  const translation = dialog.getByLabel('Translation');
  const originalLabel = dialog.getByText('Original phrase', { exact: true });
  const languageLabel = dialog.getByText('Original language', { exact: true });
  const translationLabel = dialog.locator('label').filter({ hasText: /^Translation$/ });

  async function checkSpacing() {
    expect(await verticalGap(originalLabel, original)).toBeCloseTo(8, 0);
    expect(Math.abs(await verticalGap(original, languageLabel) - 16)).toBeLessThanOrEqual(1);
    expect(await verticalGap(languageLabel, language)).toBeCloseTo(8, 0);
    expect(await verticalGap(language, translationLabel)).toBeCloseTo(16, 0);
    expect(await verticalGap(translationLabel, translation)).toBeCloseTo(8, 0);
  }

  await checkSpacing();
  const phrase = `Spacing ${testInfo.project.name}`;
  await original.fill(phrase);
  await translation.fill('Translation');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('article').filter({ hasText: phrase }).getByRole('button', { name: 'Edit phrase' }).click();
  await checkSpacing();
});

test('Dictionary action buttons keep their gap on narrow screens', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original phrase').fill(`Button spacing ${testInfo.project.name}`);
  await dialog.getByLabel('Translation').fill('Translation');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog).toBeHidden();

  async function checkGap(first: Locator, second: Locator) {
    const a = await first.boundingBox();
    const b = await second.boundingBox();
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    const gap = Math.abs(a!.y - b!.y) < 1 ? b!.x - (a!.x + a!.width) : b!.y - (a!.y + a!.height);
    expect(gap).toBeCloseTo(8, 0);
  }

  const add = page.getByRole('button', { name: 'Add phrase' }).first();
  const start = page.getByRole('button', { name: 'Start learning' });
  await checkGap(add, start);
  await page.setViewportSize({ width: 240, height: 700 });
  expect(await verticalGap(add, start)).toBeCloseTo(8, 0);
  await page.setViewportSize({ width: 320, height: 700 });
  const entry = page.getByRole('article').filter({ hasText: `Button spacing ${testInfo.project.name}` });
  await checkGap(entry.getByRole('button', { name: 'Edit phrase' }), entry.getByRole('button', { name: 'Delete phrase' }));
  await page.getByRole('button', { name: 'Start learning' }).click();
  expect(await verticalGap(dialog.getByText('Original language', { exact: true }), dialog.getByRole('button', { name: 'Original language' }))).toBeCloseTo(8, 0);
  await checkGap(dialog.getByRole('button', { name: 'Cancel' }), dialog.getByRole('button', { name: 'Start session' }));
});
