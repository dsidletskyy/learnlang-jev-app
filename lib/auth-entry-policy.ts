type Credentials = { email: string; password: string };
type Dependencies = {
  limit: () => Promise<boolean>;
  blocklist: (password: string) => Promise<'allowed' | 'blocked' | 'unavailable'>;
  provider: () => Promise<boolean>;
};

export async function register(input: Credentials, deps: Dependencies): Promise<'acknowledged' | 'password' | 'retry'> {
  try {
    if (!await deps.limit()) return 'acknowledged';
    if (input.password.length < 12 || input.password.length > 1024) return 'password';
    const result = await deps.blocklist(input.password);
    if (result === 'unavailable') return 'retry';
    if (result === 'blocked') return 'password';
    await deps.provider();
    return 'acknowledged';
  } catch {
    return 'retry';
  }
}

export async function signIn(_input: Credentials, deps: Dependencies): Promise<boolean> {
  try {
    return await deps.limit() && await deps.provider();
  } catch {
    return false;
  }
}
