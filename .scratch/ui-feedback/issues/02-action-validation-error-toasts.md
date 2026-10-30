# 02: Show action and validation error toasts

**What to build:** Show a Sonner error toast when a dictionary entry or learning session action fails, or when submitted input fails validation. Help users identify and correct invalid fields.

**Blocked by:** 01: Show dictionary entry success toasts.

**Status:** resolved

- [x] Failed dictionary entry saves and deletions, learning session loading, and answer evaluation show an error toast with useful recovery information.
- [x] Invalid submitted fields show an error toast and retain field-specific inline guidance.
- [x] Error toasts remain visible until manually dismissed and fit the existing color theme.
- [x] Error feedback remains accessible, including when an action occurs inside a modal dialog.
- [x] Automated tests cover representative dictionary entry and learning session errors, validation, and toast dismissal.

## Comments

Validation: `pnpm check` passed; `tests/action-error-toasts.spec.ts` and `tests/learning-error-toasts.spec.ts` cover action failures, validation, inline guidance and dismissal across Chromium, Firefox and WebKit.
