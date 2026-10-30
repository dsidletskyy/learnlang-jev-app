import { expect, test } from '@playwright/test';

test('confirms the original phrase and cancellation preserves the entry', async ({ page }, testInfo) => {
  const phrase = `Keep this phrase ${testInfo.project.name}`;
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Original phrase').fill(phrase);
  await add.getByLabel('Translation').fill('Translation');
  await add.getByRole('button', { name: 'Save phrase' }).click();
  await expect(add).toBeHidden();
  const entry = page.getByRole('article').filter({ hasText: phrase });
  await entry.getByRole('button', { name: 'Delete phrase' }).click();
  const confirmation = page.getByRole('dialog');
  await expect(confirmation.getByText(phrase)).toBeVisible();
  await confirmation.getByRole('button', { name: 'Cancel' }).click();
  await expect(confirmation).toBeHidden();
  await page.reload();
  await expect(page.getByText(phrase, { exact: true })).toBeVisible();
});

test('deletes the confirmed entry persistently', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Original phrase').fill('Delete this phrase');
  await add.getByLabel('Translation').fill('Translation');
  await add.getByRole('button', { name: 'Save phrase' }).click();
  await expect(add).toBeHidden();
  await page.getByRole('article').filter({ hasText: 'Delete this phrase' }).getByRole('button', { name: 'Delete phrase' }).click();
  const confirmation = page.getByRole('dialog');
  await confirmation.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(confirmation).toBeHidden();
  await expect(page.getByRole('region', { name: /Notifications/ }).getByRole('listitem').filter({ hasText: 'Phrase deleted.' })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Delete this phrase', { exact: true })).toHaveCount(0);
});

test('refreshes without claiming deletion when another tab deleted the entry', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Original phrase').fill('Deleted in another tab');
  await add.getByLabel('Translation').fill('Translation');
  await add.getByRole('button', { name: 'Save phrase' }).click();
  await expect(add).toBeHidden();
  const other = await context.newPage();
  await other.goto('/');
  await page.getByRole('article').filter({ hasText: 'Deleted in another tab' }).getByRole('button', { name: 'Delete phrase' }).click();
  await other.getByRole('article').filter({ hasText: 'Deleted in another tab' }).getByRole('button', { name: 'Delete phrase' }).click();
  await other.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(other.getByRole('dialog')).toBeHidden();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText('Deleted in another tab', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: /Notifications/ }).getByRole('listitem').filter({ hasText: 'Phrase deleted.' })).toHaveCount(0);
});

test('deletion failure keeps confirmation open with an inline error', async ({ page }, testInfo) => {
  const phrase = `Keep after failure ${testInfo.project.name}`;
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Original phrase').fill(phrase);
  await add.getByLabel('Translation').fill('Translation');
  await add.getByRole('button', { name: 'Save phrase' }).click();
  await expect(add).toBeHidden();
  await page.getByRole('article').filter({ hasText: phrase }).getByRole('button', { name: 'Delete phrase' }).click();
  const confirmation = page.getByRole('dialog');
  await page.route('**/', route => route.request().method() === 'POST' ? route.abort() : route.continue());
  await confirmation.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(confirmation.getByRole('alert')).toContainText('Could not delete phrase');
  await expect(confirmation.getByText(phrase)).toBeVisible();
  await confirmation.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('article').getByText(phrase, { exact: true })).toBeVisible();
});
