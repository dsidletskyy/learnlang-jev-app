# 15: Harden local infrastructure and test workflows

**What to build:** A learner or developer can set up, check and recover the local application safely without risking personal dictionary data or calling Jev in tests.

**Blocked by:** 10: Score a differently worded answer; 14: Verify keyboard and narrow-window flows

**Status:** resolved

- [x] Provide a complete quickstart covering prerequisites, Docker PostgreSQL, configuration, explicit migrations, host app startup, expected outcome and recovery for Docker, migrations, missing Jev configuration and browser binaries.
- [x] Document individual lint, typecheck and test commands plus one aggregate check, test prerequisites and separate safe test-container lifecycle commands. Automated tests require no live Jev key.
- [x] Verify test resets fail closed for personal, unavailable or unrecognized databases and provider substitutes fail closed; preserve automated negative coverage without touching personal data.
- [x] Review local app and database binding and protections for state-changing requests, including any route handlers; keep server operations server-side and avoid authentication or public deployment.
- [x] Document persistent storage versus backups and warn that deleting the personal database volume deletes the dictionary; no manual database-restart verification is required.

## Comments

Evidence: `README.md`, `compose.yaml`, `compose.test.yaml`, `package.json`, and `tests/isolation/` document and exercise the local and test workflows. The implementer reported `pnpm check` passed after 9d965b8; automated tests do not call live Jev.
