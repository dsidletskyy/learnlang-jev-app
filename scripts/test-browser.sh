#!/bin/sh
set -eu
pnpm exec playwright test
node --test tests/retry-isolation/harness.test.mjs
pnpm exec playwright test --config=playwright.learning.config.ts
pnpm exec playwright test --config=playwright.unavailable.config.ts
