export async function revokeCurrentSession(revoke: () => Promise<boolean>, clearCookie: () => Promise<void> | void): Promise<boolean> {
  try {
    if (!await revoke()) return false;
    await clearCookie();
    return true;
  } catch {
    return false;
  }
}
