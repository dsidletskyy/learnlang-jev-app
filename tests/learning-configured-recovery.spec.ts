import { expect, test } from './isolation/fixture';
import { selectOriginalLanguage } from './learning-helpers';

test('loading failure preserves selected language and allows retry', async ({ page }) => {
  await page.goto('/');
  for (const language of ['English', 'German']) {
    await page.getByRole('button', { name: 'Add phrase' }).first().click();
    const add = page.getByRole('dialog');
    await add.getByLabel('Original phrase').fill('Original');
    await selectOriginalLanguage(add, language);
    await add.getByLabel('Translation').fill('Translation');
    await add.getByRole('button', { name: 'Save phrase' }).click();
    await expect(add).toBeHidden();
  }
  await page.getByRole('button', { name: 'Start learning' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /Original language/ }).click();
  await page.getByRole('option', { name: 'German (1)' }).click();
  await page.route('**/', route => route.request().method() === 'POST' ? route.abort() : route.continue());
  await dialog.getByRole('button', { name: 'Start session' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Could not load entries');
  await expect(dialog.getByRole('button', { name: /Original language/ })).toContainText('German (1)');
  await expect(dialog.getByLabel('Original language')).toBeEnabled();
  await page.unrouteAll();
  await dialog.getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByText('German — 1 of 1')).toBeVisible();
});

test('failed evaluation preserves editable answer and requires manual retry', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Original phrase').fill('Hello');
  await add.getByLabel('Translation').fill('Привіт');
  await add.getByRole('button', { name: 'Save phrase' }).click();
  await expect(add).toBeHidden();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  const answer = page.getByLabel('Answer');
  await answer.fill('provider failure');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.locator('#answer-error')).toContainText('Could not evaluate your answer');
  await expect(page.locator('#answer-error')).toContainText('charge');
  await expect(answer).toHaveValue('provider failure');
  await expect(page.getByText('Estimated meaning-match score:')).toHaveCount(0);
  await answer.fill('Greetings');
  await expect(page.getByText('Estimated meaning-match score:')).toHaveCount(0);
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.getByText('Estimated meaning-match score:')).toContainText('50%');
});

test('invalid scores and credentials produce safe actionable errors without consuming attempt', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Original phrase').fill('Hello');
  await add.getByLabel('Translation').fill('Привіт');
  await add.getByRole('button', { name: 'Save phrase' }).click();
  await expect(add).toBeHidden();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  const answer = page.getByLabel('Answer');
  for (const [value, message] of [['invalid score', 'Could not evaluate your answer'], ['unparseable score', 'Could not evaluate your answer'], ['credential failure', 'Check your Jev API key']]) {
    await answer.fill(value);
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await expect(page.locator('#answer-error')).toContainText(message);
    await expect(page.locator('#answer-error')).toContainText('charge');
    await expect(page.locator('#answer-error')).not.toContainText('provider detail');
    await expect(answer).toHaveValue(value);
    await expect(page.getByText('Estimated meaning-match score:')).toHaveCount(0);
  }
  await answer.fill('Greetings');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.getByText('Estimated meaning-match score:')).toContainText('50%');
});
