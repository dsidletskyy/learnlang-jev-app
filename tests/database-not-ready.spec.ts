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
  await page.clock.install();
  await page.goto('/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const notifications = page.getByRole('region', { name: /Notifications/ });
  await expect(notifications).toHaveAttribute('aria-live', 'polite');
  await page.clock.runFor(100);
  const toast = notifications.getByRole('listitem').filter({ hasText: 'Database is not ready' });
  await expect(toast).toBeVisible();
  await expect(toast.getByRole('button', { name: /close/i })).toHaveCount(0);
  await page.clock.runFor(100);
  await page.clock.fastForward(4000);
  await expect(toast).toBeVisible();
  await page.clock.fastForward(1500);
  await page.clock.runFor(500);
  await expect(toast).toBeHidden();
  await expect(page.getByRole('alert').filter({ hasText: 'pnpm db:migrate' })).toBeVisible();
});
