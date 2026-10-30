# 01: Show dictionary entry success toasts

**What to build:** Show confirmation through the [shadcn Sonner component](https://ui.shadcn.com/docs/components/aria/sonner) when a dictionary entry is added, updated, or deleted.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Adding, updating, or deleting a dictionary entry shows a success toast with the relevant confirmation.
- [x] Each success toast disappears after 5 seconds, including deletion confirmations.
- [x] Toasts fit the existing color theme and are accessible.
- [x] Automated tests cover all three outcomes and their dismissal behavior.

## Comments

Validation: `pnpm check` passed; `tests/dictionary-confirmation.spec.ts` covers add, edit and delete confirmations and five-second dismissal across Chromium, Firefox and WebKit.
