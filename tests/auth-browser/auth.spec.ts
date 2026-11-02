import { test, expect } from '@playwright/test';
import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';
import { readFile } from 'node:fs/promises';

test('registration, verification, sign-in and server-side sign-out', async ({ page, request }) => {
  const email = `${randomUUID()}@example.com`;
  const password = 'an unusual secret passphrase';
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    await page.goto('/register');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.getByRole('status')).toContainText('verification link');
    const message = (await (await request.get('http://127.0.0.1:3115')).text()).replaceAll('=\n', '').replaceAll('=3D', '=');
    const link = message.match(/http:\/\/127\.0\.0\.1:3117\/api\/auth\/verify-email\?[^\s]+/)?.[0];
    expect(link).toBeTruthy();
    await page.goto('/sign-in');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('status')).toContainText('Unable to sign in');
    await page.getByLabel('Email for verification').fill(email);
    await page.getByRole('button', { name: 'Resend verification' }).click();
    await expect(page.getByRole('status').last()).toContainText('If verification is needed');
    await page.goto('/api/auth/verify-email?token=invalid&callbackURL=https%3A%2F%2Fevil.example');
    await expect(page).toHaveURL('http://127.0.0.1:3117/verification?status=invalid');
    await expect(page.getByText('This link is invalid or expired.')).toBeVisible();
    const untrustedLink = new URL(link!);
    untrustedLink.searchParams.set('callbackURL', 'https://evil.example');
    await page.goto(untrustedLink.toString());
    await expect(page).toHaveURL('http://127.0.0.1:3117/verification?status=success');
    await expect(page.getByText('Verification complete.')).toBeVisible();
    const serverLog = await readFile('/tmp/learnlang-auth-browser-server.log', 'utf8');
    expect(serverLog.includes(new URL(link!).searchParams.get('token')!)).toBe(false);
    expect(serverLog.includes(link!)).toBe(false);
    const smtpLog = await readFile('/tmp/learnlang-auth-browser-smtp.log', 'utf8');
    expect(smtpLog.includes(new URL(link!).searchParams.get('token')!)).toBe(false);
    expect(smtpLog.includes(link!)).toBe(false);
    await expect(page.context().cookies()).resolves.not.toEqual(expect.arrayContaining([expect.objectContaining({ name: 'better-auth.session_token' })]));
    await page.getByRole('link', { name: 'Sign in' }).click();
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible({ timeout: 15000 });
    const cookie = (await page.context().cookies()).find(c => c.name === 'better-auth.session_token');
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', secure: false });
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/sign-in/);
    await page.goto('/');
    await expect(page).toHaveURL(/\/sign-in/);
    await page.context().addCookies([cookie!]);
    await page.goto('/');
    await expect(page).toHaveURL(/\/sign-in/);
    expect((await pool.query('select count(*)::int as count from session s join "user" u on u.id=s.user_id where u.email=$1', [email])).rows[0].count).toBe(0);
    await page.context().clearCookies();
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.getByLabel('Email', { exact: true }).fill(email);
      await page.getByLabel('Password').fill('incorrect passphrase');
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect.poll(async () => (await pool.query("select cardinality(attempts) as count from auth_identifier_rate_limit where operation='sign-in' and identifier_hash=$1", [createHash('sha256').update(email).digest('hex')])).rows[0].count).toBe(3 + attempt);
      await expect(page.getByRole('status')).toContainText('Unable to sign in');
    }
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password').fill(password);
    const blocked = page.waitForResponse(response => response.request().method() === 'POST' && !!response.request().headers()['next-action']);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await blocked;
    await expect(page.getByRole('status')).toContainText('Unable to sign in');
    expect((await pool.query('select count(*)::int as count from session s join "user" u on u.id=s.user_id where u.email=$1', [email])).rows[0].count).toBe(0);
    await pool.query("update auth_identifier_rate_limit set attempts = ARRAY[now() - interval '16 minutes'] where operation='sign-in' and identifier_hash=$1", [createHash('sha256').update(email).digest('hex')]);
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  } finally {
    await pool.query('delete from "user" where email = $1', [email]);
    await pool.query('delete from auth_identifier_rate_limit where identifier_hash = $1', [createHash('sha256').update(email).digest('hex')]);
    await pool.end();
  }
});


test('initial mail failure keeps registration generic and account unverified', async ({ page, request }) => {
  const email = `${randomUUID()}@example.com`;
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    await request.post('http://127.0.0.1:3115/fail');
    await page.goto('/register');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password').fill('an unusual secret passphrase');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.getByRole('status')).toHaveText('If registration can be completed, a verification link will be sent to the local inbox.');
    expect((await pool.query('select email_verified from "user" where email=$1', [email])).rows).toEqual([{ email_verified: false }]);
    await page.goto('/sign-in');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password').fill('an unusual secret passphrase');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('status')).toContainText('Unable to sign in');
    const log = await readFile('/tmp/learnlang-auth-browser-server.log', 'utf8');
    expect(log).toContain('Verification email delivery failed');
    expect(log).not.toContain('451 delivery unavailable');
  } finally {
    await request.post('http://127.0.0.1:3115/resume');
    await pool.query('delete from "user" where email=$1', [email]);
    await pool.query('delete from auth_identifier_rate_limit where identifier_hash=$1', [createHash('sha256').update(email).digest('hex')]);
    await pool.end();
  }
});
