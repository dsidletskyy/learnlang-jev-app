# 12: Leave an unfinished session safely

**What to build:** A learner can stop an unfinished learning session deliberately without accidental loss of progress or interference from late evaluation results.

**Blocked by:** 08: Start an exact-match learning session

**Status:** resolved

- [x] Confirm exit from an unfinished session, including the last feedback screen before advancing to summary; cancellation of the confirmation preserves progress.
- [x] Warn on refresh or browser close where supported; leaving or refreshing discards unfinished progress. Completed summary exits without warning.
- [x] Confirmed exit during evaluation is immediate; cancel the request where practical and ignore late results. Provider processing or charges may still occur.
- [x] Browser tests cover cancellation, confirmed exit, warnings where supported and ignored late responses; exercise scoring integration when available.

## Comments

Evidence: `app/dictionary.tsx` and `tests/learning-configured.spec.ts` cover exit confirmation, browser warnings, and late evaluation responses. Provider processing or charges may still occur after exit.
