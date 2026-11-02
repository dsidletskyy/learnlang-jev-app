# Local multi-user authentication

## Destination

An implementation-ready spec for local-only, email-and-password authentication with verification and password reset, private per-user dictionaries, and preservation of existing entries.

## Notes

Current stack: Next.js 16, React 19, PostgreSQL, Drizzle. Open registration; messages remain in a local mail catcher. Consult grilling and domain-modeling for decisions. Planning only; implementation follows separately. Local-only does not establish a security boundary against other users or software with machine or database access.

## Decisions so far

- [Research authentication approaches and security guidance](issues/01-authentication-research.md): Compared authentication approaches, security guidance and local email capture.
- [Choose authentication approach](issues/02-authentication-approach.md): Use Better Auth, subject to compatibility validation.
- [Define local mail access and recovery boundary](issues/03-local-mail-boundary.md): Shared loopback-only inbox for trusted local users; verification and recovery depend on inbox access.
- [Assign existing dictionary ownership](issues/04-existing-dictionary-ownership.md): Operator selects a verified account; legacy entries remain hidden until atomic assignment.
- [Define private dictionary access](issues/05-private-dictionary-enforcement.md): Authenticate and scope dictionary and learning operations to the account, including scoring.
- [Define account verification behavior](issues/06-verification-user-experience.md): Require verification before sign-in; expiring, resendable links and manual sign-in.
- [Define authentication and session security controls](issues/07-authentication-security-controls.md): Set password, session, reset, throttling and cookie requirements.
- [Define password recovery behavior](issues/08-password-recovery-behavior.md): Generic recovery flow with separate verification and fail-closed reset completion.
- [Define verification delivery failure behavior](issues/09-verification-delivery-failure.md): Keep accounts unverified, invalidate earlier links on resend, and allow safe retry.

## Not yet specified

- Provider compatibility and implementation details, including local mail setup, migration mechanics, operational safeguards, and tests, must be worked through in the spec and implementation. Escalate any inability to meet an existing decision rather than silently weakening it.

## Out of scope

- Public or private-network deployment; this effort targets local-only operation.
- Social login, passwordless login, and other authentication methods.
- Implementing the destination spec.
