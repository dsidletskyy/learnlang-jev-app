# 12: Leave an unfinished session safely

**What to build:** A learner can stop an unfinished learning session deliberately without accidental loss of progress or interference from late evaluation results.

**Blocked by:** 08: Start an exact-match learning session

**Status:** ready-for-agent

- [ ] Confirm exit from an unfinished session, including the last feedback screen before advancing to summary; cancellation of the confirmation preserves progress.
- [ ] Warn on refresh or browser close where supported; leaving or refreshing discards unfinished progress. Completed summary exits without warning.
- [ ] Confirmed exit during evaluation is immediate; cancel the request where practical and ignore late results. Provider processing or charges may still occur.
- [ ] Browser tests cover cancellation, confirmed exit, warnings where supported and ignored late responses; exercise scoring integration when available.
