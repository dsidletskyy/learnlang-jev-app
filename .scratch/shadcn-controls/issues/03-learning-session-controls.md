# 03: Update learning session controls

**What to build:** Let users select a language and submit answers using shadcn React Aria controls during a learning session.

**Blocked by:** 01: Configure shadcn and migrate buttons.

**Status:** ready-for-agent

- [ ] The learning session language selector uses shadcn Select and retains available languages and entry counts.
- [ ] The answer field uses shadcn Textarea and remains multiline; Ctrl+Enter and Command+Enter submit the answer.
- [ ] Controls preserve the existing color theme, keyboard operation, focus handling, validation guidance, and disabled or read-only behavior.
- [ ] Automated tests cover language selection, answer entry, keyboard submission, and relevant accessibility behavior.
- [ ] Coordinate overlapping changes with the existing UI feedback tickets without regressing their behavior.
