# Local multi-user authentication

Status: ready-for-agent

## Problem Statement

People sharing the local language-learning app currently share one dictionary without accounts. They cannot keep dictionary entries and learning sessions private from other app accounts, verify an email identifier, recover a forgotten password, or safely assign existing entries to their intended owner. Existing entries must survive the transition without being exposed to the first person who registers.

The app runs locally. Access to the machine, database, or shared local inbox remains outside the account isolation boundary; inbox access permits account recovery and therefore access to any account.

## Solution

Add open registration with email and password, local inbox verification, sign-in and sign-out, password recovery, and private per-account dictionaries. Require verification before sign-in. Users access only their own dictionary entries and learning sessions. An operator explicitly assigns existing unowned entries to a verified account; entries remain hidden until assignment succeeds. Keep app, database, and mail catcher local, and document the limits of this arrangement.

## User Stories

1. As a local user, I want to register with an email identifier and password, so that I can have my own account.
2. As a local user, I want open registration, so that I do not need an administrator to create my account.
3. As a registrant, I want to receive a verification link in the local inbox, so that I can verify my account.
4. As a registrant, I want clear instructions for accessing the local inbox, so that I can complete verification.
5. As a registrant, I want to understand that verification proves access to a shared inbox rather than an external mailbox, so that I understand its limitations.
6. As an unverified user, I want to request another verification link, so that I can recover from an expired or missing message.
7. As an unverified user, I want verification requests available without signing in, so that I can complete registration.
8. As a registrant, I want expired and invalid links rejected, so that they cannot verify my account. Reusing a valid link after verification may succeed without creating a session or triggering further side effects.
9. As a registrant, I want guidance and a resend option when verification fails, so that I can retry.
10. As a verified user, I want confirmation and a sign-in link after verification, so that I know what to do next.
11. As a verified user, I want to sign in manually after verification, so that verification does not silently create a session.
12. As an unverified user, I want the account to remain unverified when email delivery fails, so that verification cannot be bypassed.
13. As a user, I want generic verification-request responses, so that other people cannot readily discover whether my account exists.
14. As a verified user, I want to sign in with my email and password, so that I can access my dictionary.
15. As an unverified user, I want sign-in blocked until verification, so that protected features require a verified account.
16. As a user, I want generic sign-in and registration responses, so that account existence is harder to enumerate.
17. As a user, I want long passwords, spaces, and Unicode supported, so that I can choose a strong passphrase.
18. As a user, I want common or compromised passwords rejected, so that my account is less vulnerable to guessing.
19. As a user, I want existing sign-in to work when the password blocklist is unavailable, so that a blocklist outage does not lock me out.
20. As a user, I want password creation to fail safely when the blocklist is unavailable, so that weak passwords are not accepted unchecked.
21. As a user, I want sign-in attempts limited temporarily, so that repeated guessing is slowed without permanent lockout.
22. As a signed-in user, I want my session to expire after inactivity and an absolute maximum lifetime, so that old sessions do not last indefinitely.
23. As a signed-in user, I want to sign out of my current session, so that it cannot be reused.
24. As a signed-in user, I want to sign out of all sessions, so that I can revoke other sessions.
25. As a user who forgot a password, I want a recovery entry point on the sign-in page, so that I can request a reset.
26. As a user, I want recovery requests to receive generic acknowledgments, so that account existence is harder to discover.
27. As a user, I want a reset link in the local inbox, so that I can choose a new password.
28. As a user, I want reset links to expire, be single-use, and be superseded by later requests, so that stale links cannot reset my password.
29. As a user, I want to enter and confirm a new password, so that I can avoid a typing mistake.
30. As a user, I want to correct invalid password input without losing an otherwise valid reset link, so that I can complete recovery.
31. As a user, I want invalid reset links to show safe guidance and a way to request another, so that I can recover.
32. As a user, I want password reset to revoke all existing sessions and require manual sign-in, so that old sessions cannot survive recovery.
33. As an unverified user, I want password recovery to leave verification unchanged, so that recovery does not bypass verification.
34. As a user, I want recovery to fail safely if delivery or reset completion fails, so that no partial success compromises my account.
35. As a user, I want my dictionary to contain only my entries, so that other accounts' entries are not disclosed.
36. As a user, I want to add dictionary entries to my account, so that they remain private to my dictionary.
37. As a user, I want to edit and delete my own entries, so that I can manage my dictionary.
38. As a user, I want requests for another user's entry to behave like requests for a nonexistent entry, so that neither existence nor contents are disclosed.
39. As a user, I want learning sessions to use only entries from my dictionary, so that I practice my own phrases.
40. As a user, I want meaning-match scoring to use the stored phrase and language from my own entry, so that clients cannot score arbitrary or other users' entries.
41. As a user, I want to know non-exact answers may be sent to an external scoring provider, so that I understand that data leaves the machine.
42. As a user with an expired session, I want protected actions rejected and a prompt to sign in again, so that no unauthenticated changes or scoring calls occur.
43. As a user with unsaved input, I want it preserved where practical after session expiry, so that I can retry without unnecessary retyping.
44. As an unauthenticated visitor, I want protected page navigation to redirect to sign-in, so that I know authentication is required.
45. As an existing user, I want legacy entries preserved and hidden until explicitly assigned, so that they are not accidentally exposed or lost.
46. As an operator, I want to select a verified account by account ID and atomically assign all unowned entries, so that the intended account receives them safely.
47. As an operator, I want a failed assignment to leave entries unchanged and allow retry, so that partial migration cannot leak or lose data.
48. As an operator, I want already owned entries left untouched, so that assignment cannot reassign another user's dictionary.
49. As a new user, I want registration and my own dictionary to work while legacy assignment is pending, so that migration does not block normal use.
50. As an operator, I want local setup, migration, mail troubleshooting, and security limits documented, so that I can run and recover the app safely.
51. As a local user, I want to understand that anyone with shared inbox, machine, or database access can bypass account privacy, so that I do not mistake local authentication for a stronger security boundary.

## Implementation Decisions

- Use Better Auth with email/password and its PostgreSQL Drizzle integration. Pin and validate compatible versions against the project's Next.js and Drizzle versions before relying on provider behavior. Explicitly configure and verify every security requirement below; do not assume defaults satisfy them. If provider behavior cannot meet a decision, escalate rather than silently weaken it.
- Integrate authentication routes, protected page navigation, and server-side session checks with the existing app. Unauthenticated navigation redirects to sign-in; unauthenticated actions return a sign-in-again outcome without mutations or external scoring calls. Preserve unsaved input where practical, without promising persistence across reloads.
- Add account, session, credential, verification and other provider-required persistence through explicit migrations. Add nullable account ownership to dictionary entries so legacy rows remain unowned and hidden. New entries derive their owner exclusively from the server-validated session. Scope every dictionary and learning read and write by owner, including ID-based operations; treat unowned and other-account entries as nonexistent. Never trust a client-supplied owner ID.
- Change meaning-match scoring to accept an entry ID and answer, load the owned entry on the server, and use its stored original phrase and language. Reject unauthenticated, nonexistent, unowned, and other-account requests before any provider call. Preserve existing exact-match and learning behavior where compatible; non-exact scoring still sends data to the external provider.
- Provide an explicit operator-invoked assignment operation selecting an existing verified account by account ID. Atomically assign all currently unowned entries only; validate account eligibility and protect against races so failure leaves no partial assignment and retry is safe. Never automatically assign entries to a registrant or reassign owned entries. Normal use remains available while assignment is pending. A backup is not mandatory for this operation.
- Use a shared local mail catcher for verification and recovery. Bind both SMTP and inbox UI to loopback only, without network-accessible proxies. Email identifies an account; verification proves access to the shared inbox, not external mailbox ownership. Inbox access is the sole recovery route; no administrative bypass or external email delivery is included.
- Verification links expire after 24 hours. New requests do not invalidate earlier unexpired links, including when replacement delivery fails. Reusing a valid link after verification may report success but must not create a session or trigger further side effects. Unverified accounts cannot sign in or use protected features, but can request verification and password recovery. Provide unauthenticated resend from sign-in or verification screens. Invalid or expired links cannot verify or create sessions; show safe guidance and resend. Successful verification confirms completion and links to manual sign-in, without automatic sign-in.
- Reset links use cryptographically secure tokens, expire after one hour, are single-use, and each new request supersedes earlier unused links. Reset requires password and confirmation. Validation errors do not consume an otherwise valid link or change passwords or sessions. Successful reset must change the password, consume the link, and revoke all sessions atomically or with an equivalent fail-closed mechanism; never report success when any part fails. Require manual sign-in. Reset does not verify an unverified account.
- On verification or reset delivery failure, maintain safe account state and generic public acknowledgment, record a safe operational error without tokens or links, and allow rate-limited retry. Never put links in app responses or logs. Initial verification delivery failure leaves the account unverified. Do not bypass verification or recovery.
- Passwords have a minimum of 12 characters and support at least 64 characters, spaces, and Unicode without composition rules. Reject common or compromised passwords using a versioned local blocklist. If unavailable, fail closed with a safe retry error for registration and reset, while allowing existing sign-in. Validate password normalization, length handling, and supported slow salted hashing against the pinned provider.
- Sessions expire after seven days of inactivity and no later than 30 days after creation. Sign-out revokes the current server-side session; provide sign-out-all. Reset revokes all sessions. Validate idle and absolute expiry and revocation against the pinned provider; add enforcement if needed without weakening either limit.
- Reduce account enumeration across sign-in, registration, verification resend, and reset using generic responses and status codes and materially similar timing where practical. Apply temporary per-normalized-identifier limits equally to known and unknown identifiers: five sign-in attempts per 15 minutes, and three requests per operation per 15 minutes for registration, verification resend, and reset. No permanent lockout or client-wide cap is required; rotating identifiers can evade these limits. Shared inbox access can reveal account activity.
- Session cookies are HttpOnly, host-only, and SameSite=Lax; require Secure on HTTPS, with an explicit exception for local HTTP. Retain CSRF and origin protections for authentication routes and existing Server Actions. Keep local service bindings and secrets appropriately configured.
- Document local setup, configuration, explicit migration and verified-account assignment, local inbox access, delivery failures and retry, password blocklist availability, session behavior, recovery, and security boundaries. Do not expose secret links in operational guidance. Existing database migrations remain explicit rather than running on app startup.

## Testing Decisions

- Good tests assert externally observable behavior and security outcomes, not provider internals or component implementation details. Prefer existing high-level seams, with targeted lower-level integration tests only where browser observation cannot reliably establish guarantees.
- Use existing Playwright Chromium browser infrastructure with isolated browser contexts, dedicated test database, and local service substitutes. Cover registration, inbox verification and resend, sign-in, sign-out and sign-out-all, recovery, password validation, session expiry handling, and two-account dictionary and learning isolation. Include inaccessible legacy entries, unauthorized navigation and actions, safe errors, and input preservation where practical. Adapt existing dictionary, learning, accessibility, database readiness, and isolation suites to authenticated use.
- Exercise direct protected action requests and scoring through existing server boundaries, including forged entry IDs and client-supplied phrase or owner data. Assert other-account and nonexistent entries are indistinguishable and that rejected scoring makes no Jev request. Existing learning scoring tests and loopback Jev substitute provide prior art.
- Use database integration tests for migration preservation, verified-account selection, atomic assignment, race/failure rollback, retry, and preservation of owned entries. Existing isolated database integration and reset infrastructure provide prior art; never target the personal database.
- Exercise security lifecycle and failure paths at the highest practical integration seam: verification expiry, harmless replay, and earlier-link validity after resend including failed delivery; reset expiry, replay and supersession including failed delivery; generic responses and throttling for known and unknown identifiers; blocklist failure; idle and absolute session expiry; session revocation; reset validation and fail-closed completion. Use controlled time and injected failures where necessary. Verify cookie attributes, CSRF/origin protections, local-only mail bindings, and no token leakage in responses or logs.
- Preserve test isolation: dedicated database and mail resources, no live Jev or external email, safe reset between tests, and no background work that escapes the existing reset/drain guarantees. Existing test harness, database-isolation and retry-isolation tests are prior art.

## Out of Scope

- Public or private-network deployment, and protection against other users or software with machine, database, or shared inbox access.
- Social login, passwordless login, external email recovery, administrative recovery bypass, and automatic assignment of legacy entries.
- Implementation as part of this planning task; application changes follow separately.

## Further Notes

- Local authentication provides app-level account isolation only. Anyone who can read the shared inbox can obtain verification or reset links for any account.
- Provider compatibility and exact integration mechanisms remain implementation validation work. Escalate inability to satisfy an existing decision; do not silently relax security or lifecycle guarantees.
- Browser-level test seams and targeted integration coverage were confirmed with the user.
