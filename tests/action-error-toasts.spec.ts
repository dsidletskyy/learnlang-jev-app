import { expect, test } from '@playwright/test';

test('invalid dictionary submission shows dismissible persistent toast inside dialog and inline guidance', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await page.clock.runFor(100);
  await expect(dialog.locator('#original-error')).toHaveText('Enter a value.');
  await expect(dialog.locator('#translation-error')).toHaveText('Enter a value.');
  await expect(dialog.getByRole('region', { name: /Notifications/ })).toHaveAttribute('aria-live', 'polite');
  const notification = dialog.getByRole('listitem').filter({ hasText: 'Check the highlighted fields and try again.' });
  await expect(notification).toBeVisible();
  await page.clock.fastForward(30000);
  await expect(notification).toBeVisible();
  const close = notification.getByRole('button', { name: /close toast/i });
  await close.focus();
  await close.press('Enter');
  await page.clock.runFor(500);
  await expect(notification).toBeHidden();
  await expect(dialog.locator('#original-error')).toBeVisible();
});

test('failed dictionary save shows recoverable error in dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original phrase').fill('Failed save');
  await dialog.getByLabel('Translation').fill('Translation');
  await page.route('**/', route => route.request().method() === 'POST' ? route.abort() : route.continue());
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog.getByRole('listitem')).toContainText('Could not save phrase. Check the database and try again.');
  await expect(dialog.getByLabel('Original phrase')).toHaveValue('Failed save');
});


test('failed deletion remains dismissible after closing dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original phrase').fill('Delete failure');
  await dialog.getByLabel('Translation').fill('Translation');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('article').filter({ hasText: 'Delete failure' }).first().getByRole('button', { name: 'Delete phrase' }).click();
  await page.route('**/', route => route.request().method() === 'POST' ? route.abort() : route.continue());
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  const notification = dialog.getByRole('listitem').filter({ hasText: 'Could not delete phrase.' });
  await expect(notification).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  const moved = page.getByRole('listitem').filter({ hasText: 'Could not delete phrase.' });
  await expect(moved).toBeVisible();
  await moved.getByRole('button', { name: /close toast/i }).click();
  await expect(moved).toBeHidden();
});
