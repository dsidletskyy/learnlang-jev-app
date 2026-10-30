import { expect, test } from './isolation/fixture';

test('summary navigation starts a fresh session or returns to dictionary; refresh discards progress', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Original phrase').fill('Hello');
  await add.getByLabel('Translation').fill('Привіт');
  await add.getByRole('button', { name: 'Save phrase' }).click();
  await expect(add).toBeHidden();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  await page.getByLabel('Answer').fill('unfinished');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dictionary' })).toBeVisible();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByLabel('Answer')).toBeEmpty();
  await page.getByLabel('Answer').fill('Hello');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Start another session' }).click();
  await expect(page.getByRole('dialog').getByLabel('Original language')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByLabel('Answer')).toBeEmpty();
  await page.getByLabel('Answer').fill('Hello');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Return to dictionary' }).click();
  await expect(page.getByRole('heading', { name: 'Dictionary' })).toBeVisible();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByLabel('Answer')).toBeEmpty();
  await page.getByLabel('Answer').fill('Hello');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dictionary' })).toBeVisible();
});

test('cancelling exit preserves answer and last feedback; confirmed exit discards session', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Original phrase').fill('Hello');
  await add.getByLabel('Translation').fill('Привіт');
  await add.getByRole('button', { name: 'Save phrase' }).click();
  await expect(add).toBeHidden();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  await page.getByLabel('Answer').fill('Hello');
  await page.getByRole('button', { name: 'Exit session' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByLabel('Answer')).toHaveValue('Hello');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await page.getByRole('button', { name: 'Exit session' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Estimated meaning-match score:')).toContainText('100%');
  await page.getByRole('button', { name: 'Exit session' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Exit session' }).click();
  await expect(page.getByRole('heading', { name: 'Dictionary' })).toBeVisible();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByLabel('Answer')).toBeEmpty();
});

test('refresh warns until summary and discards unfinished progress', async ({ page, browserName }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Original phrase').fill('Hello');
  await add.getByLabel('Translation').fill('Привіт');
  await add.getByRole('button', { name: 'Save phrase' }).click();
  await expect(add).toBeHidden();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  await page.getByLabel('Answer').fill('Hello');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  // Playwright Firefox does not expose beforeunload dialogs on reload.
  if (browserName === 'firefox') {
    expect(await page.evaluate(() => window.dispatchEvent(new Event('beforeunload', { cancelable: true })))).toBe(false);
    await page.reload();
  } else {
    const warning = page.waitForEvent('dialog');
    const reload = page.reload();
    const dialog = await warning;
    expect(dialog.type()).toBe('beforeunload');
    await dialog.accept();
    await reload;
  }
  await expect(page.getByRole('heading', { name: 'Dictionary' })).toBeVisible();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByLabel('Answer')).toBeEmpty();
  await page.getByLabel('Answer').fill('Hello');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  let warned = false;
  page.on('dialog', async dialog => { warned = true; await dialog.accept(); });
  await page.reload();
  expect(warned).toBe(false);
  await expect(page.getByRole('heading', { name: 'Dictionary' })).toBeVisible();
});

test('exit during evaluation is immediate and late result cannot affect a new session', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Original phrase').fill('Hello');
  await add.getByLabel('Translation').fill('Привіт');
  await add.getByRole('button', { name: 'Save phrase' }).click();
  await expect(add).toBeHidden();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  let release!: () => void;
  let received!: () => void;
  const responseReceived = new Promise<void>(resolve => { received = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch();
    received();
    await gate;
    await route.fulfill({ response });
  });
  await page.getByLabel('Answer').fill('Greetings');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await responseReceived;
  await expect(page.getByRole('button', { name: 'Evaluating…' })).toBeVisible();
  await page.getByRole('button', { name: 'Exit session' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Exit session' }).click();
  await expect(page.getByRole('heading', { name: 'Dictionary' })).toBeVisible();
  release();
  await page.unrouteAll({ behavior: 'wait' });
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByLabel('Answer')).toBeEmpty();
  await expect(page.getByText('Estimated meaning-match score:')).toHaveCount(0);
  await page.getByLabel('Answer').fill('Hello');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.getByText('Estimated meaning-match score:')).toContainText('100%');
});

for (const outcome of ['success', 'failure'] as const) {
  test(`evaluation ${outcome} while exit dialog is open preserves dialog focus and navigation`, async ({ page, browserName }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add phrase' }).first().click();
    const add = page.getByRole('dialog');
    await add.getByLabel('Original phrase').fill('Hello');
    await add.getByLabel('Translation').fill('Greeting');
    await add.getByRole('button', { name: 'Save phrase' }).click();
    await expect(add).toBeHidden();
    await page.getByRole('button', { name: 'Start learning' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
    let release!: () => void;
    let received!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const responseReceived = new Promise<void>(resolve => { received = resolve; });
    await page.route('**/', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      const response = await route.fetch();
      received();
      await gate;
      await route.fulfill({ response });
    });
    await page.getByLabel('Answer').fill(outcome === 'success' ? 'Greetings' : 'provider failure');
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await responseReceived;
    const exit = page.getByRole('button', { name: 'Exit session' });
    await exit.focus();
    await exit.press('Enter');
    const dialog = page.getByRole('dialog');
    const cancel = dialog.getByRole('button', { name: 'Cancel' });
    await expect(cancel).toBeFocused();
    release();
    if (outcome === 'success') await expect(page.getByText('Estimated meaning-match score:')).toContainText('50%');
    else await expect(page.locator('#answer-error')).toContainText('Could not evaluate your answer');
    await expect(cancel).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(exit).toBeFocused();
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    if (outcome === 'success') {
      await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('button', { name: 'Return to dictionary' })).toBeFocused();
    } else {
      await expect(page.getByLabel('Answer')).toBeFocused();
      await expect(page.getByLabel('Answer')).toHaveValue('provider failure');
    }
  });
}
