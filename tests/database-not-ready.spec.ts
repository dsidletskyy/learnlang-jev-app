import { expect, test } from '@playwright/test';

test('home explains how to recover when the database is not ready', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('alert').filter({ hasText: 'Database is not ready' })).toContainText('Database is not ready');
  await expect(page.getByRole('alert').filter({ hasText: 'Database is not ready' })).toContainText('pnpm db:migrate');
});
