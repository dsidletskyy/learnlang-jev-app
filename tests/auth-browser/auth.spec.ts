import { test, expect } from '@playwright/test';
import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';

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
    await page.goto(link!);
    await expect(page.getByText('Verification complete.')).toBeVisible();
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
    expect((await pool.query('select count(*)::int as count from session s join "user" u on u.id=s.user_id where u.email=$1', [email])).rows[0].count).toBe(0);
  } finally {
    await pool.query('delete from "user" where email = $1', [email]);
    await pool.query('delete from auth_identifier_rate_limit where identifier_hash = $1', [createHash('sha256').update(email).digest('hex')]);
    await pool.end();
  }
});
