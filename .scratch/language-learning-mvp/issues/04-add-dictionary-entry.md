# 04: Add and retain first dictionary entry

**What to build:** A learner adds an original phrase, its language and translation to their personal dictionary, then sees it after reloading.

**Blocked by:** 03: Run isolated browser tests

**Status:** resolved

- [x] Add dialog accepts multiline original and translation and one of English, German, Italian, Russian, Slovak and Ukrainian, ordered by English name; shared checked-in ISO 639-1 language list drives UI and server validation.
- [x] Zod validates untrusted input; trim outer whitespace, reject empty values and enforce 2,000 Unicode code points per text field consistently on client and server. Inline errors preserve input.
- [x] Successful creation persists to PostgreSQL, closes the dialog, updates the home screen and shows confirmation; failures preserve input and show an inline error. Duplicates are allowed.
- [x] Dictionary operations work without Jev configuration; browser tests cover creation, persistence and validation against the isolated database.
- [x] State-changing operations use appropriate local origin safeguards; phrases and credentials are not logged by default.

## Comments

Evidence: `lib/dictionary-entry.ts`, `app/dictionary-actions.ts`, and `tests/dictionary-entry.spec.ts` cover validation, persistence, and failure recovery.
