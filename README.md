# Language Learning

A local, single-user dictionary and learning app. PostgreSQL runs in Docker; Next.js runs on your computer. Keep both local: there is no authentication. Revisit access controls before any remote deployment. Non-exact answers are sent to TypeSafe Jev for scoring; exact matches are scored locally.

## Quickstart

Prerequisites: Node.js 24 LTS (see `.nvmrc`), Corepack, and Docker with Compose. Start Docker. With nvm, run `nvm install && nvm use`; check `node --version` is 24.x. Then install dependencies and create local configuration:

```sh
corepack enable
corepack prepare pnpm@10.34.9 --activate
pnpm install --frozen-lockfile
cp .env.example .env
```

In `.env`, replace the password placeholder in both values with the same local password using URL-safe characters. Never commit `.env`. The optional `TYPESAFE_API_KEY` is needed to start learning, not to use the dictionary. Set it to your own key and restart the app when ready; no preliminary provider request is made.

Start PostgreSQL, explicitly apply migrations, and start the host app:

```sh
docker compose up -d --wait
pnpm db:migrate
pnpm dev
```

Open http://127.0.0.1:3000, add a phrase, and refresh to see it retained. Start learning after configuring Jev. App startup never runs migrations; run `pnpm db:migrate` after updates too. For local production mode, run `pnpm build` and `pnpm start`.

### Storage and recovery

`docker compose stop` stops PostgreSQL without deleting its volume. Recreating the container preserves that volume. **Deleting the personal PostgreSQL volume deletes the dictionary**; do not run `docker compose down -v` unless you intend to delete it. Persistent storage is not a backup; backup and restore are not provided.

- Docker unavailable: start Docker and retry `docker compose up -d --wait`; check its output and that port 54329 is free.
- Database not ready or migration fails: check Docker status and `.env`, then run `pnpm db:migrate` and refresh. Changing `POSTGRES_PASSWORD` does not change credentials in an existing volume; restore the original password rather than deleting data.
- Missing Jev configuration: set `TYPESAFE_API_KEY` in `.env` and restart Next.js. Dictionary use remains available without it. An invalid key is reported when a non-exact answer is evaluated.
- Missing browser binaries during tests: run `pnpm exec playwright install chromium firefox webkit`; on Linux consult `pnpm exec playwright install --help` for system dependencies.

## Checks

Tests use a dedicated test container, volume, credentials and port, never the personal database. Start Docker, install all three Playwright browsers as above, and run:

```sh
docker compose -f compose.test.yaml up -d --wait
export TEST_DATABASE_URL=postgresql://language_test:language_test_password@127.0.0.1:55432/language_test
export JEV_TEST_URL=http://127.0.0.1:3101
pnpm check
```

`pnpm check` runs the individual commands below:

```sh
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:isolation
pnpm test
pnpm test:database
```

`pnpm test` runs Chromium, Firefox and WebKit browser suites, including a database-unavailable recovery suite. Browser tests reset the dedicated database after checking its container, volume, connection and database identity. `pnpm test:database` migrates and writes to the dedicated database and recreates only its container to check persistence. Run database-resetting suites serially, not concurrently. Ensure ports 3100, 3101 and 55432 are free. No live Jev key is required: tests use a loopback substitute, with outbound connections blocked in the test app; invalid substitute configuration fails closed.

Stop or remove **only** test resources with:

```sh
docker compose -f compose.test.yaml stop
# Optional: remove test container and test volume only
# docker compose -f compose.test.yaml down -v
```

Never substitute the personal Compose file in test lifecycle commands.

## Local security boundary

`pnpm dev` and `pnpm start` bind Next.js to `127.0.0.1`; PostgreSQL publishes its port on loopback only. State changes use Next.js Server Actions, which check request origin against host by default. There are no route handlers. Database access and Jev calls stay server-side. This is not protection against other users or software with access to your computer or database, and it is not a public deployment configuration.
