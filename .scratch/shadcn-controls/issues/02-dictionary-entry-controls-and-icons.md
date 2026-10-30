# 02: Update dictionary entry controls and icons

**What to build:** Let users add and edit dictionary entries using shadcn React Aria controls and identify edit and delete actions by Lucide icons.

**Blocked by:** 01: Configure shadcn and migrate buttons.

**Status:** resolved

- [x] The original-language selector uses shadcn Select; original phrase and translation use shadcn Textarea.
- [x] Both text fields remain multiline; existing values, validation, and accessible field guidance work as before.
- [x] Edit and delete actions use Lucide pencil and trash icons with accessible action names.
- [x] Controls preserve the existing color theme, keyboard operation, focus visibility, and modal behavior.
- [x] Automated tests cover entry creation and editing, selection, validation, and edit/delete actions.
- [x] Coordinate overlapping changes with the existing UI feedback tickets without regressing their behavior.

**Validation:** Dictionary entry, deletion, review, and keyboard Playwright suites passed in Chromium, Firefox, and WebKit, including edit, validation, selection, and focus coverage.
