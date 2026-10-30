import { expect, test } from '@playwright/test';

test('home explains how to recover when the database is not ready', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('alert').filter({ hasText: 'Database is not ready' })).toContainText('Database is not ready');
  await expect(page.getByRole('alert').filter({ hasText: 'Database is not ready' })).toContainText('pnpm db:migrate');
  await expect(page.getByRole('alert').filter({ hasText: 'Database is not ready' })).toContainText('refresh');
  await expect(page.getByText('Welcome')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /retry/i })).toHaveCount(0);
});

test('database setup warning expires while recovery instructions remain', async ({ page }) => {
  await page.goto('/');
  const notifications = page.getByRole('region', { name: /Notifications/ });
  await expect(notifications).toHaveAttribute('aria-live', 'polite');
  const toast = notifications.getByRole('listitem').filter({ hasText: 'Database is not ready' });
  await expect(toast).toBeVisible();
  await expect(toast.getByRole('button', { name: /close/i })).toHaveCount(0);
  await page.waitForTimeout(4000);
  await expect(toast).toBeVisible();
  await expect(toast).toHaveCount(0, { timeout: 6500 });
  await expect(page.getByRole('alert').filter({ hasText: 'pnpm db:migrate' })).toBeVisible();
});
