type ResendDependencies = {
  limit: () => Promise<boolean>;
  send: () => Promise<boolean>;
  log: (message: string) => void;
};

export async function resendVerification(deps: ResendDependencies, floorMs = 3000): Promise<string> {
  const started = performance.now();
  try {
    if (await deps.limit() && !await deps.send()) deps.log('Verification resend unavailable');
  } catch {
    deps.log('Verification resend unavailable');
  }
  await new Promise(resolve => setTimeout(resolve, Math.max(0, floorMs - (performance.now() - started))));
  return 'If verification is needed, a link will be sent to the local inbox.';
}
