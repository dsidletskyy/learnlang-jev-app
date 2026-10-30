import { expect, test } from './isolation/fixture';

test('missing Jev key blocks learning with configuration guidance', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Original phrase').fill('Hello');
  await add.getByLabel('Translation').fill('Привіт');
  await add.getByRole('button', { name: 'Save phrase' }).click();
  await expect(add).toBeHidden();
  await page.getByRole('button', { name: 'Start learning' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/TYPESAFE_API_KEY/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Start session' })).toBeDisabled();
  const notifications = dialog.getByRole('region', { name: /Notifications/ });
  await expect(notifications).toHaveAttribute('aria-live', 'polite');
  await page.clock.runFor(100);
  const warning = notifications.getByRole('listitem').filter({ hasText: 'Learning provider is not configured' });
  await expect(warning).toBeVisible();
  await expect(warning.getByRole('button', { name: /close/i })).toHaveCount(0);
  await page.clock.runFor(100);
  await page.clock.fastForward(4000);
  await expect(warning).toBeVisible();
  await page.clock.fastForward(1500);
  await page.clock.runFor(500);
  await expect(warning).toBeHidden();
  await expect(dialog.getByText(/TYPESAFE_API_KEY/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await expect(warning).toHaveCount(0);
  await expect(dialog.getByText(/TYPESAFE_API_KEY/)).toBeVisible();
});


test('keyboard opens learning dialog and disabled session button cannot start', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original phrase').fill('Learning keyboard phrase');
  await dialog.getByLabel('Translation').fill('Learning keyboard translation');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Start learning' }).focus();
  await page.keyboard.press('Space');
  const start = dialog.getByRole('button', { name: 'Start session' });
  await expect(start).toBeDisabled();
  await expect(dialog.getByText(/TYPESAFE_API_KEY/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
});
