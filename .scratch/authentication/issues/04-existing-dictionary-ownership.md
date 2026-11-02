# Assign existing dictionary ownership

Type: grilling
Status: resolved
Blocked by: none

## Question

How should existing unowned dictionary entries be safely assigned to an account while preserving data, avoiding accidental disclosure to another registrant, and handling incomplete migration?

## Answer

- An operator explicitly selects an existing, locally verified account by its account ID. Never assign legacy entries automatically to the first registrant.
- Keep unowned legacy entries inaccessible until assignment succeeds. Normal registration and use of already owned dictionaries remain available while assignment is pending.
- Assign all unowned legacy entries to the selected account atomically; roll back on failure and permit safe retry. Do not reassign entries that already have owners.
- A database backup is not mandatory for this operation. Verification means access to the shared local inbox, not proof of external email ownership.
