# Language Learning — local database foundation

This local Next.js app stores dictionary entries in PostgreSQL; practice features are not implemented yet. Keep the app and database local. Persistent storage is not a backup.

## Setup

Install Node.js 24 LTS (`.nvmrc`), Corepack, and Docker with Compose. Start Docker. With nvm, run `nvm install` and `nvm use`. Then:

```sh
corepack enable
corepack prepare pnpm@10.34.9 --activate
pnpm install --frozen-lockfile
cp .env.example .env
```

In `.env`, replace the password placeholder in both values with the same local password (use URL-safe characters). Do not commit `.env`. Start PostgreSQL and explicitly apply versioned migrations:

```sh
docker compose up -d --wait
pnpm db:migrate
pnpm dev
```

Open http://127.0.0.1:3000 and add a phrase to your dictionary. Reload to see it retained. Next.js runs on the host, bound to loopback; PostgreSQL's published port is also loopback-only. App startup never runs migrations. After updates, run `pnpm db:migrate` again. Dictionary use will not require a Jev key.

Stop PostgreSQL with `docker compose stop`; stopping or recreating its container preserves the personal volume. **Removing the personal volume deletes dictionary data.** Do not use `docker compose down -v` unless intentionally deleting it. Persistent storage is not a backup.

If Docker is unavailable, start Docker and retry. If the page reports the database is not ready, check `.env`, start the database, run the migration command, then refresh. A changed PostgreSQL password in `.env` does not change credentials in an existing volume; restore the original password rather than deleting data. For production-mode local use, run `pnpm build` then `pnpm start`.

## Checks

Browser tests require Chromium, Firefox, and WebKit: `pnpm exec playwright install chromium firefox webkit`. On Linux, see `pnpm exec playwright install --help` for system dependencies. The tests start a loopback-only server on port 3100; free that port if needed. Browser tests use a dedicated database; a separate recovery test forces an unavailable database.

The database integration test uses a separate container, volume, credentials and port. Start it and set its explicit test-only URL:

```sh
docker compose -f compose.test.yaml up -d --wait
export TEST_DATABASE_URL=postgresql://language_test:language_test_password@127.0.0.1:55432/language_test
export JEV_TEST_URL=http://127.0.0.1:3101
pnpm check
```

`pnpm check` runs `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:isolation`, `pnpm test`, and `pnpm test:database`. Playwright uses one worker and resets the test database before its run, after verifying the test container, volume, connection and database identity. Do not run multiple test suites concurrently. The loopback Jev substitute rejects scoring requests because scoring is not implemented yet. The test app blocks outbound Node TCP connections and does not need a live key; future scoring integration must use the substitute and preserve and test this fail-closed protection. Free ports 3100, 3101 and 55432 if occupied. The database test validates its explicit target and connected database identity before migrating or writing, then recreates only the test container to verify persistence. No live Jev key is needed. Stop the test database with `docker compose -f compose.test.yaml stop`; remove only its test volume with `docker compose -f compose.test.yaml down -v`. Never substitute the personal Compose file in test lifecycle commands.
