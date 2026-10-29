# 01: Bootstrap local client and server

**What to build:** Run a local-only Next.js App Router application whose client can reach a server operation, establishing the foundation for the personal dictionary.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Pin and document an active LTS Node.js major; use pnpm with a checked-in lockfile and verify the version during setup.
- [x] Start Next.js on the host with local-only binding; demonstrate a client-to-server operation without a separate backend.
- [x] Provide working lint and typecheck commands and a sample environment file without credentials; exclude real environment files.

## Comments

Evidence: `package.json`, `scripts/check-node.mjs`, `README.md`, and `tests/bootstrap.spec.ts` cover the local setup and client/server bootstrap.
