import { expect, test } from '@playwright/test';

test('learning loading failure shows toast inside modal and allows retry', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original phrase').fill('Learning load');
  await dialog.getByLabel('Translation').fill('Translation');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.route('**/', route => route.request().method() === 'POST' ? route.abort() : route.continue());
  await dialog.getByRole('button', { name: 'Start session' }).click();
  const notification = dialog.getByRole('listitem').filter({ hasText: 'Could not load entries.' });
  await expect(notification).toBeVisible();
  await expect(notification.getByRole('button', { name: /close/i })).toHaveCount(0);
  await expect(notification).toHaveCount(0, { timeout: 6500 });
  await expect(dialog.getByRole('alert')).toContainText('Check the database and try again.');
  await page.unrouteAll();
  await dialog.getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByLabel('Answer')).toBeVisible();
});

test('answer validation and evaluation failure show actionable toasts and retain answer guidance', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original phrase').fill('Learning answer');
  await dialog.getByLabel('Translation').fill('Translation');
  await dialog.getByRole('button', { name: 'Save phrase' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await dialog.getByRole('button', { name: 'Start session' }).click();
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.locator('#answer-error')).toHaveText('Enter a value.');
  await expect(page.getByRole('listitem').filter({ hasText: 'Check your answer and try again.' })).toBeVisible();
  await page.getByLabel('Answer').fill('Different answer');
  await page.route('**/', route => route.request().method() === 'POST' ? route.abort() : route.continue());
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Could not evaluate your answer.' })).toContainText('provider charge');
  await expect(page.getByLabel('Answer')).toHaveValue('Different answer');
  await expect(page.locator('#answer-error')).toContainText('provider charge');
});
