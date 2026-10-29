import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';

test.beforeEach(() => { execFileSync('node', ['tests/isolation/reset.mjs'], { stdio: 'pipe' }); });

test('selects languages and practices each matching entry once with exact answers', async ({ page }) => {
  await page.goto('/');
  for (const [original, language, translation] of [['Hello', 'en', 'Привіт'], ['Goodbye', 'en', 'Бувай'], ['Hallo', 'de', 'Вітаю']]) {
    await page.getByRole('button', { name: 'Add phrase' }).first().click();
    const add = page.getByRole('dialog');
    await add.getByLabel('Original phrase').fill(original);
    await add.getByLabel('Original language').selectOption(language);
    await add.getByLabel('Translation').fill(translation);
    await add.getByRole('button', { name: 'Save phrase' }).click();
    await expect(add).toBeHidden();
  }
  await page.getByRole('button', { name: 'Start learning' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Original language').locator('option')).toHaveText(['English (2)', 'German (1)']);
  await dialog.getByRole('button', { name: 'Start session' }).click();
  const seen = new Set<string>();
  for (let i = 1; i <= 2; i++) {
    await expect(page.getByText(`English — ${i} of 2`)).toBeVisible();
    const prompt = await page.getByLabel('Translation').innerText();
    expect(['Привіт', 'Бувай']).toContain(prompt);
    expect(seen.has(prompt)).toBe(false);
    seen.add(prompt);
    const answer = page.getByLabel('Answer');
    await answer.fill('   ');
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await expect(page.getByText('Enter a value.')).toBeVisible();
    await answer.fill('😀'.repeat(2001));
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await expect(page.getByText('Use at most 2,000 Unicode code points.')).toBeVisible();
    const original = prompt === 'Привіт' ? 'Hello' : 'Goodbye';
    await answer.fill(`  ${original.toUpperCase()}  `);
    await answer.press('Control+Enter');
    await expect(page.getByText('100%')).toBeVisible();
    await expect(page.getByText(original, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
});


test('loading failure preserves selected language and allows retry', async ({ page }) => {
  await page.goto('/');
  for (const language of ['en', 'de']) {
    await page.getByRole('button', { name: 'Add phrase' }).first().click();
    const add = page.getByRole('dialog');
    await add.getByLabel('Original phrase').fill('Original');
    await add.getByLabel('Original language').selectOption(language);
    await add.getByLabel('Translation').fill('Translation');
    await add.getByRole('button', { name: 'Save phrase' }).click();
    await expect(add).toBeHidden();
  }
  await page.getByRole('button', { name: 'Start learning' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original language').selectOption('de');
  await page.route('**/', route => route.request().method() === 'POST' ? route.abort() : route.continue());
  await dialog.getByRole('button', { name: 'Start session' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Could not load entries');
  await expect(dialog.getByLabel('Original language')).toHaveValue('de');
  await expect(dialog.getByLabel('Original language')).toBeEnabled();
  await page.unrouteAll();
  await dialog.getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByText('German — 1 of 1')).toBeVisible();
});

test('non-exact answer receives estimated meaning-match score', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add phrase' }).first().click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Original phrase').fill('Hello');
  await add.getByLabel('Translation').fill('Private translation');
  await add.getByRole('button', { name: 'Save phrase' }).click();
  await expect(add).toBeHidden();
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  await page.getByLabel('Answer').fill('Greetings');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await expect(page.getByText('Estimated meaning-match score:')).toContainText('50%');
  await expect(page.getByText('Greetings', { exact: true })).toBeVisible();
});

test('completed session reviews answers in order and rounds the average', async ({ page }) => {
  await page.goto('/');
  const entries = [
    { original: 'Hello', translation: 'First\ntranslation', answer: 'Hello', score: '100%' },
    { original: 'Goodbye', translation: 'Second translation', answer: 'Farewell', score: '50%' },
    { original: 'Thanks', translation: 'Third translation', answer: 'Thank you', score: '50%' },
  ];
  for (const entry of entries) {
    await page.getByRole('button', { name: 'Add phrase' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Original phrase').fill(entry.original);
    await dialog.getByLabel('Translation').fill(entry.translation);
    await dialog.getByRole('button', { name: 'Save phrase' }).click();
    await expect(dialog).toBeHidden();
  }
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  const ordered = [];
  for (let i = 0; i < entries.length; i++) {
    await expect(page.getByText(`English — ${i + 1} of 3`)).toBeVisible();
    const translation = await page.getByLabel('Translation').innerText();
    const entry = entries.find(item => item.translation === translation)!;
    expect(entry).toBeTruthy();
    ordered.push(entry);
    await page.getByLabel('Answer').fill(entry.answer);
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await expect(page.getByText('Estimated meaning-match score:')).toContainText(entry.score);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible();
  await expect(page.getByText('Average meaning-match score:')).toContainText('67%');
  const reviews = page.locator('main article');
  await expect(reviews).toHaveCount(3);
  for (let i = 0; i < ordered.length; i++) {
    for (const text of [ordered[i].translation, ordered[i].answer, ordered[i].original, ordered[i].score]) {
      await expect(reviews.nth(i)).toContainText(text);
    }
  }
});

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

test('evaluation keeps submitted answer unchanged and prevents duplicate submissions', async ({ page }) => {
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
  const gate = new Promise<void>(resolve => { release = resolve; });
  const responseReceived = new Promise<void>(resolve => { received = resolve; });
  let submissions = 0;
  await page.route('**/', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    submissions++;
    const response = await route.fetch();
    received();
    await gate;
    await route.fulfill({ response });
  });
  const answer = page.getByLabel('Answer');
  await answer.fill('Greetings');
  await page.getByRole('button', { name: 'Submit answer' }).click();
  await responseReceived;
  await expect(page.getByRole('button', { name: 'Evaluating…' })).toBeDisabled();
  await expect(answer).toHaveValue('Greetings');
  await expect(answer).toHaveAttribute('readonly', '');
  await answer.press('Control+Enter');
  await answer.evaluate(element => (element as HTMLTextAreaElement).form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  const exit = page.getByRole('button', { name: 'Exit session' });
  await exit.focus();
  release();
  await expect(page.getByText('Estimated meaning-match score:')).toContainText('50%');
  await expect(exit).toBeFocused();
  expect(submissions).toBe(1);
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

test('sessions retain snapshots when another tab edits and deletes entries', async ({ page, context }) => {
  await page.goto('/');
  for (const [original, translation] of [['Hello', 'Greeting'], ['Goodbye', 'Farewell']]) {
    await page.getByRole('button', { name: 'Add phrase' }).first().click();
    const add = page.getByRole('dialog');
    await add.getByLabel('Original phrase').fill(original);
    await add.getByLabel('Translation').fill(translation);
    await add.getByRole('button', { name: 'Save phrase' }).click();
    await expect(add).toBeHidden();
  }
  await page.getByRole('button', { name: 'Start learning' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  const other = await context.newPage();
  await other.goto('/');
  await other.getByRole('article').filter({ hasText: 'Hello' }).getByRole('button', { name: 'Edit phrase' }).click();
  const edit = other.getByRole('dialog');
  await edit.getByLabel('Original phrase').fill('Hello changed');
  await edit.getByLabel('Translation').fill('Greeting changed');
  await edit.getByRole('button', { name: 'Save phrase' }).click();
  await expect(edit).toBeHidden();
  await other.getByRole('article').filter({ hasText: 'Goodbye' }).getByRole('button', { name: 'Delete phrase' }).click();
  await other.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(other.getByRole('dialog')).toBeHidden();
  await other.getByRole('button', { name: 'Start learning' }).click();
  await other.getByRole('dialog').getByRole('button', { name: 'Start session' }).click();
  await expect(other.getByText('English — 1 of 1')).toBeVisible();
  await expect(other.getByLabel('Translation')).toHaveText('Greeting changed');
  await other.getByLabel('Answer').fill('Hello changed');
  await other.getByRole('button', { name: 'Submit answer' }).click();
  await expect(other.getByText('Estimated meaning-match score:')).toContainText('100%');
  await expect(other.getByText('Hello changed', { exact: true })).toHaveCount(2);
  const seen = new Set<string>();
  for (let i = 0; i < 2; i++) {
    await expect(page.getByText(`English — ${i + 1} of 2`)).toBeVisible();
    const translation = await page.getByLabel('Translation').innerText();
    expect(['Greeting', 'Farewell']).toContain(translation);
    expect(seen.has(translation)).toBe(false);
    seen.add(translation);
    const original = translation === 'Greeting' ? 'Hello' : 'Goodbye';
    await page.getByLabel('Answer').fill(original);
    await page.getByRole('button', { name: 'Submit answer' }).click();
    await expect(page.getByText('Estimated meaning-match score:')).toContainText('100%');
    await expect(page.getByText(original, { exact: true })).toHaveCount(2);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  const reviews = page.locator('main article');
  await expect(reviews).toHaveCount(2);
  await expect(reviews.filter({ hasText: 'Greeting' })).toContainText('Hello');
  await expect(reviews.filter({ hasText: 'Farewell' })).toContainText('Goodbye');
  await expect(page.getByText('Hello changed', { exact: true })).toHaveCount(0);
  await expect(other.getByText('Estimated meaning-match score:')).toContainText('100%');
  await other.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(other.getByRole('heading', { name: 'Session complete' })).toBeVisible();
});

test('stale language selection does not start an empty session after another tab deletes its entries', async ({ page, context }) => {
  await page.goto('/');
  for (const [original, language, translation] of [['Hello', 'en', 'Greeting'], ['Hallo', 'de', 'German greeting']]) {
    await page.getByRole('button', { name: 'Add phrase' }).first().click();
    const add = page.getByRole('dialog');
    await add.getByLabel('Original phrase').fill(original);
    await add.getByLabel('Original language').selectOption(language);
    await add.getByLabel('Translation').fill(translation);
    await add.getByRole('button', { name: 'Save phrase' }).click();
    await expect(add).toBeHidden();
  }
  const other = await context.newPage();
  await other.goto('/');
  await page.getByRole('button', { name: 'Start learning' }).click();
  const selection = page.getByRole('dialog');
  await selection.getByLabel('Original language').selectOption('en');
  await other.getByRole('article').filter({ hasText: 'Hello' }).getByRole('button', { name: 'Delete phrase' }).click();
  await other.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(other.getByRole('dialog')).toBeHidden();
  await selection.getByRole('button', { name: 'Start session' }).click();
  await expect(selection.getByRole('alert')).toContainText('No entries remain for this language');
  await expect(page.getByLabel('Answer')).toHaveCount(0);
  await selection.getByLabel('Original language').selectOption('de');
  await selection.getByRole('button', { name: 'Start session' }).click();
  await expect(page.getByText('German — 1 of 1')).toBeVisible();
  await expect(page.getByLabel('Translation')).toHaveText('German greeting');
});

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

test('language selection stays fixed while session entries load', async ({ page }) => {
  await page.goto('/');
  for (const [original, language, translation] of [['Hello', 'en', 'Greeting'], ['Hallo', 'de', 'German greeting']]) {
    await page.getByRole('button', { name: 'Add phrase' }).first().click();
    const add = page.getByRole('dialog');
    await add.getByLabel('Original phrase').fill(original);
    await add.getByLabel('Original language').selectOption(language);
    await add.getByLabel('Translation').fill(translation);
    await add.getByRole('button', { name: 'Save phrase' }).click();
    await expect(add).toBeHidden();
  }
  await page.getByRole('button', { name: 'Start learning' }).click();
  const selection = page.getByRole('dialog');
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
  await selection.getByRole('button', { name: 'Start session' }).click();
  await responseReceived;
  await expect(selection.getByLabel('Original language')).toBeDisabled();
  await expect(selection.getByLabel('Original language')).toHaveValue('en');
  await expect(selection.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(selection).toBeVisible();
  release();
  await expect(page.getByText('English — 1 of 1')).toBeVisible();
  await expect(page.getByLabel('Translation')).toHaveText('Greeting');
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
    await page.getByRole('button', { name: 'Add phrase' }).first().click();
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
