# Local multi-user authentication

## Destination

An implementation-ready spec for local-only, email-and-password authentication with verification and password reset, private per-user dictionaries, and preservation of existing entries.

## Notes

Current stack: Next.js 16, React 19, PostgreSQL, Drizzle. Open registration; messages remain in a local mail catcher. Consult grilling and domain-modeling for decisions. Planning only; implementation follows separately. Local-only does not establish a security boundary against other users or software with machine or database access.

## Decisions so far

## Not yet specified

- Detailed authentication and session controls depend on the selected approach and research.
- Verification, recovery, delivery, and failure behavior need to be specified in light of local mail access and the chosen provider.
- Implementation handoff, testing, and operational safeguards depend on the architecture and migration decisions.

## Out of scope

- Public or private-network deployment; this effort targets local-only operation.
- Social login, passwordless login, and other authentication methods.
- Implementing the destination spec.
