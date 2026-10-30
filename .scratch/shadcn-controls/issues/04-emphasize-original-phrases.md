# 04: Emphasize original phrases

**What to build:** Make original phrases easy to identify in dictionary entries and learning session results.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Original phrases appear bold on dictionary entry cards, in learning session feedback, and in session summaries.
- [x] Translations and answers do not gain the same bold styling as part of this change.
- [x] During a learning session, the original phrase remains hidden until the answer has been evaluated.
- [x] Automated tests verify the affected views and preserve original phrase reveal timing.

**Validation:** Dictionary review and configured learning Playwright suites passed in Chromium, Firefox, and WebKit, including font-weight and reveal-timing assertions.
