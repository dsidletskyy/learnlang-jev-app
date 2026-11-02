type ResendDependencies = {
  limit: () => Promise<boolean>;
  send: () => Promise<boolean>;
  log: (message: string) => void;
};

export async function resendVerification(deps: ResendDependencies): Promise<string> {
  try {
    if (await deps.limit() && !await deps.send()) deps.log('Verification resend unavailable');
  } catch {
    deps.log('Verification resend unavailable');
  }
  return 'If verification is needed, a link will be sent to the local inbox.';
}
