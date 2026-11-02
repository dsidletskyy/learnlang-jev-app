import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { createTransport } from 'nodemailer';
import * as schema from '../db/schema';

const DAY = 24 * 60 * 60;
const ABSOLUTE_SESSION_MS = 30 * DAY * 1000;

type AuthOptions = {
  baseURL: string;
  secret: string;
  sendVerification: (email: string, url: string) => Promise<void>;
};

// Do not publish the provider handler until auth policy and protected routes are complete.
export function createAuth(db: NodePgDatabase, options: AuthOptions) {
  const baseURL = new URL(options.baseURL);
  if (!['http:', 'https:'].includes(baseURL.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(baseURL.hostname) || baseURL.username || baseURL.password || baseURL.pathname !== '/' || baseURL.search || baseURL.hash) {
    throw new Error('Auth URL must be a loopback origin');
  }
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

export function createLocalAuth(db: NodePgDatabase) {
  const baseURL = process.env.BETTER_AUTH_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!baseURL || !secret) throw new Error('Auth configuration unavailable');
  const port = Number(process.env.AUTH_SMTP_PORT ?? '1025');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid local SMTP port');
  const transport = createTransport({ host: '127.0.0.1', port, secure: false, connectionTimeout: 3000, greetingTimeout: 3000, socketTimeout: 3000 });
  return createAuth(db, {
    baseURL,
    secret,
    sendVerification: async (email, url) => {
      await transport.sendMail({ from: 'Language Learning <auth@localhost>', to: email, subject: 'Verify your account', text: `Open this link to verify your account:\n\n${url}\n\nThis link expires in 24 hours.` });
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

export async function validatedSession(auth: Auth, headers: Headers) {
  const result = await auth.api.getSession({ headers, query: { disableCookieCache: true } });
  if (!result || !result.user.emailVerified) return null;
  const created = result.session.createdAt.getTime();
  if (!Number.isFinite(created) || created > Date.now() || Date.now() - created >= ABSOLUTE_SESSION_MS) return null;
  return result;
}
