# 14: Assign legacy entries

**What to build:** An operator explicitly assigns all currently unowned legacy entries to a selected verified account, without interrupting ordinary account use or changing anyone else's dictionary.

**Blocked by:** 10: Verified accounts and private dictionaries.

**Status:** ready-for-agent

- [ ] Operator selects an existing verified account by account ID; invalid or unverified selection leaves entries unchanged.
- [ ] Assignment atomically claims all currently unowned entries only, protects against races, never reassigns owned entries and supports safe retry after failure. No automatic assignment or mandatory backup is introduced.
- [ ] Assigned entries appear only in the selected account's dictionary and learning sessions; unassigned entries remain hidden and normal account use works while assignment is pending.
- [ ] Isolated database integration tests cover migration preservation, eligibility, concurrency, rollback, retry and preservation of owned entries.

Source: [authentication spec](../spec.md).
