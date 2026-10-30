# 01: Adopt Chromium-only browser verification

**What to build:** Developers run browser checks only in Chromium and see an accurate Chromium-only support statement and setup instructions.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Browser suites run only the Chromium project; remove Firefox and WebKit setup requirements.
- [x] Update durable MVP browser-target and verification requirements and local documentation; do not claim testing proves support for other Chromium-based browsers.
- [x] Preserve keyboard, responsive, safety, and other required behavior checks in Chromium; do not claim automated accessibility conformance.
- [x] Verify the updated browser test inventory and document any test environment blockers.
