import { test, expect } from '@playwright/test';
import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';

test('recovery validates, revokes sessions, and requires manual sign in', async ({ page, request }) => {
  const email = `${randomUUID()}@example.com`;
  const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    await page.goto('/register');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password').fill('an unusual secret passphrase');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.getByRole('status')).toContainText('verification link');
    const verification = (await (await request.get('http://127.0.0.1:3115')).text()).replaceAll('=\n', '').replaceAll('=3D', '=').match(/http:\/\/127\.0\.0\.1:3117\/api\/auth\/verify-email\?[^\s]+/)![0];
    await page.goto(verification);
    await page.goto('/sign-in');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill('an unusual secret passphrase');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    const cookie = (await page.context().cookies()).find(c => c.name === 'better-auth.session_token')!;
    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Send recovery link' }).click();
    await expect(page.getByRole('status')).toContainText('If recovery is available');
    const message = (await (await request.get('http://127.0.0.1:3115')).text()).replaceAll('=\n', '').replaceAll('=3D', '=');
    const link = message.match(/http:\/\/127\.0\.0\.1:3117\/reset-password\?[^\s]+/)![0];
    await page.goto(link);
    await page.getByLabel('New password').fill('another unusual passphrase');
    await page.getByLabel('Confirm password').fill('different unusual passphrase');
    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(page.getByRole('status')).toContainText('do not match');
    await page.getByLabel('Confirm password').fill('another unusual passphrase');
    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(page.getByRole('status')).toContainText('Password reset complete');
    await page.goto('/');
    await expect(page).toHaveURL(/sign-in/);
    await page.context().addCookies([cookie]);
    await page.goto('/');
    await expect(page).toHaveURL(/sign-in/);
    await page.goto(link);
    await page.getByLabel('New password').fill('another unusual passphrase');
    await page.getByLabel('Confirm password').fill('another unusual passphrase');
    await page.getByRole('button', { name: 'Reset password' }).click();
    await expect(page.getByRole('status')).toContainText('invalid or expired');
    await page.goto('/sign-in');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill('another unusual passphrase');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  } finally {
    await pool.query('delete from "user" where email=$1', [email]);
    await pool.query('delete from auth_identifier_rate_limit where identifier_hash=$1', [createHash('sha256').update(email).digest('hex')]);
    await pool.end();
  }
});
