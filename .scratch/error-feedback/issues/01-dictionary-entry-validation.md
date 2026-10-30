# 01: Validate dictionary entries without error toasts

**What to build:** When a user saves an invalid dictionary entry, show clear feedback beside each invalid field instead of an error toast. Match the destructive error-state styling in the [shadcn textarea invalid example](https://ui.shadcn.com/docs/components/aria/textarea#invalid).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Invalid fields and their error messages use the reference's destructive styling, including a visible invalid border.
- [ ] Input validation does not produce an error toast.
- [ ] Field errors first appear on a save attempt, not during initial entry.
- [ ] After a failed save, edited fields are revalidated: errors clear when valid and return if invalid again.
- [ ] Invalid fields expose their state and associated messages accessibly.
- [ ] Automated tests cover validation, styling, and correction.
