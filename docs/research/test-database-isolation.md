# Browser test database isolation

## Findings

- [Playwright isolates browser contexts](https://playwright.dev/docs/browser-contexts) per test, not application database state. Its [parallelism guidance](https://playwright.dev/docs/test-parallel) describes isolating shared resources by worker. A single worker serializes one invocation, but does not isolate its tests or separate independent runs.
- Playwright supports test fixtures and recommends [setup projects](https://playwright.dev/docs/test-global-setup-teardown) for runner-integrated setup. Suite-level setup alone does not isolate tests from each other.
- PostgreSQL [`TRUNCATE`](https://www.postgresql.org/docs/17/sql-truncate.html) takes an `ACCESS EXCLUSIVE` lock. Its default `RESTRICT` rejects unlisted foreign-key dependencies; `CASCADE` can include additional tables. `RESTART IDENTITY` resets owned sequences. Use only against an isolated, quiescent target.
- [Dropping a database](https://www.postgresql.org/docs/17/sql-dropdatabase.html) is destructive, requires connecting to a different database, and `FORCE` cannot overcome every obstruction. Disposable databases need scoped credentials and carefully verified names.

## Repository assessment

`tests/isolation/reset.mjs` checks the explicit test URL, running Compose container, loopback port, volume, database name, and user before migrations and an explicit-table truncate. Playwright starts its server after running this reset, but most tests do not reset between tests. The guards reduce accidental targeting; they do not conclusively prove the inspected container is the server reached over TCP. Separate invocations and the database integration test must not operate concurrently on the same resources.

## Recommendation

For current serial, local suite, use a per-test fixture to establish a clean database. Apply migrations at run setup; retain fail-closed target verification on every destructive reset, not merely once at startup. Reuse an explicit, schema-qualified table allowlist without `CASCADE`; handle new tables deliberately. Prevent concurrent independent runs against the same test database, and test negative guard cases. Benchmark before optimizing repeated checks; do not weaken safety to save time.

If parallel execution becomes necessary, provision isolated databases or schemas per run and worker, configure the app to use the matching target, and isolate or reset data between tests. Unique worker IDs alone do not prevent collisions between independent runs. This is a later scaling option, not a requirement for the current serial suite.

## Limits

No benchmark, full browser run, or complete test-by-test dependency audit was performed. The recommendation is an application of the cited documentation to this repository, not a requirement stated verbatim by Playwright or PostgreSQL.
