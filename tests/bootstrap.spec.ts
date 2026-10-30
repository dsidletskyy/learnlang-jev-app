import { expect, test } from './isolation/fixture';

test('home shows dictionary without development scaffold', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dictionary' })).toBeVisible();
  await expect(page.getByText('Local app foundation')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Check server connection' })).toHaveCount(0);
});
