# Language Learning

A local dictionary and learning app with verified accounts and private dictionaries. PostgreSQL runs in Docker; Next.js runs on your computer. Keep both local: anyone with machine, database, or shared inbox access can bypass account privacy. This is not designed for remote deployment. Non-exact answers are sent to TypeSafe Jev for scoring; exact matches are scored locally.

## Quickstart

Prerequisites: Node.js 24 LTS (see `.nvmrc`), Corepack, Python 3, and Docker with Compose. Start Docker. With nvm, run `nvm install && nvm use`; check `node --version` is 24.x. Then install dependencies and create local configuration:

```sh
corepack enable
corepack prepare pnpm@10.34.9 --activate
pnpm install --frozen-lockfile
cp .env.example .env
```

In `.env`, replace the password placeholder in both values with the same local password using URL-safe characters. Set `BETTER_AUTH_URL` to the loopback origin you will open and `BETTER_AUTH_SECRET` to a random secret of at least 32 characters (for example, generate one with `openssl rand -hex 32`). Never commit `.env` or share the secret. `AUTH_SMTP_PORT` defaults to 1025; SMTP always connects to 127.0.0.1. The optional `TYPESAFE_API_KEY` is needed to start learning, not to use the dictionary. Set it to your own key and restart the app when ready; no preliminary provider request is made.

Start PostgreSQL, explicitly apply migrations, and start the host app:

```sh
docker compose up -d --wait
pnpm db:migrate
pnpm dev
```

Open http://127.0.0.1:3000, register, verify using the shared local inbox, and sign in. Add a phrase and refresh to see it retained. Legacy entries remain unowned and hidden. Start learning after configuring Jev. App startup never runs migrations; run `pnpm db:migrate` after updates too. For local production mode, run `pnpm build` and `pnpm start`.

### Accounts and local inbox

Compose starts Mailpit at http://127.0.0.1:8025, with SMTP on 127.0.0.1:1025. Both published ports bind to loopback; do not expose them through a network proxy. Open registration uses an email as an account identifier; messages go to this shared inbox, not an external mailbox. Verification proves access to the shared inbox, not ownership of an external mailbox. Anyone with inbox access can read links and recover any account. Keep links and tokens out of logs, screenshots, and support messages.

After registration, open the verification message in Mailpit and follow its link. Links expire after 24 hours. Verification does not sign you in: return to sign-in manually. If a link is missing, invalid, or expired, use the verification resend form on the sign-in or verification page. Earlier unexpired verification links remain valid after a resend, even if delivery fails. Generic registration and resend acknowledgments do not confirm account existence or delivery; unverified accounts cannot sign in.

Passwords must be 12–1024 characters; spaces and Unicode are supported. Common or compromised passwords in the versioned local `data/password-blocklist/ncsc-100k-v1.txt` are rejected. This finite list is not a complete breach corpus. Keep the file intact: if missing or modified, registration and password reset fail safely with a retry error; existing sign-in still works. Restore the exact file from the release and retry.

Sessions expire after seven days of inactivity and at most 30 days after creation. **Sign out** revokes the current session; **Revoke all sessions** revokes every session including the current one. If revocation reports failure, retry; sessions may still be active. Sign in again after expiry or revocation. Temporary per-identifier limits allow five sign-in attempts and three requests each for registration, verification resend, and recovery per 15 minutes. Wait and retry when limited; these are not permanent lockouts and rotating identifiers can evade them.

If mail is missing, check that Docker and the Compose inbox are running (`docker compose ps`), inspect the inbox UI and app terminal for safe delivery errors, and confirm `AUTH_SMTP_PORT` matches the loopback SMTP port. Restart the app after configuration changes. Once fixed, request another verification or recovery message, respecting rate limits. Delivery failures do not verify accounts or provide a bypass; app acknowledgments can remain generic even when mail fails. Do not copy secret links into troubleshooting output.

### Assign legacy entries

Legacy entries stay hidden until an operator explicitly assigns them. After migration and account verification, obtain the intended account ID from the local database (for example, `SELECT id, email, email_verified FROM "user";`). Run:

```sh
node --env-file-if-exists=.env scripts/assign-legacy-entries.mjs ACCOUNT_ID
```

The operation assigns only currently unowned entries to that verified account, in one transaction. Existing owned entries remain untouched. If it fails, correct the problem and retry; no backup is required. Normal account use does not depend on assignment.

### Storage and recovery

`docker compose stop` stops PostgreSQL without deleting its volume. Recreating the container preserves that volume. **Deleting the personal PostgreSQL volume deletes the dictionary**; do not run `docker compose down -v` unless you intend to delete it. Persistent storage is not a backup; backup and restore are not provided.

- Docker unavailable: start Docker and retry `docker compose up -d --wait`; check its output and that port 54329 is free.
- Database not ready or migration fails: check Docker status and `.env`, then run `pnpm db:migrate` and refresh. Changing `POSTGRES_PASSWORD` does not change credentials in an existing volume; restore the original password rather than deleting data.
- Missing Jev configuration: set `TYPESAFE_API_KEY` in `.env` and restart Next.js. Dictionary use remains available without it. An invalid key is reported when a non-exact answer is evaluated.
- Missing browser binaries during tests: run `pnpm exec playwright install chromium`; on Linux consult `pnpm exec playwright install --help` for system dependencies.

## Checks

Tests use a dedicated test container, volume, credentials and port, never the personal database. Start Docker, install Playwright Chromium as above, and run:

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

`pnpm test` runs Chromium browser suites, including keyboard, responsive and database-unavailable recovery checks. Chromium is the sole supported browser target; these results do not establish support for other Chromium-based browsers or accessibility conformance. Browser tests migrate once per suite and reset before each test and retry, after checking the dedicated container, volume, connection and database identity. `pnpm test:database` migrates and writes to the dedicated database and recreates only its container to check persistence. `pnpm check`, `pnpm test`, and `pnpm test:database` share a fail-fast lock: stop any conflicting command and retry. Direct Playwright invocations and manual database access bypass this protection and must not run concurrently with these commands. The test proxy waits for upstream responses, including after browser disconnects, before each reset; upstream failures and drain timeouts block later resets. This assumes application database work completes before the response and does not cover post-response background work. Ensure ports 3100, 3101, 3102, 3103 and 55432 are free. No live Jev key is required: tests use a loopback substitute, with outbound connections blocked in the test app; invalid substitute configuration fails closed.

Stop or remove **only** test resources with:

```sh
docker compose -f compose.test.yaml stop
# Optional: remove test container and test volume only
# docker compose -f compose.test.yaml down -v
```

Never substitute the personal Compose file in test lifecycle commands.

## Local security boundary

`pnpm dev` and `pnpm start` bind Next.js to `127.0.0.1`; PostgreSQL and Mailpit publish ports on loopback only. State changes use Next.js Server Actions, which check request origin against host by default; email verification also uses an auth route handler. Session cookies are HttpOnly, host-only and SameSite=Lax, and Secure on HTTPS (local HTTP is an exception). Database access and Jev calls stay server-side. Account isolation does not protect against other users or software with access to your machine, database, or shared inbox. This is not a public deployment configuration.

### Password recovery

Use **Forgot password?** on the sign-in page, then check the local inbox. Recovery links expire after one hour and are single-use. An accepted later request invalidates earlier unused links, even if its delivery fails; request another after fixing delivery. A rejected request can leave earlier links valid. Enter and confirm the new password; input validation errors do not consume a valid link. Successful recovery changes the password, revokes all sessions, and requires manual sign-in. Recovery does not verify an unverified account. There is no administrative recovery bypass or external email recovery: shared inbox access is the recovery route.

Recovery acknowledgments wait at least 10 seconds for known, unknown, and throttled identifiers. SMTP delivery has a two-second deadline. Bounded database acquisition and lock waits may cause a generic temporary-failure response; retry later. Under rare account-specific database contention, a known account can receive that failure while an unknown identifier receives an acknowledgment, and slow operations may cause timing differences beyond the acknowledgment floor. Database access is outside the isolation boundary.
