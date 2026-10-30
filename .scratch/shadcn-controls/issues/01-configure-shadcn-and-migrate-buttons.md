# 01: Configure shadcn and migrate buttons

**What to build:** Configure shadcn for React Aria and Lucide so users can continue using all app buttons with the existing appearance and behavior.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] shadcn CLI configuration follows its current documentation, selects React Aria and Lucide, and supports adding components to this project.
- [x] Existing buttons use the shadcn React Aria Button rather than the Radix-based Button.
- [x] Existing color theme, button appearance, keyboard interaction, focus visibility, disabled states, and accessible names are preserved.
- [x] Automated tests verify representative dictionary and learning session button interactions; existing tests continue to pass.

**Validation:** Lint and typecheck passed; dictionary and learning Playwright suites passed in Chromium, Firefox, and WebKit, including button and keyboard interactions.
