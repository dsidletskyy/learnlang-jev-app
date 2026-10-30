# Test suite hardening

Status: ready-for-agent

## Problem Statement

Developers need fast, repeatable checks they can trust without risking their personal Dictionary. Browser tests currently reuse database state, repeat browser-independent checks, and spend time on real-time waits and three browser projects. Large test files and overlapping checks make maintenance harder.

## Solution

Give each database-mutating browser test a clean, guarded test database; prevent conflicts between supported test commands; simplify and speed up the suite without losing required behavior. Limit the supported and automatically tested browser target to Chromium. Developers can run the complete check with confidence that it exercises the intended coverage and never intentionally targets personal data.

## User Stories

1. As a developer, I want each database-mutating browser test to start clean, so that results do not depend on earlier tests.
2. As a developer, I want retries to start clean, so that failed attempts do not contaminate later attempts.
3. As a developer, I want my personal Dictionary protected from test resets, so that testing cannot delete my data.
4. As a developer, I want each destructive reset to verify its target, so that a changed or unavailable target fails closed.
5. As a developer, I want supported test commands to reject conflicting concurrent runs, so that one run cannot reset or recreate another run's database.
6. As a developer, I want clear conflict errors, so that I can stop the other run and retry.
7. As a developer, I want migrations run once per suite invocation, so that per-test cleanup does not repeat migration work.
8. As a developer, I want tests of unsafe targets, so that accidental weakening of safeguards is detected.
9. As a developer, I want obsolete and duplicated checks consolidated, so that the suite is easier to maintain.
10. As a developer, I want important confirmation and recovery behavior retained, so that consolidation does not hide regressions.
11. As a developer, I want timeout and toast tests to avoid long wall-clock waits, so that feedback arrives sooner.
12. As a developer, I want the production scoring timeout verified as 30 seconds, so that fast tests do not change runtime behavior.
13. As a developer, I want browser-independent safety checks run outside browser projects, so that they run once.
14. As a developer, I want learning-session tests organized by behavior, so that I can find and maintain them.
15. As a developer, I want Chromium as the only browser test target, so that the full check does not repeat browser scenarios in Firefox and WebKit.
16. As a developer, I want documentation to state the Chromium-only support target, so that untested browser compatibility is not implied.
17. As a developer, I want the full updated check to run lint, type checks, unit, isolation, browser and database integration tests, so that one command verifies the work.
18. As a learner, I want Dictionary and Learning session behavior unchanged, so that test infrastructure changes do not alter the application.

## Implementation Decisions

- Migrate the dedicated test database once per relevant suite invocation, not before every test. Give every database-mutating browser test an independent clean starting state through a shared lifecycle fixture or equivalent; retries also reset. Read-only unavailable-database tests must not reset the real test database.
- Every destructive reset verifies its effective target and fails closed on missing, personal, unavailable, or unrecognized targets. Preserve the existing dedicated container, loopback, volume, connection and database-identity protections; do not weaken checks for speed. Retain an explicit table allowlist and avoid broad cascading deletion. Coordinate resets with in-flight requests and retain serial browser execution.
- Documented test commands that mutate or recreate the dedicated database must share fail-fast concurrency protection, including browser and database integration workflows. Ensure nested aggregate commands work without self-deadlock and locks release on failure or termination. Direct Playwright invocations and arbitrary manual database access are outside the agreed protection; document the limitation.
- Chromium is the sole supported browser and sole Playwright browser project. Remove Firefox and WebKit projects, installation prerequisites and claims of cross-browser verification. Update affected durable requirements and local documentation while preserving historical issue evidence appropriately. Playwright Chromium results do not establish support for other Chromium-based browsers.
- Consolidate obsolete scaffold checks, duplicate success-toast checks and overlapping learning-evaluation failure scenarios only when distinct required assertions survive. Preserve five-second success and non-validation error toast behavior, absence of close buttons where required, recovery guidance, accessibility, and input preservation.
- Replace long real-time waits with controlled clocks or suitably scoped timing seams. Verify actual production timeout configuration remains 30 seconds and exercise timeout behavior quickly, including stalled response handling; do not expose a user-facing timeout setting or alter normal application behavior.
- Move browser-independent database safety coverage to a Node-level suite while preserving coverage of the integration command independently of reset-script safeguards. Split the large learning-session browser suite by behavior without obscuring scenarios or weakening assertions.
- Update documented commands and prerequisites. Preserve no-live-provider and dedicated-database safeguards. Measure or report runtime where practical, without inventing a speedup guarantee.
- No data schema, public API, application feature, or user-facing behavior change is intended, apart from the revised browser support statement.

## Testing Decisions

- Good tests assert observable behavior and meaningful safety guarantees rather than incidental implementation details. Prefer existing seams: documented command execution and Playwright browser flows with the real dedicated database and local provider substitute; use focused Node tests for destructive guards and timeout behavior. Add the fewest timing or infrastructure seams needed.
- Test isolation with consecutive tests and retries or equivalent evidence, including a failure leaving state behind; ensure no cleanup touches a personal or unrecognized database.
- Exercise conflicting supported commands and lock release after failure or termination without touching personal data. Preserve distinct reset and database-integration refusal cases.
- Verify confirmation and error expiry, retained guidance and preserved answer, provider request contract, scoring timeout and existing cross-cutting behavior. Keep explicitly required spacing, keyboard and accessibility behavior coverage within Chromium.
- Existing browser, isolation, and unit tests provide prior art; use the existing controlled-clock approach for toast tests where practical.
- Run the complete updated aggregate check. Report exact failures or environmental blockers; do not claim a pass without evidence.

## Out of Scope

- Firefox, WebKit or Safari support or automated verification; browser projects beyond Chromium.
- Parallel browser workers, separate per-worker databases, and protection against arbitrary manual database access or direct unsupported test invocations.
- Changing Dictionary, Learning session or scoring product behavior; live provider scoring-quality validation.
- Personal data migration, backup, deletion, or modification.

## Further Notes

The previous MVP browser and accessibility verification requirements are superseded by the Chromium-only decision. Automated testing does not prove accessibility conformance. Relevant review and primary-source research are available in the working context; the absence of a full browser run during review limits earlier coverage conclusions.
