import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sendVerificationMail } from './verification-mail';
import * as schema from '../db/schema';
import { ABSOLUTE_SESSION_SECONDS } from './session-cookie';
import { authOrigin, authSmtpPort } from './auth-configuration';

const DAY = 24 * 60 * 60;
const ABSOLUTE_SESSION_MS = ABSOLUTE_SESSION_SECONDS * 1000;

type AuthOptions = {
  baseURL: string;
  secret: string;
  sendVerification: (email: string, url: string) => Promise<void>;
};

// Do not publish the provider handler until auth policy and protected routes are complete.
export function createAuth(db: NodePgDatabase, options: AuthOptions) {
  const baseURL = authOrigin(options.baseURL);
  if (options.secret.length < 32) throw new Error('Auth secret must contain at least 32 characters');
  return betterAuth({
    baseURL: baseURL.origin,
    secret: options.secret,
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    emailAndPassword: { enabled: true, requireEmailVerification: true, minPasswordLength: 12, maxPasswordLength: 1024 },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      expiresIn: DAY,
      sendVerificationEmail: async ({ user, url }) => {
        try {
          await options.sendVerification(user.email, url);
        } catch {
          console.error('Verification email delivery failed');
        }
      },
    },
    session: { expiresIn: 7 * DAY, updateAge: 0, cookieCache: { enabled: false } },
    advanced: {
      useSecureCookies: baseURL.protocol === 'https:',
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', secure: baseURL.protocol === 'https:' },
    },
  });
}

export function createLocalAuth(db: NodePgDatabase, sendVerification?: AuthOptions['sendVerification']) {
  const baseURL = process.env.BETTER_AUTH_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!baseURL || !secret) throw new Error('Auth configuration unavailable');
  const port = authSmtpPort(process.env.AUTH_SMTP_PORT);
  return createAuth(db, {
    baseURL,
    secret,
    sendVerification: sendVerification ?? ((email, url) => sendVerificationMail(port, email, url)),
  });
}

export type Auth = ReturnType<typeof createAuth>;

export async function validatedSession(auth: Auth, headers: Headers) {
  const valid = (result: Awaited<ReturnType<typeof auth.api.getSession>>) => {
    if (!result || !result.user.emailVerified) return false;
    const now = Date.now();
    const created = result.session.createdAt.getTime();
    const expires = result.session.expiresAt.getTime();
    return Number.isFinite(created) && created <= now && now - created < ABSOLUTE_SESSION_MS && Number.isFinite(expires) && expires > now;
  };
  // Check expiry before provider refresh: provider accepts expiresAt equal to now.
  const current = await auth.api.getSession({ headers, query: { disableCookieCache: true, disableRefresh: true } });
  if (!valid(current)) return null;
  const refreshed = await auth.api.getSession({ headers, query: { disableCookieCache: true } });
  return valid(refreshed) ? refreshed : null;
}
