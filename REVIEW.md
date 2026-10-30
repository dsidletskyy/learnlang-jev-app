# Test suite review

## Scope and verdict

Reviewed test implementation, architecture, and coverage against `.scratch/language-learning-mvp/spec.md` and relevant test and UI issues. Verdict: useful functional coverage, with isolation and maintenance weaknesses. No whole test file is clearly safe to delete without losing required coverage; several individual tests or assertions can be removed or consolidated.

## Findings

### Medium: Browser tests share mutable database state

`playwright.config.ts` resets once at server startup; most browser files do not reset between tests. For example, `tests/action-error-toasts.spec.ts` and `tests/learning-session.spec.ts` add entries without cleanup. `tests/dictionary-review.spec.ts` and `tests/learning-configured.spec.ts` use per-test resets, showing inconsistent isolation. Serial execution prevents concurrent writes, not order dependence: a failed test can leave data that affects later tests or reruns. Use a shared, validated per-test reset fixture for database-mutating suites; continue serializing resets.

### Low: Real-time expiry and timeout tests extend feedback loop

Several toast tests wait up to 6.5 seconds in real time, including `tests/action-error-toasts.spec.ts` and `tests/learning-error-toasts.spec.ts`, across three browsers. `tests/unit/meaning-match.test.mjs` waits 30 seconds and leaves its 31-second race timer running. These checks are meaningful, but clock control or an injectable timeout can make them deterministic and faster. Preserve at least one check of the actual timeout configuration if injecting it.

### Low: Browser safety checks run three times without browser interaction

`tests/database-safety.spec.ts:4` launches the same Node process under each browser project, although it uses no browser. Keep its distinct integration-script safety coverage, but move it to `tests/isolation/` rather than removing it. Reset-script safety tests exercise a different entry point and are not substitutes.

## Removal and consolidation candidates

- Remove the two absence assertions for old scaffold labels in `tests/bootstrap.spec.ts:6-7`. They protect obsolete development copy, not a current requirement. The remaining heading check overlaps `tests/database-ready.spec.ts` and other home-page tests; after confirming those assertions, the entire bootstrap test can be removed. The original bootstrap issue describes broader setup requirements, but these assertions do not verify them.
- Consolidate `tests/action-error-toasts.spec.ts:43` into `tests/dictionary-confirmation.spec.ts:3`: both verify the add-success toast appears and expires. Retain the `data-type` and no-close-button checks only if those are still product requirements; preserve timing and accessibility coverage.
- Consolidate the simple failure scenario in `tests/learning-error-toasts.spec.ts:24` into the more specific regression at line 42, adding an assertion for preserved answer if deleting the former. The latter exercises validation, provider failure, edit, expiry, and persistent guidance; it currently does not assert the answer value after failure.
- Avoid deleting `tests/interface-spacing.spec.ts` merely because it checks pixels: `.scratch/interface-spacing/issues/01-consistent-field-and-button-spacing.md` explicitly specifies those gaps and requires tests. Likewise, safety, score-contract, and cross-browser keyboard tests cover explicit requirements.

## Coverage and architecture

Strong coverage includes real isolated PostgreSQL, SDK request contract and translation exclusion, score normalization, provider failure/retry, snapshots, cancellation, and keyboard/browser behavior. `tests/learning-configured.spec.ts` is 757 lines and mixes many scenarios; split by behavior and extract small user-level helpers, without hiding scenario intent or sharing mutable state. Unit tests of validation and scoring complement browser coverage rather than duplicating it.

No coverage instrumentation or full browser run was performed, so this review does not claim exhaustive coverage or identify all gaps. `pnpm test:isolation` passed 6 tests; `pnpm test:unit` passed 5 tests. Browser and database integration suites were not run.

## Review limitations

The requested `code-reviewer` skill references a `project-docs` skill and `docs/templates/artifacts/review-report.artifact.md`; neither was found at the referenced locations. This report uses a straightforward substitute format. No live Jev scoring-quality claim is made.
