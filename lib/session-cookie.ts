export const ABSOLUTE_SESSION_SECONDS = 30 * 24 * 60 * 60;

export function sessionCookieOptions(baseURL: string) {
  return {
    httpOnly: true, sameSite: 'lax' as const, secure: new URL(baseURL).protocol === 'https:', path: '/',
    // Server validation enforces the shorter sliding idle timeout.
    maxAge: ABSOLUTE_SESSION_SECONDS,
  };
}
