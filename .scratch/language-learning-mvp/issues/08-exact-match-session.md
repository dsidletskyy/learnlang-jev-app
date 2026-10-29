# 08: Start an exact-match learning session

**What to build:** A learner selects an original language and recalls each matching phrase once from its translation, receiving immediate feedback for exact answers.

**Blocked by:** 04: Add and retain first dictionary entry

**Status:** ready-for-agent

- [ ] Language dialog lists only languages with entries and counts, alphabetically; missing Jev key blocks start with actionable configuration guidance, without revealing the key or checking provider availability.
- [ ] On confirmation fetch and snapshot matching entries, shuffle them, and show each once. If none remain, show empty-language state; loading failures preserve selection and allow retry.
- [ ] Practice screen shows language, position, read-only translation and multiline answer. Reject empty or over-2,000-code-point answers after trimming; button and Ctrl/⌘+Enter submit without preventing multiline input.
- [ ] Compare trimmed answers using default Unicode case conversion only; exact matches score 100 locally without a provider call. Show answer, saved original and score, then advance manually without another successful attempt.
- [ ] Browser tests cover selection, membership without assuming random order, input validation, shortcut, progress and exact matching.
