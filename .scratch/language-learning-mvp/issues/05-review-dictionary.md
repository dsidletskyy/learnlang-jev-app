# 05: Review dictionary entries

**What to build:** A learner reviews their entire dictionary on the home screen and knows when it is empty or unavailable.

**Blocked by:** 04: Add and retain first dictionary entry

**Status:** ready-for-agent

- [ ] Display full multiline phrase, translation and language in stacked cards, newest creation first with a consistent ID tie-breaker; duplicates remain visible.
- [ ] Empty dictionary shows a welcome message and add action. Load failure instead shows an inline error instructing refresh, not the empty state or a retry button.
- [ ] Home offers prominent add and start-learning actions; no search or filtering is introduced.
- [ ] Browser tests cover ordering, duplicates, multiline display, empty and load-error states.
