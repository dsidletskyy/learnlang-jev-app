# 06: Edit a dictionary entry

**What to build:** A learner corrects any part of a dictionary entry without losing their input on failure.

**Blocked by:** 04: Add and retain first dictionary entry

**Status:** resolved

- [x] Shared add/edit dialog allows editing phrase, language and translation, with the same validation and multiline support; success refreshes the list and confirms the change.
- [x] Failed saves keep the dialog and input intact with an inline error. If another tab deleted the entry, explain that it no longer exists without recreating it.
- [x] Preserve creation time and list position on edit; concurrent edits use last successful save wins.
- [x] Browser tests cover successful edits, validation and failure recovery.

## Comments

Evidence: `app/dictionary-actions.ts` and `tests/dictionary-entry.spec.ts` cover editing, failure recovery, concurrent edits, and deleted entries.
