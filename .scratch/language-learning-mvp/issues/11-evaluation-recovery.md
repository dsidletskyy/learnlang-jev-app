# 11: Recover from evaluation failure

**What to build:** A learner can recover from a failed meaning-match evaluation without losing an answer or consuming an attempt.

**Blocked by:** 10: Score a differently worded answer

**Status:** ready-for-agent

- [ ] Provider failures, invalid or unparseable scores, and out-of-range scores show actionable safe errors rather than incorrect-answer feedback; distinguish credential problems from temporary failures without exposing provider details.
- [ ] Keep the answer visible and editable after failure; retry requires explicit user action and may incur another provider charge.
- [ ] Show loading and prevent duplicate submissions during evaluation; enforce one 30-second timeout for the complete attempt including response handling.
- [ ] Tests cover invalid scores, failures, timeout, preserved input, manual retry and duplicate submission prevention using the substitute.
