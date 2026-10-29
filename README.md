# Language Learning — local bootstrap

This is the local Next.js foundation only; dictionary and practice features are not implemented yet.

## Setup

Install Node.js 24 LTS (the supported major is pinned in `.nvmrc`) and enable Corepack. With nvm, run `nvm install` and `nvm use` in this directory. Install the pinned pnpm version and dependencies:

```sh
corepack enable
corepack prepare pnpm@10.34.9 --activate
pnpm install --frozen-lockfile
```

The install checks the Node.js major and fails unless it is 24. `.env.example` documents the currently required environment variables; none are needed for this bootstrap. Do not commit local `.env` files.

## Run

```sh
pnpm dev
```

Open http://127.0.0.1:3000 and select **Check server connection**. The confirmation is returned by a Next.js Server Action. Next.js runs directly on the host, bound to loopback only; it is not intended for remote deployment. For a production-mode local run, use `pnpm build` followed by `pnpm start`.

## Checks

Install the Chromium browser for the bootstrap browser test once:

```sh
pnpm exec playwright install chromium
pnpm check
```

`pnpm check` runs `pnpm lint`, `pnpm typecheck`, and `pnpm test`. The test starts its own loopback-only server on port 3100; free that port if it is already in use. If Playwright reports a missing browser, rerun the install command above. On Linux, Playwright may also require system dependencies: see `pnpm exec playwright install --help`.
