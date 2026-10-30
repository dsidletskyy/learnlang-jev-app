# Language Learning MVP

Status: ready-for-agent

## Problem Statement

I want a personal place to collect phrases and their translations and practice recalling the original phrases. I need feedback on answers that express the same meaning with different wording, without having to judge every answer myself. I also need to maintain my dictionary as my learning progresses.

## Solution

A local-only web application provides a single personal dictionary and learning sessions. I add an original phrase, its language, and a translation; I can review, edit, and delete entries on the home screen. For practice, I choose an original language and receive each matching translation once in random order. I type the original phrase and receive an estimated meaning-match score, followed by a review and average at the end.

Exact matches are scored locally. For other answers, Jev receives the original phrase, answer, and original language; the translation is not sent. The app does not display an in-app privacy notice.

## User Stories

1. As a learner, I want to use the app locally, so that I can practice on my own computer.
2. As a learner, I want one dictionary without signing in, so that I can start using the app simply.
3. As a learner, I want to see my dictionary entries on the home screen, so that I can review what I have saved.
4. As a learner, I want to see newest entries first, so that recent additions are easy to find.
5. As a learner, I want to add an original phrase, so that I can practice it later.
6. As a learner, I want to select the original phrase's language from the six supported languages, so that I can organize my practice by language.
7. As a learner, I want to add a translation as plain text, so that I have a prompt for recalling the phrase.
8. As a learner, I want multiline phrases and translations, so that I can save longer expressions.
9. As a learner, I want empty phrases and translations rejected, so that my dictionary contains usable entries.
10. As a learner, I want to add duplicate entries, so that the app does not restrict my dictionary.
11. As a learner, I want to edit an original phrase, so that I can correct it.
12. As a learner, I want to edit its language and translation, so that I can correct all parts of an entry.
13. As a learner, I want deletion confirmed, so that I do not accidentally lose an entry.
14. As a learner, I want an empty-dictionary prompt, so that I know to add entries before practicing.
15. As a learner, I want to choose an original language for a learning session, so that I can focus my practice.
16. As a learner, I want to practice all entries for that language once, so that the session covers the selected language.
17. As a learner, I want the entries presented in random order, so that I cannot rely on their list order.
18. As a learner, I want each prompt to show its translation, so that I can recall the original phrase.
19. As a learner, I want the prompt to remain read-only during practice, so that I can focus on answering.
20. As a learner, I want to type multiline answers, so that I can respond to longer phrases.
21. As a learner, I want a submit button and Ctrl/⌘+Enter shortcut, so that I can submit conveniently without preventing multiline input.
22. As a learner, I want empty answers rejected, so that an accidental submission does not count as an attempt.
23. As a learner, I want an exact match scored immediately without an AI request, so that I get quick feedback.
24. As a learner, I want differently worded answers assessed for meaning, so that equivalent expressions can receive a high score.
25. As a learner, I want to see my answer, the saved original, and the meaning-match score immediately, so that I can compare them.
26. As a learner, I want to move to the next entry after feedback, so that I control my pace.
27. As a learner, I want the translation excluded from Jev requests, so that only the agreed text is sent for scoring.
28. As a learner, I want practice to require a configured Jev API key, so that non-exact answers can be evaluated.
29. As a learner, I want an evaluation failure to preserve my answer, so that I do not lose my work.
30. As a learner, I want to edit and retry after an evaluation failure, so that I can continue the session.
31. As a learner, I want edits or deletions made after a session starts to affect future sessions only, so that my current session remains consistent.
32. As a learner, I want to cancel a session, so that I can stop practicing whenever I choose.
33. As a learner, I want a summary of my answers and scores after finishing, so that I can review the session.
34. As a learner, I want an average meaning-match score, so that I can see an overall estimate for the session.
35. As a learner, I want unfinished progress discarded on leaving or refreshing, so that sessions remain temporary.
36. As a learner, I want completed session history not to be stored, so that the MVP stays simple.
37. As a learner, I want an empty-language state instead of an empty session, so that I know when there are no entries to practice.
38. As a learner, I want a calm, readable interface, so that I can focus on learning.
39. As a learner, I want the interface to adapt to narrow windows, so that I can use its controls without horizontal scrolling.
40. As a learner, I want keyboard-accessible controls and dialogs, so that I can use the app without a mouse.
41. As a learner, I want to see full multiline entries, so that no part of a phrase or translation is hidden.
42. As a learner, I want inline form errors that preserve my input, so that I can correct mistakes without starting over.
43. As a learner, I want to see the selected language and my position during practice, so that I know what I am practicing and how far I have progressed.
44. As a learner, I want confirmation before exiting an unfinished session, so that I do not accidentally discard progress.
45. As a learner, I want a warning before refresh or browser close where supported, so that I can avoid losing unfinished progress.
46. As a learner, I want to start another session from the summary, so that I can practice again without navigating home first.

## Implementation Decisions

- Build a local-only, single-user web app using Next.js, shadcn components, and PostgreSQL. Run PostgreSQL in Docker and Next.js directly on the host during development. Store database data in persistent Docker storage so recreating the container does not erase the dictionary. No login, user accounts, registration, or per-user ownership model is required. The dictionary belongs to the local app; it is not a public internet service. Keep the app and database local, and revisit authentication and access controls before any remote deployment.
- A dictionary entry contains one original phrase, one original-language selection, and one plain-text translation. There is no translation-language field. Select original languages from a simple list of the six supported languages. Allow duplicates.
- Persist entries in PostgreSQL. List newest first. Add, edit, and delete entries; require confirmation before deletion. Support multiline phrase and translation text. Reject empty or whitespace-only input and trim leading and trailing whitespace.
- Do not include search or filtering on the home screen. Show an empty state when there are no entries.
- Before starting a learning session, select an original language. Snapshot all entries for that language at session start and shuffle them. Present each snapshot entry once; later edits or deletions apply only to future sessions. Do not start an empty session.
- Show the translation as a read-only prompt. Accept one multiline answer per entry. Reject whitespace-only answers; trim leading and trailing whitespace. Submit with a button or Ctrl/⌘+Enter. After successful scoring, show the answer, saved original, and meaning-match score; advance manually. Do not offer another attempt after successful scoring.
- For exact matching, compare answer and original after trimming outer whitespace and ignoring case. A match receives 100 locally. Do not normalize internal whitespace or punctuation for this shortcut; non-exact answers go to Jev.
- Use TypeSafe Jev's Score primitive and `jev-latest`. Supply original phrase, answer, and original language; do not send the translation. Use a general three-level meaning-match rubric: different meaning, partially similar meaning, and equivalent meaning. Normalize Jev's position on the rubric to 0–100 and round to a whole-number percentage. Do not add separate app-side penalties, pass/fail thresholds, explanations, or confidence indicators. The percentage is an estimate, not an objectively measured correctness percentage.
- Do not show an in-app privacy notice. Non-exact answers are still sent to TypeSafe as described above. Keep the TypeSafe API key server-side. Require a configured key before starting practice, checking presence only; do not make a preliminary verification request. Invalid or expired keys can surface when Jev is called.
- Treat provider failures and invalid, unparseable, or out-of-range scores as evaluation failures, not incorrect answers. Preserve the answer, allow editing, and offer retry without consuming the attempt. Prevent duplicate submissions while evaluation is in progress.
- On completion, show each translation, answer, saved original, and score in session order, plus the arithmetic mean rounded to the nearest whole percent. Offer return to the dictionary or starting another session through language selection. Allow cancellation; confirm exit from an unfinished session and warn on refresh or browser close where supported. Leaving or refreshing discards session progress; do not persist completed sessions or history.
- Use a calm, minimal light theme with muted blue accents. Design desktop-first with responsive stacking, wrapped text, and no horizontal scrolling on narrow screens. Ensure keyboard navigation, visible focus, accessible dialog focus behavior, and appropriately sized touch targets.
- Make the dictionary the main home content, with prominent Add phrase and Start learning actions. Show entries as stacked cards with the full multiline phrase, translation, and language. Use edit and delete icon buttons with accessible labels and hover tooltips. An empty dictionary shows a welcome message and an Add phrase action.
- Use a shared add/edit dialog with inline validation. Preserve entered text and keep the dialog open on failure; on success, close it, update the list, and show a brief confirmation. The delete confirmation displays the original phrase and offers Cancel and Delete.
- Start learning through a language-selection dialog listing only original languages with entries and their counts. Show an actionable configuration message there if the Jev key is missing, without exposing the key.
- Use a separate focused practice screen showing the selected language, a position counter, translation, and multiline answer. Keep the answer visible with a loading indicator during evaluation; show actionable errors and retry in the practice card. After scoring, show a neutral meaning-match percentage and separately labeled, stacked answer and original-phrase blocks, with a Next button.

## Additional Implementation and Verification Decisions

- Keep the app and database accessible only from the local computer, with basic safeguards against state-changing requests from other websites. Review app binding, PostgreSQL published-port binding, and request protections including any route handlers; no dedicated automated security checks are required. Avoid authentication and complex security infrastructure.
- Defer dictionary backup and restore; persistent Docker storage is not a backup.
- Chromium is the sole supported browser target. Narrow-screen layouts remain required, but mobile browsers are not separate release targets.
- Use one Next.js App Router application; database access, Jev calls, and the API key remain server-side. Do not add a separate backend service.
- Use Drizzle ORM and Drizzle Kit for PostgreSQL access and versioned migrations.
- Use Playwright as the primary browser test framework, covering Chromium only. Chromium results do not establish support for other Chromium-based browsers or automated accessibility conformance.
- Keep each learning session in browser memory. Tabs have independent sessions and snapshots; they do not synchronize.
- Allow confirmed session exit during evaluation immediately. Cancel the request where practical and ignore any late result; provider processing or charges may still occur.
- Apply database migrations through an explicit setup/update command, not automatically on app startup. Document the command and surface a clear error if the database is not ready.
- If an entry is deleted while its edit dialog is open, saving fails without recreating it; preserve the form input and explain that the entry no longer exists. Concurrent edits to an existing entry use last successful save wins.
- Set one 30-second timeout for the complete evaluation attempt, including response handling; retry remains manual and may incur an additional provider charge.
- Run tests against a dedicated PostgreSQL container and volume, separate from the personal dictionary, with separate database credentials. Require explicit test-only connection configuration and verify the connected database is the dedicated test target before resets; fail closed for personal, unavailable, or unrecognized targets, without falling back to the personal database. Cover refusal with an automated negative test that does not touch personal data. Automated tests fail closed rather than calling the real Jev service if the substitute is misconfigured.
- Use Zod for input validation, including validation of all untrusted server inputs. Limit each phrase, translation, and answer to 2,000 Unicode code points after trimming outer whitespace; keep client and server counting consistent and show inline errors.
- Sort entries by creation time descending, with a consistent ID tie-breaker for identical timestamps.
- Use pnpm with a checked-in lockfile.
- Do not log phrases, translations, answers, or API keys by default; retain non-sensitive diagnostic information.
- On dictionary load failure, show an inline error on the home screen without a retry button; instruct the user to refresh. Do not show the empty-dictionary welcome state. On failed mutations, preserve the form and input and show an inline error.
- Use the official TypeSafe JavaScript SDK behind a substitutable scoring boundary. Each submit makes at most one provider attempt; disable automatic SDK retries where supported. Retries require explicit user action.
- Pin and document an active LTS Node.js major compatible with dependencies for local development and CI; verify the supported version during setup.
- Keep dictionary use independent of Jev configuration. A missing key blocks session start; an invalid key surfaces when a non-exact answer is evaluated.
- For exact matching, use default Unicode case conversion without locale-specific rules or Unicode normalization, after trimming outer whitespace.
- Preserve an entry's creation time when editing; edits do not move it to the top.
- Fetch and snapshot matching entries when the learner confirms language selection. If none remain, show the empty-language state rather than starting. If loading fails, keep the dialog open with the selection intact, show an inline error, and allow another start attempt; do not report an empty language or start a session.
- Use Next.js Server Actions by default for server operations; use route handlers when justified and apply appropriate origin safeguards to them.
- If another tab already deleted an entry, treat a subsequent delete as already deleted: close confirmation and refresh the dictionary, without claiming a new deletion.
- Treat the last feedback screen as unfinished until the learner advances to the summary; exit warnings still apply.
- Order supported languages alphabetically by English name wherever presented.
- Do not check provider availability at startup; call Jev only when a non-exact answer is submitted.
- A completed summary is discarded on leaving or refreshing without an exit warning.
- Test the actual outbound Jev SDK request contract using a controllable substitute: allow only the agreed data, verify translation is not sent, and cover invalid scores, timeout, and late responses. No live provider call is needed.
- Normalize the three-level Jev score with `round(score / 2 * 100)` after validating it is finite and within 0–2. Cover endpoints, midpoint, rounding, and invalid values with deterministic tests.
- Use the following initial Jev rubric levels in order: “The answer expresses a different meaning from the original phrase.”; “The answer shares some meaning with the original phrase but differs in an important way or omits important meaning.”; “The answer expresses the same meaning as the original phrase, even if worded differently.” Live scoring quality remains unverified.
- Support only English (`en`), Italian (`it`), Ukrainian (`uk`), Russian (`ru`), Slovak (`sk`), and German (`de`) in MVP. Use these ISO 639-1 codes and English display names in one checked-in list shared by the UI and server-side validation. No external language-list package or runtime service is required.
- Target WCAG 2.2 Level AA using automated behavioral and keyboard tests only; do not add an automated accessibility scanner. Do not claim verified AA conformance based on automated tests.
- Provide documented local commands for linting, type checking, and tests. Hosted CI is not required for MVP.
- Provide a sample environment file with placeholders, never real credentials; exclude real local environment files from version control.
- Provide a complete local quickstart covering prerequisites, PostgreSQL startup, configuration, explicit migrations, starting Next.js, expected outcome, and common recovery steps. Dictionary use does not require a Jev key. Do not require a manual database-restart verification step.
- Show safe, actionable evaluation errors that distinguish credential problems from temporary provider failures; do not expose raw provider details.
- Calculate the session average from the displayed whole-number scores, rounding their arithmetic mean to the nearest whole percent.
- Provide one documented aggregate local check for lint, type checking, and tests, alongside individual commands and prerequisites.
- Provide separate documented test-container lifecycle commands that never remove the personal database or volume. Serialize database-resetting tests initially to avoid cross-test interference.
- Warn in setup documentation that deleting the personal PostgreSQL volume deletes the dictionary; distinguish stopping the container from removing its volume.
- Document test prerequisites and common recovery steps for Docker, migrations, missing Jev configuration, and browser binaries. Automated tests do not require a live Jev key.

## Testing Decisions

- Good tests verify externally observable behavior rather than implementation details, including visible results, persisted dictionary changes, session behavior, and recovery from errors.
- Primary coverage is browser end-to-end testing through the running app, with a real isolated PostgreSQL test database and a controllable Jev substitute. Keep test data separate from the personal dictionary. The substitute supplies predictable scores and failures without live API calls or charges.
- Cover entry creation, editing, deletion confirmation, duplicates, validation, empty states, language selection, session snapshots, random-order membership, exact matching, non-exact scoring, retry, completion summary, cancellation, and discarded progress. Verify dialog behavior, keyboard navigation, accessible icon labels, responsive layout, progress display, loading and error states, and session-exit warnings where supported. Do not assert a particular random order.
- Use focused integration or unit tests where useful for behavior difficult to exercise reliably through the browser, such as normalization and score conversion. Test the Jev integration contract without treating a simulated response as evidence of real model quality.
- No application or test suite exists yet, so there is no project-specific test prior art.
- Do not perform development-time live Jev rubric checks against representative phrase-answer examples; this was explicitly deferred. The real-world quality of estimated scores remains unverified.

## Out of Scope

- Internet-facing deployment, multi-user access, accounts, authentication, registration, and per-user ownership.
- Translation-language metadata, multiple translations within one entry, and home-screen search or filtering.
- Spaced repetition, persistent progress, session history, retries after a successfully scored attempt, pass/fail decisions, explanations, manual score overrides, and confidence display.
- Live Jev scoring-quality validation or calibration against example answers in this MVP.

## Further Notes

- Jev Score is a probability-weighted position on a descriptive rubric. Normalizing it to a percentage does not make it a literal fraction of the phrase that is correct. Model updates and rubric wording may change results.
- TypeSafe documentation: https://docs.typesafe.ai/introduction and https://docs.typesafe.ai/primitives/score. Confirm current integration details before implementing.
- The local-only security assumption does not protect against someone with access to the computer or database. Non-exact answers leave the computer for external evaluation.
