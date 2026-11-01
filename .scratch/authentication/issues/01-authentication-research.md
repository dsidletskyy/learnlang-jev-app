# Research authentication approaches and security guidance

Type: research
Status: resolved
Blocked by: none

## Question

What current first-party and standards-based guidance and maintained authentication approaches support email/password, verification, reset, sessions, Next.js 16, PostgreSQL and Drizzle, including local email delivery? Compare relevant trade-offs and constraints without choosing for the user.

## Context pointer

[Research findings](https://github.com/dsidletskyy/learnlang-jev-app/blob/ef2b5f8/docs/research/local-authentication.md) on branch `research/local-authentication`, not merged.

## Answer

Better Auth provides integrated password, verification, reset and session features; Auth.js Credentials requires more application-owned lifecycle work and documents JWT-only sessions for that provider. Supabase Auth is a separate service; custom authentication leaves security design to the application. Mailpit can capture local authentication email. Compare operational and data-ownership trade-offs before choosing. Exact integration and security behavior require validation against pinned versions; NIST and OWASP reset guidance was checked only through primary-source search snippets.
