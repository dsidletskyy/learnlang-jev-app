# 09: Finish and review a learning session

**What to build:** After advancing past the final feedback screen, a learner reviews the completed session and chooses what to do next.

**Blocked by:** 08: Start an exact-match learning session

**Status:** resolved

- [x] Show each translation, answer, saved original and whole-number meaning-match score in session order, plus the rounded arithmetic mean of displayed scores.
- [x] Offer return to dictionary and starting another session through language selection.
- [x] Keep sessions and summaries in browser memory only; leaving or refreshing discards them, with no persistent history.
- [x] Browser tests verify summary content, average, navigation and discarded progress.

## Comments

Evidence: `app/dictionary.tsx` and `tests/learning-configured.spec.ts` cover summary content, navigation, and in-memory session lifetime.
