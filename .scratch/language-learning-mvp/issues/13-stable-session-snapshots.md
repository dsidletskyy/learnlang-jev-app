# 13: Keep session snapshots stable across changes

**What to build:** Dictionary changes made after a learning session starts affect future sessions, not the learner's current prompts or saved originals.

**Blocked by:** 06: Edit a dictionary entry; 07: Delete a dictionary entry; 08: Start an exact-match learning session

**Status:** resolved

- [x] Editing or deleting entries after session start does not change that session's snapshot, feedback or summary; a later session reflects current entries.
- [x] Tabs maintain independent in-memory sessions and snapshots without synchronization.
- [x] Browser tests cover edits and deletions from another tab, independent sessions and stale language selection.

## Comments

Evidence: `app/dictionary.tsx` and `tests/learning-configured.spec.ts` cover snapshot stability, independent tabs, and stale language selection.
