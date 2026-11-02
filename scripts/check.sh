#!/bin/sh
set -eu
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:isolation
sh scripts/test-browser.sh
sh scripts/test-database.sh
