# 02: Validate learning-session answers without error toasts

**What to build:** When a user submits an invalid answer in a learning session, show clear feedback beside the answer field instead of an error toast. Match the destructive error-state styling in the [shadcn textarea invalid example](https://ui.shadcn.com/docs/components/aria/textarea#invalid).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] An invalid answer field and its error message use the reference's destructive styling, including a visible invalid border.
- [ ] Input validation does not produce an error toast.
- [ ] Validation errors first appear on submission, not during initial entry.
- [ ] After invalid submission, editing revalidates the answer: the error clears when valid and returns if invalid again.
- [ ] The invalid field exposes its state and associated message accessibly.
- [ ] Automated tests cover validation, styling, and correction.
