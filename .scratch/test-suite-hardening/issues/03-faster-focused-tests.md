# 03: Keep focused coverage with faster tests

**What to build:** Developers get faster test feedback without losing required confirmation, recovery, scoring, or safety behavior coverage.

**Blocked by:** 02: Isolate and protect database test runs.

**Status:** resolved

- [x] Remove obsolete bootstrap scaffold checks and consolidate overlapping success-toast and learning-evaluation failure tests only where distinct behavior assertions are retained.
- [x] Preserve five-second confirmation and error expiry, required no-close-button behavior, accessibility, retained guidance, and answer preservation.
- [x] Replace lengthy real-time toast and scoring timeout waits with controlled timing; test stalled response handling and verify production timeout remains 30 seconds without changing application behavior.
- [x] Move browser-independent database-integration safety checks to Node-level tests without losing distinct destructive-entry-point refusal coverage.
- [x] Run relevant tests and report evidence; no live provider or personal database is used.
