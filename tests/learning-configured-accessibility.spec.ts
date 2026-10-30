import { expect, test, type Locator } from './isolation/fixture';

test('narrow keyboard practice displays the full multiline prompt and permits safe exit', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Original phrase').fill('Hello');
  const translation = Array.from({ length: 12 }, (_, i) => `Line ${i + 1} ${'longword'.repeat(8)}`).join('\n');
  await add.getByLabel('Translation').fill(translation);
  await add.getByRole('button', { name: 'Save phrase' }).click();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  const prompt = page.getByLabel('Translation');
  await expect(page.getByText('English — 1 of 1')).toBeVisible();
  expect(await prompt.evaluate(element => element.scrollHeight <= element.clientHeight)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByLabel('Answer').fill('Hello');
  await page.getByLabel('Answer').press('Control+Enter');
  await expect(page.getByText('100%')).toBeVisible();
  const exit = page.getByRole('button', { name: 'Exit session' });
  await exit.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(exit).toBeFocused();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Session complete')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('keyboard navigates selection, evaluation error retry and summary actions', async ({ page, browserName }) => {
  // WebKit on macOS uses Option-Tab to include buttons in keyboard navigation.
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  const reverseTab = browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab';
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Original phrase').fill('Hello');
  await add.getByLabel('Translation').fill('Greeting');
  await add.getByRole('button', { name: 'Save phrase' }).click();
  await expect(add).toBeHidden();
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  await add.getByLabel('Original phrase').fill('Hello');
  await add.getByLabel('Translation').fill('Second greeting');
  await add.getByRole('button', { name: 'Save phrase' }).click();
  await expect(add).toBeHidden();

  const start = page.getByRole('button', { name: 'Start learning' });
  await start.focus();
  await page.keyboard.press('Enter');
  const selection = page.getByRole('dialog');
  await expect(selection.getByLabel('Original language')).toBeFocused();
  await page.keyboard.press(tab);
  const cancel = selection.getByRole('button', { name: 'Cancel' });
  await expect(cancel).toBeFocused();
  expect(await cancel.evaluate(element => {
    const style = getComputedStyle(element);
    return element.matches(':focus-visible') && ((style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2) || style.boxShadow !== 'none');
  })).toBe(true);
  await page.keyboard.press(tab);
  await expect(selection.getByRole('button', { name: 'Start session' })).toBeFocused();
  await page.keyboard.press('Enter');
  const answer = page.getByLabel('Answer');
  await expect(answer).toBeVisible();
  await expect(answer).toBeFocused();
  await page.keyboard.type('provider failure');
  await page.keyboard.press(tab);
  await expect(page.getByRole('button', { name: 'Submit answer' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#answer-error')).toHaveAttribute('role', 'alert');
  await expect(page.locator('#answer-error')).toContainText('Could not evaluate your answer');
  await expect(answer).toHaveAttribute('aria-invalid', 'true');
  await expect(answer).toHaveAttribute('aria-describedby', 'answer-error');
  await expect(answer).toBeFocused();
  await expect(answer).toHaveValue('provider failure');
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('Hello');
  await page.keyboard.press('Control+Enter');
  await expect(page.getByText('Estimated meaning-match score:')).toContainText('100%');
  const next = page.getByRole('button', { name: 'Next', exact: true });
  await expect(next).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(answer).toBeFocused();
  await page.keyboard.type('Hello');
  await page.keyboard.press('Control+Enter');
  await expect(next).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible();
  const back = page.getByRole('button', { name: 'Return to dictionary' });
  await expect(back).toBeFocused();
  await page.keyboard.press(tab);
  await expect(page.getByRole('button', { name: 'Start another session' })).toBeFocused();
  await page.keyboard.press(reverseTab);
  await expect(back).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Dictionary' })).toBeVisible();
  await page.keyboard.press(tab);
  await expect(page.getByRole('button', { name: 'Add phrase' }).first()).toBeFocused();
});

test.describe('touch learning controls', () => {
  test.use({ hasTouch: true, viewport: { width: 320, height: 700 } });

  test('controls have usable dimensions and respond to taps through error and summary', async ({ page }) => {
    async function tapButton(name: string) {
      const button = page.getByRole('button', { name, exact: true });
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      await button.tap();
    }
    await page.goto('/');
    await page.getByRole('button', { name: 'Add phrase' }).first().tap();
    const add = page.getByRole('dialog');
    await add.getByLabel('Original phrase').fill('Hello');
    await add.getByLabel('Translation').fill('Greeting');
    await add.getByRole('button', { name: 'Save phrase' }).click();
    await expect(add).toBeHidden();
    await tapButton('Start learning');
    const languageBox = await page.getByRole('dialog').getByLabel('Original language').boundingBox();
    expect(languageBox!.width).toBeGreaterThanOrEqual(44);
    expect(languageBox!.height).toBeGreaterThanOrEqual(44);
    await tapButton('Start session');
    const answerBox = await page.getByLabel('Answer').boundingBox();
    expect(answerBox!.width).toBeGreaterThanOrEqual(44);
    expect(answerBox!.height).toBeGreaterThanOrEqual(44);
    await tapButton('Exit session');
    await tapButton('Cancel');
    await page.getByLabel('Answer').fill('provider failure');
    await tapButton('Submit answer');
    await expect(page.locator('#answer-error')).toContainText('Could not evaluate your answer');
    await page.getByLabel('Answer').fill('Hello');
    await tapButton('Submit answer');
    await tapButton('Next');
    await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible();
    await tapButton('Start another session');
    await expect(page.getByRole('dialog').getByLabel('Original language')).toBeVisible();
    await tapButton('Cancel');
    await expect(page.getByRole('heading', { name: 'Dictionary' })).toBeVisible();
  });
});

test('practice answer and submit button have consistent spacing', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Original phrase').fill('Hello');
  await add.getByLabel('Translation').fill('Greeting');
  await add.getByRole('button', { name: 'Save phrase' }).click();
  await expect(add).toBeHidden();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  const answer = page.getByLabel('Answer');
  const submit = page.getByRole('button', { name: 'Submit answer' });
  async function expectGap(upperElement: Locator) {
    const upper = await upperElement.boundingBox();
    const lower = await submit.boundingBox();
    expect(upper).not.toBeNull();
    expect(lower).not.toBeNull();
    expect(lower!.y - (upper!.y + upper!.height)).toBeCloseTo(16, 0);
  }
  await expectGap(answer);
  await submit.click();
  const error = page.getByText('Enter a value.');
  await expect(error).toBeVisible();
  await expectGap(error);
});

test('repeated invalid submissions restore answer focus', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Original phrase').fill('Hello');
  await add.getByLabel('Translation').fill('Greeting');
  await add.getByRole('button', { name: 'Save phrase' }).click();
  await expect(add).toBeHidden();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  const answer = page.getByLabel('Answer');
  const submit = page.getByRole('button', { name: 'Submit answer' });
  for (let i = 0; i < 2; i++) {
    await submit.focus();
    await submit.press('Enter');
    await expect(page.locator('#answer-error')).toBeVisible();
    await expect(answer).toBeFocused();
  }
});

for (const shortcut of ['Control+Enter', 'Meta+Enter']) {
  test(`multiline answer supports ${shortcut} and announces validation`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add phrase' }).first().click();
    const add = page.getByRole('dialog');
    await add.getByLabel('Original phrase').fill('Hello\nworld');
    await add.getByLabel('Translation').fill('Greeting');
    await add.getByRole('button', { name: 'Save phrase' }).click();
    await expect(add).toBeHidden();
    await page.getByRole('button', { name: 'Start learning' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
    const answer = page.getByLabel('Answer');
    await expect(answer).toBeFocused();
    await answer.press(shortcut);
    await expect(answer).toHaveAttribute('aria-invalid', 'true');
    await expect(answer).toHaveAttribute('aria-describedby', 'answer-error');
    await expect(page.locator('#answer-error')).toHaveText('Enter a value.');
    await answer.fill('Hello\nworld');
    await expect(answer).toHaveValue('Hello\nworld');
    await answer.press(shortcut);
    await expect(page.getByText('Estimated meaning-match score:')).toContainText('100%');
  });
}
