# 03: Show setup warning toasts

**What to build:** Show a Sonner error toast when database or learning provider configuration prevents use of the app, while retaining visible instructions for recovery.

**Blocked by:** 01: Show dictionary entry success toasts.

**Status:** resolved

- [x] An unavailable database produces an error toast and retains inline recovery instructions.
- [x] Missing learning provider configuration produces an error toast and retains inline recovery instructions where the user starts a learning session.
- [x] Error toasts remain visible until manually dismissed, fit the existing color theme, and are accessible, including inside modal dialogs.
- [x] Automated tests cover both setup warning states and toast dismissal.

## Comments

Validation: `pnpm check` passed; `tests/database-not-ready.spec.ts` and `tests/learning-session.spec.ts` cover setup guidance, persistence, dialog cancellation, Escape, and dismissal across Chromium, Firefox and WebKit. Automated checks do not replace real assistive-technology testing.
