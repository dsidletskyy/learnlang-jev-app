# 04: Organize learning tests and verify full suite

**What to build:** Developers can navigate learning-session tests by behavior and trust the complete updated local check.

**Blocked by:** 01: Adopt Chromium-only browser verification; 03: Keep focused coverage with faster tests.

**Status:** resolved

- [x] Split the large learning-session browser spec into coherent behavior-focused files and use small helpers only where they clarify scenarios.
- [x] Preserve all distinct required learning, keyboard, responsive, scoring, recovery, snapshot, and session-exit behavior coverage.
- [x] Run the complete updated aggregate check, including lint, typecheck, unit, isolation, Chromium browser, and database integration checks; record exact results or blockers.
- [x] Verify documentation matches actual test commands, safety limitations, and Chromium-only support target.

## Comments

Final integration commit `dcb6b89`: `pnpm check` passed in 2m14s (lint, typecheck, 8 unit tests, 13 isolation tests, 58 browser tests, retry harness, database integration). Main browser suite also passed with `--fail-on-flaky-tests`.
