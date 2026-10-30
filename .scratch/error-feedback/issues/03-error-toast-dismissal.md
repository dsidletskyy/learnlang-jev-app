# 03: Dismiss non-validation error toasts automatically

**What to build:** Show non-validation errors in temporary toasts without an overlapping close button. Keep setup and recovery guidance available after its toast disappears.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Non-validation error toasts, including database and learning-provider setup warnings, automatically close after 5 seconds.
- [x] Error toasts have no close button and their content remains unobstructed.
- [x] Existing setup and recovery guidance remains available after the toast closes.
- [x] Success toast appearance and behavior remain unchanged.
- [x] Automated tests cover expiry and retained guidance.
