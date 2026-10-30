# 02: Isolate and protect database test runs

**What to build:** Each database-mutating browser test starts with a clean dedicated database, while supported test commands prevent destructive cross-run interference and protect personal data.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Apply migrations once per relevant suite invocation and reset before each database-mutating test and retry; avoid resetting for unavailable-database tests.
- [x] Before each destructive reset, fail closed on unsafe, unavailable, or unrecognized targets; preserve existing dedicated container, loopback, volume, connection, and database identity checks and explicit table allowlist.
- [x] Keep browser tests serial; make conflicting documented database-using commands fail fast, including browser and database integration workflows. Aggregate commands must not self-deadlock; locks must release on failure or termination.
- [x] Add automated negative tests for guards and tests for conflicting commands and lock release, without touching personal data; preserve independent safety coverage for each destructive entry point.
- [x] Demonstrate clean state after earlier tests and failed attempts or equivalent retry evidence.
- [x] Document supported command protection and that direct Playwright invocations and manual database access remain outside it.
