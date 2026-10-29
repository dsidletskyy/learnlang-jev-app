# 07: Delete a dictionary entry

**What to build:** A learner can safely remove a dictionary entry after seeing and confirming which phrase will be deleted.

**Blocked by:** 04: Add and retain first dictionary entry

**Status:** resolved

- [x] Accessible delete action opens a confirmation displaying the original phrase; Cancel preserves the entry and Delete removes it persistently.
- [x] Failed deletion shows an inline error; if another tab already deleted the entry, close confirmation and refresh without claiming a new deletion.
- [x] Browser tests cover confirmation, cancellation, successful deletion and already-deleted behavior.

## Comments

Evidence: `app/dictionary.tsx`, `app/dictionary-actions.ts`, and `tests/delete-dictionary-entry.spec.ts` cover confirmation, deletion, and failure cases.
