'use server';

import { cookies, headers } from 'next/headers';
import { after } from 'next/server';
import { sendPasswordRecoveryMail } from '../lib/password-recovery-mail';
import { completePasswordRecovery, requestPasswordRecovery, withIdentifierLock } from '../lib/password-recovery';
import { recoveryAcknowledgment, validateResetPassword } from '../lib/password-recovery-policy';
import { eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { session } from '../db/schema';
import { redirect } from 'next/navigation';
import { getDatabase, getPool } from '../db';
import { createLocalAuth, validatedSession } from '../lib/auth';
import { checkPasswordBlocklist } from '../lib/auth-password-blocklist';
import { consumeIdentifierAttempt, consumeRecoveryAttempt, type AuthLimitOperation } from '../lib/auth-identifier-rate-limit';
import { register, signIn } from '../lib/auth-entry-policy';
import { revokeCurrentSession } from '../lib/sign-out';
import { sessionCookieOptions } from '../lib/session-cookie';
import { resendVerification } from '../lib/verification-resend';

const genericSignIn = 'Unable to sign in. Check your details and verification, then try again.';
const registrationAcknowledgment = 'If registration can be completed, a verification link will be sent to the local inbox.';

async function providerRequest(path: string, body?: object, cookie?: string, db?: NodePgDatabase) {
  const auth = createLocalAuth(db ?? await getDatabase());
  const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
  return auth.handler(new Request(`${origin}/api/auth/${path}`, {
    method: 'POST', headers: { origin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body ?? {}),
  }));
}

function credentials(form: FormData) {
  return { email: String(form.get('email') ?? ''), password: String(form.get('password') ?? '') };
}

function dependencies(input: ReturnType<typeof credentials>, operation: AuthLimitOperation, provider: () => Promise<boolean>) {
  return { limit: () => consumeIdentifierAttempt(getPool(), operation, input.email), blocklist: checkPasswordBlocklist, provider };
}

export async function registerAction(_state: string, form: FormData): Promise<string> {
  const input = credentials(form);
  const result = await register(input, dependencies(input, 'registration', async () => {
    const response = await providerRequest('sign-up/email', { ...input, name: input.email });
    return response.ok;
  }));
  if (result === 'password') return 'Choose a password of 12–1024 characters that is not common or compromised.';
  if (result === 'retry') return 'Registration is temporarily unavailable. Please try again later.';
  return registrationAcknowledgment;
}

export async function signInAction(_state: string, form: FormData): Promise<string> {
  const input = credentials(form);
  const success = await signIn(input, dependencies(input, 'sign-in', async () => {
    const response = await withIdentifierLock(getPool(), input.email, client => providerRequest('sign-in/email', input, undefined, drizzle(client)));
    if (!response.ok) return false;
    const sessionCookie = response.headers.getSetCookie().find(value => /^(?:__Secure-)?better-auth\.session_token=/.test(value));
    if (!sessionCookie) return false;
    const pair = sessionCookie.split(';', 1)[0];
    const equals = pair.indexOf('=');
    (await cookies()).set(pair.slice(0, equals), decodeURIComponent(pair.slice(equals + 1)), sessionCookieOptions(process.env.BETTER_AUTH_URL!));
    return true;
  }));
  if (!success) return genericSignIn;
  redirect('/');
}

async function deleteSessionCookies() {
  const store = await cookies();
  store.delete('better-auth.session_token');
  store.delete('__Secure-better-auth.session_token');
}

export async function signOutAction(): Promise<string> {
  const success = await revokeCurrentSession(async () => {
    const db = await getDatabase();
    const current = await createLocalAuth(db).api.getSession({ headers: await headers(), query: { disableCookieCache: true } });
    if (!current) return false;
    const deleted = await db.delete(session).where(eq(session.id, current.session.id)).returning({ id: session.id });
    return deleted.length === 1;
  }, deleteSessionCookies);
  if (!success) return 'Sign out could not be completed. Your session may still be active; please try again.';
  redirect('/sign-in');
}

export async function signOutAllSessionsAction(): Promise<string> {
  const success = await revokeCurrentSession(async () => {
    const db = await getDatabase();
    const current = await validatedSession(createLocalAuth(db), await headers());
    if (!current) return false;
    const deleted = await db.delete(session).where(eq(session.userId, current.user.id)).returning({ id: session.id });
    return deleted.some(row => row.id === current.session.id);
  }, deleteSessionCookies);
  if (!success) return 'Sign out of all sessions could not be completed. Your sessions may still be active; please try again.';
  redirect('/sign-in');
}

export async function resendVerificationAction(_state: string, form: FormData): Promise<string> {
  const email = String(form.get('email') ?? '');
  return resendVerification({
    limit: () => consumeIdentifierAttempt(getPool(), 'verification-resend', email),
    send: async () => (await providerRequest('send-verification-email', { email })).ok,
    log: message => console.error(message),
    keepAlive: work => after(() => work),
  });
}

export async function requestRecoveryAction(_state: string, form: FormData): Promise<string> {
  const email = String(form.get('email') ?? '');
  return recoveryAcknowledgment(async () => {
    const client = await getPool().connect();
    let broken = true;
    try {
      if (await consumeRecoveryAttempt(client, email)) {
        const baseURL = process.env.BETTER_AUTH_URL!;
        const origin = new URL(baseURL);
        if (!['http:', 'https:'].includes(origin.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Invalid auth origin');
        const port = Number(process.env.AUTH_SMTP_PORT ?? '1025');
        if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid SMTP port');
        await requestPasswordRecovery(client, email, origin.origin, async (recipient, url) => {
          await sendPasswordRecoveryMail(port, recipient, url);
        });
      }
      broken = false;
    } finally { client.release(broken); }
  });
}

export async function resetPasswordAction(_state: string, form: FormData): Promise<string> {
  const token = String(form.get('token') ?? '');
  const password = String(form.get('password') ?? '');
  const confirmation = String(form.get('confirmation') ?? '');
  const valid = await validateResetPassword(password, confirmation, checkPasswordBlocklist);
  if (valid === 'password') return 'Choose a password of 12–1024 characters that is not common or compromised.';
  if (valid === 'confirmation') return 'Passwords do not match.';
  if (valid === 'retry') return 'Password reset is temporarily unavailable. Please try again later.';
  try {
    if (!await completePasswordRecovery(getPool(), token, password)) return 'This link is invalid or expired. Request another recovery link.';
  } catch { return 'Password reset could not be completed. Please try again later.'; }
  return 'Password reset complete. Sign in manually to continue.';
}
