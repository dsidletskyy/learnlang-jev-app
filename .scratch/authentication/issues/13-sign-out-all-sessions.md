# 13: Sign out all sessions

**What to build:** A signed-in user can revoke every active session and must sign in again on each device or browser context.

**Blocked by:** 10: Verified accounts and private dictionaries.

**Status:** ready-for-agent

- [ ] Provide a signed-in action that revokes all server-side sessions for the current account, including the current session, without affecting other accounts.
- [ ] Subsequent protected navigation and actions in revoked sessions require sign-in and cannot mutate entries or invoke scoring.
- [ ] Multi-context tests verify revocation, account isolation and subsequent manual sign-in.

Source: [authentication spec](../spec.md).
