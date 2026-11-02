export async function validateResetPassword(password: string, confirmation: string, blocklist: (password: string) => Promise<'allowed' | 'blocked' | 'unavailable'>): Promise<'valid' | 'password' | 'confirmation' | 'retry'> {
  if (password.length < 12 || password.length > 1024) return 'password';
  if (password !== confirmation) return 'confirmation';
  try {
    const result = await blocklist(password);
    return result === 'allowed' ? 'valid' : result === 'blocked' ? 'password' : 'retry';
  } catch { return 'retry'; }
}

export async function recoveryAcknowledgment(
  run: () => Promise<void>,
  now: () => number = () => performance.now(),
  wait: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms)),
  log: () => void = () => console.error('Password recovery request failed'),
): Promise<string> {
  const started = now();
  try { await run(); } catch { log(); }
  await wait(Math.max(0, 10_000 - (now() - started)));
  return 'If recovery is available, a link will be sent to the local inbox.';
}
