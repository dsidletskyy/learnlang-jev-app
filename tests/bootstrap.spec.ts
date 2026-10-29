import { expect, test } from '@playwright/test';

test('client reaches a server operation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Check server connection' }).click();
  await expect(page.getByRole('status')).toHaveText('Server connection confirmed.');
});
