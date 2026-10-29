import { expect, test } from '@playwright/test';

test('add and edit confirmations are brief and old timers cannot clear a newer confirmation', async ({ page }, testInfo) => {
  await page.clock.install();
  await page.goto('/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const phrase = `Confirmation timing ${testInfo.project.name}`;
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original phrase').fill(phrase);
  await dialog.getByLabel('Translation').fill('Translation');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog).toBeHidden();
  const status = page.getByRole('status');
  await expect(status).toHaveText('Phrase added.');
  await page.clock.fastForward(4000);
  await expect(status).toHaveText('Phrase added.');

  await page.getByRole('article').filter({ hasText: phrase }).getByRole('button', { name: 'Edit phrase' }).click();
  await dialog.getByLabel('Translation').fill('Updated translation');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog).toBeHidden();
  await expect(status).toHaveText('Phrase updated.');
  await page.clock.fastForward(1500);
  await expect(status).toHaveText('Phrase updated.');
  await page.clock.fastForward(3500);
  await expect(status).toBeEmpty();

  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  await dialog.getByLabel('Original phrase').fill(`${phrase} second`);
  await dialog.getByLabel('Translation').fill('Translation');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog).toBeHidden();
  await expect(status).toHaveText('Phrase added.');
  await page.clock.fastForward(5000);
  await expect(status).toBeEmpty();
});
