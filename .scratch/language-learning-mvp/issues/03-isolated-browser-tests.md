# 03: Run isolated browser tests

**What to build:** Run browser tests against the app and a dedicated test PostgreSQL container, without risking personal data or calling the real Jev service.

**Blocked by:** 02: Start persistent local PostgreSQL

**Status:** ready-for-agent

- [ ] Provide separate test database credentials, container and volume; require explicit test-only configuration and serialize database-resetting tests.
- [ ] Verify the connected database is the dedicated test target before reset; fail closed on personal, unavailable or unrecognized targets, with an automated negative test that does not touch personal data.
- [ ] Playwright exercises a running app; tests fail closed if the Jev substitute is misconfigured and require no live API key.
- [ ] Document test prerequisites and safe test-container lifecycle commands that never remove the personal database or volume.
