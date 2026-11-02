import type { PoolClient } from 'pg';

type ResendDependencies = {
  acquire: () => Promise<PoolClient>;
  limit: (client: PoolClient) => Promise<boolean>;
  send: (client: PoolClient) => Promise<boolean>;
  log: (message: string) => void;
};

export async function resendVerification(deps: ResendDependencies, floorMs = 3000): Promise<string> {
  let started = performance.now();
  let client: PoolClient | undefined;
  try {
    client = await deps.acquire();
    // Pool waiting must not consume the account-dependent work's timing budget.
    started = performance.now();
    await client.query("SET lock_timeout = '200ms'");
    await client.query("SET statement_timeout = '200ms'");
    if (await deps.limit(client) && !await deps.send(client)) deps.log('Verification resend unavailable');
  } catch {
    if (!client) started = performance.now();
    deps.log('Verification resend unavailable');
  } finally {
    if (client) {
      let broken = true;
      try {
        await client.query('RESET lock_timeout');
        await client.query('RESET statement_timeout');
        broken = false;
      } catch { /* Discard connections whose settings could not be restored. */ }
      client.release(broken);
    }
  }
  await new Promise(resolve => setTimeout(resolve, Math.max(0, floorMs - (performance.now() - started))));
  return 'If verification is needed, a link will be sent to the local inbox.';
}
