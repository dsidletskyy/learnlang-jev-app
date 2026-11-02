# 15: Document local authentication operations

**What to build:** A local operator can set up, maintain and recover the app while understanding account isolation and its limits.

**Blocked by:** 11: Resend verification; 12: Recover password; 13: Sign out all sessions; 14: Assign legacy entries.

**Status:** ready-for-agent

- [ ] Document local setup, configuration, explicitly run migrations, loopback-only mail services, inbox access, delivery troubleshooting and retry, and verified-account legacy assignment.
- [ ] Explain registration, verification, password blocklist availability, session expiry and revocation, and password recovery without exposing secret links.
- [ ] Explain shared inbox, machine and database access boundaries; verification proves shared-inbox access rather than external mailbox ownership. Disclose external provider use for non-exact meaning-match scoring.
- [ ] Verify documented instructions against the completed flows and configuration; do not imply migrations run automatically or that an administrative recovery bypass exists.

Source: [authentication spec](../spec.md).
