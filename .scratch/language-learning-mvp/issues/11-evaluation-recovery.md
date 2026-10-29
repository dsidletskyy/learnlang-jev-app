# 11: Recover from evaluation failure

**What to build:** A learner can recover from a failed meaning-match evaluation without losing an answer or consuming an attempt.

**Blocked by:** 10: Score a differently worded answer

**Status:** resolved

- [x] Provider failures, invalid or unparseable scores, and out-of-range scores show actionable safe errors rather than incorrect-answer feedback; distinguish credential problems from temporary failures without exposing provider details.
- [x] Keep the answer visible and editable after failure; retry requires explicit user action and may incur another provider charge.
- [x] Show loading and prevent duplicate submissions during evaluation; enforce one 30-second timeout for the complete attempt including response handling.
- [x] Tests cover invalid scores, failures, timeout, preserved input, manual retry and duplicate submission prevention using the substitute.

## Comments

Evidence: `app/meaning-match-actions.ts`, `tests/unit/meaning-match.test.mjs`, and `tests/learning-configured.spec.ts` cover evaluation errors, timeout, retry, and duplicate submission prevention.
