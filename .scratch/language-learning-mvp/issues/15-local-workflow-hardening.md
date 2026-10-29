# 15: Harden local infrastructure and test workflows

**What to build:** A learner or developer can set up, check and recover the local application safely without risking personal dictionary data or calling Jev in tests.

**Blocked by:** 10: Score a differently worded answer; 14: Verify keyboard and narrow-window flows

**Status:** ready-for-agent

- [ ] Provide a complete quickstart covering prerequisites, Docker PostgreSQL, configuration, explicit migrations, host app startup, expected outcome and recovery for Docker, migrations, missing Jev configuration and browser binaries.
- [ ] Document individual lint, typecheck and test commands plus one aggregate check, test prerequisites and separate safe test-container lifecycle commands. Automated tests require no live Jev key.
- [ ] Verify test resets fail closed for personal, unavailable or unrecognized databases and provider substitutes fail closed; preserve automated negative coverage without touching personal data.
- [ ] Review local app and database binding and protections for state-changing requests, including any route handlers; keep server operations server-side and avoid authentication or public deployment.
- [ ] Document persistent storage versus backups and warn that deleting the personal database volume deletes the dictionary; no manual database-restart verification is required.
