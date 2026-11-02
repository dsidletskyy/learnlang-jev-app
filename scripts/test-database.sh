#!/bin/sh
set -eu
node tests/integration/dictionary-ownership-migration.mjs
node --conditions=react-server --test tests/integration/assign-legacy-entries.mjs
node --conditions=react-server --test tests/integration/dictionary-owner-access.mjs
node tests/integration/better-auth-persistence.mjs
node --conditions=react-server --test tests/integration/auth-foundation.mjs tests/integration/session-expiry.mjs tests/integration/verification-lifecycle.mjs tests/integration/protected-scoring-isolation.mjs tests/integration/recovery-sign-in-race.mjs
node --test tests/integration/auth-identifier-rate-limit.mjs tests/integration/password-recovery.mjs tests/integration/password-recovery-contention.mjs
node tests/integration/database.mjs
