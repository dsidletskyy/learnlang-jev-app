#!/bin/sh
set -eu
pnpm exec playwright test
pnpm exec playwright test --config=playwright.learning.config.ts
pnpm exec playwright test --config=playwright.unavailable.config.ts
