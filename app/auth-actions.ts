'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDatabase, getPool } from '../db';
import { createLocalAuth } from '../lib/auth';
import { checkPasswordBlocklist } from '../lib/auth-password-blocklist';
import { consumeIdentifierAttempt, type AuthLimitOperation } from '../lib/auth-identifier-rate-limit';
import { register, signIn } from '../lib/auth-entry-policy';

const genericSignIn = 'Unable to sign in. Check your details and verification, then try again.';
const registrationAcknowledgment = 'If registration can be completed, a verification link will be sent to the local inbox.';

async function providerRequest(path: string, body?: object, cookie?: string) {
  const auth = createLocalAuth(await getDatabase());
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
    const response = await providerRequest('sign-in/email', input);
    if (!response.ok) return false;
    const sessionCookie = response.headers.getSetCookie().find(value => /^(?:__Secure-)?better-auth\.session_token=/.test(value));
    if (!sessionCookie) return false;
    const pair = sessionCookie.split(';', 1)[0];
    const equals = pair.indexOf('=');
    (await cookies()).set(pair.slice(0, equals), decodeURIComponent(pair.slice(equals + 1)), {
      httpOnly: true, sameSite: 'lax', secure: new URL(process.env.BETTER_AUTH_URL!).protocol === 'https:', path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
    return true;
  }));
  if (!success) return genericSignIn;
  redirect('/');
}

export async function signOutAction() {
  try {
    const cookie = (await headers()).get('cookie') ?? '';
    const response = await providerRequest('sign-out', undefined, cookie);
    if (response.ok) {
      const store = await cookies();
      store.delete('better-auth.session_token');
      store.delete('__Secure-better-auth.session_token');
    }
  } catch { /* Keep the session cookie if server-side revocation fails. */ }
  redirect('/sign-in');
}

export async function resendVerificationAction(_state: string, form: FormData): Promise<string> {
  const email = String(form.get('email') ?? '');
  try {
    if (await consumeIdentifierAttempt(getPool(), 'verification-resend', email)) {
      await providerRequest('send-verification-email', { email });
    }
  } catch { /* Keep acknowledgment generic, including delivery and limiter failures. */ }
  return 'If verification is needed, a link will be sent to the local inbox.';
}
