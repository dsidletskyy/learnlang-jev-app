type ResendDependencies = {
  limit: () => Promise<boolean>;
  send: () => Promise<boolean>;
  log: (message: string) => void;
  keepAlive?: (work: Promise<void>) => void;
};

export async function resendVerification(deps: ResendDependencies, deadlineMs = 3000): Promise<string> {
  let expired = false;
  const deadline = new Promise<void>(resolve => setTimeout(() => { expired = true; resolve(); }, deadlineMs));
  // Catch late failures too; do not start delivery if the rate limit completed after the deadline.
  const work = (async () => {
    try {
      if (await deps.limit() && !expired && !await deps.send()) deps.log('Verification resend unavailable');
    } catch {
      deps.log('Verification resend unavailable');
    }
  })();
  deps.keepAlive?.(work);
  await deadline;
  return 'If verification is needed, a link will be sent to the local inbox.';
}
