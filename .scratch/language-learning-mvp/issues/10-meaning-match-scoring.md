# 10: Score a differently worded answer

**What to build:** A learner receives an estimated meaning-match score for a non-exact answer without sending the translation to Jev.

**Blocked by:** 08: Start an exact-match learning session

**Status:** resolved

- [x] Use official TypeSafe JavaScript SDK behind a substitutable server-side boundary, with Jev Score and jev-latest. Send only the original phrase, answer and original language as task data; keep the API key server-side and never send the translation.
- [x] Use the three rubric levels specified in the MVP; validate finite scores within 0–2 and normalize with round(score / 2 * 100). Show a neutral estimated percentage, with no explanation, threshold or app-side penalty.
- [x] Each submission makes at most one provider attempt; disable automatic SDK retries where supported. No provider request occurs at startup or for exact matches.
- [x] Test the actual outbound SDK request with a controllable substitute, including translation exclusion; deterministically cover score endpoints, midpoint, rounding and invalid values. Never call live Jev in automated tests.
- [x] Do not log phrases, answers or keys by default; do not claim live scoring quality has been verified.

## Comments

Evidence: `lib/meaning-match.ts`, `app/meaning-match-actions.ts`, `tests/unit/meaning-match.test.mjs`, and `tests/isolation/` cover scoring and the substitute boundary. Live Jev scoring quality was not verified.
