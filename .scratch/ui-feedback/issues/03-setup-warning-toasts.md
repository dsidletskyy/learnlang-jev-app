# 03: Show setup warning toasts

**What to build:** Show a Sonner error toast when database or learning provider configuration prevents use of the app, while retaining visible instructions for recovery.

**Blocked by:** 01: Show dictionary entry success toasts.

**Status:** ready-for-agent

- [ ] An unavailable database produces an error toast and retains inline recovery instructions.
- [ ] Missing learning provider configuration produces an error toast and retains inline recovery instructions where the user starts a learning session.
- [ ] Error toasts remain visible until manually dismissed, fit the existing color theme, and are accessible, including inside modal dialogs.
- [ ] Automated tests cover both setup warning states and toast dismissal.
