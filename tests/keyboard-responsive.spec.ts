import { expect, test } from './isolation/fixture';

test('keyboard dialogs restore focus and narrow dictionary wraps long content', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');
  const addButton = page.getByRole('button', { name: 'Add phrase' }).first();
  await addButton.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Original phrase')).toBeFocused();
  const phrase = `${testInfo.project.name} long${'word'.repeat(100)}\nsecond line`;
  await dialog.getByLabel('Original phrase').fill(phrase);
  await dialog.getByLabel('Translation').fill('First line\nSecond line');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog).toBeHidden();
  const entry = page.getByRole('article').filter({ hasText: phrase });
  await expect(entry.getByText(phrase, { exact: true })).toBeVisible();
  const edit = entry.getByRole('button', { name: 'Edit phrase' });
  await expect(edit).toHaveAttribute('title', 'Edit phrase');
  await expect(entry.getByRole('button', { name: 'Delete phrase' })).toHaveAttribute('title', 'Delete phrase');
  await edit.focus();
  await page.keyboard.press('Enter');
  await expect(dialog.getByLabel('Original phrase')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(edit).toBeFocused();
  await entry.getByRole('button', { name: 'Delete phrase' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(entry.getByRole('button', { name: 'Delete phrase' })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const button of await page.locator('main').getByRole('button').all()) {
    if (await button.isVisible()) {
      const box = await button.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
  }
});
