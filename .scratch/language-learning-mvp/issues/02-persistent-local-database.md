# 02: Start persistent local PostgreSQL

**What to build:** Run a locally accessible PostgreSQL database in Docker and connect the app using server-side Drizzle access and explicit versioned migrations.

**Blocked by:** 01: Bootstrap local client and server

**Status:** resolved

- [x] PostgreSQL published ports bind only to the local computer; persistent Docker storage survives container recreation.
- [x] Provide an explicit migration command; app startup does not apply migrations automatically and reports a clear error when the database is not ready.
- [x] Document setup and warn that removing the personal volume deletes dictionary data; stopping the container does not.

## Comments

Evidence: `compose.yaml`, `db/`, `drizzle/`, `README.md`, and `tests/integration/database.mjs` cover local persistence and explicit migrations.
