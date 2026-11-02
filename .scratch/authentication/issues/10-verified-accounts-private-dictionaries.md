# 10: Verified accounts and private dictionaries

**What to build:** Open registration, local inbox verification and manual sign-in give each verified account a private dictionary and learning experience. Existing entries survive but remain unowned and invisible. This slice must not expose protected features before ownership enforcement is in place. Follow the authoritative authentication spec, including its security and testing decisions; escalate if the pinned provider cannot meet them.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Pin and validate compatible Better Auth, Next.js and Drizzle versions; explicitly migrate provider persistence and nullable entry ownership without automatically assigning legacy entries.
- [ ] Registration and initial verification use a loopback-only local inbox; verification expires after 24 hours, is single-use, does not create a session, and delivery failure leaves the account unverified. Show inbox access and shared-inbox limitations.
- [ ] Verified users can sign in and sign out of their current server-side session; unverified users cannot sign in. Enforce seven-day idle and 30-day absolute session expiry, specified cookie attributes, CSRF and origin protections.
- [ ] Enforce the specified password policy and versioned local blocklist, including fail-closed creation when unavailable while existing sign-in remains possible. Apply generic responses and specified per-identifier registration and sign-in limits.
- [ ] New entries derive ownership from the session; all dictionary and learning reads and writes enforce ownership. Other-account, unowned and nonexistent entries are indistinguishable. Existing unowned entries stay hidden while new accounts work normally.
- [ ] Meaning-match scoring accepts entry ID and answer, loads the owned phrase and language server-side, and makes no external request for rejected access. Disclose external scoring for non-exact answers.
- [ ] Unauthenticated navigation redirects to sign-in; expired sessions reject protected actions without mutation or scoring and preserve unsaved input where practical.
- [ ] Adapt existing browser, accessibility and isolation suites to authenticated use; cover two accounts, legacy entries, forged requests, session expiry, security controls and local-only service bindings using isolated test resources.
- [ ] Cover link expiry and replay, generic responses, throttling, blocklist and delivery failures, cookie and origin protections, and absence of secret links in responses or logs at suitable integration seams.

Source: [authentication spec](../spec.md).
