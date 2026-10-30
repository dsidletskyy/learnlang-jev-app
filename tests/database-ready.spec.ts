import { expect, test } from './isolation/fixture';

test('home connects to the isolated test database', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('alert').filter({ hasText: 'Database is not ready' })).toHaveCount(0);
});
