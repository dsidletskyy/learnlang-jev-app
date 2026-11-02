export async function validateResetPassword(password: string, confirmation: string, blocklist: (password: string) => Promise<'allowed' | 'blocked' | 'unavailable'>): Promise<'valid' | 'password' | 'confirmation' | 'retry'> {
  if (password.length < 12 || password.length > 1024) return 'password';
  if (password !== confirmation) return 'confirmation';
  try {
    const result = await blocklist(password);
    return result === 'allowed' ? 'valid' : result === 'blocked' ? 'password' : 'retry';
  } catch { return 'retry'; }
}
