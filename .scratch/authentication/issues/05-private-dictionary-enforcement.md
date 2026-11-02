# Define private dictionary access

Type: grilling
Status: resolved
Blocked by: none

## Question

What access and isolation guarantees should apply to each user's dictionary and learning actions, including unauthenticated access and attempts to access another user's entries?

## Answer

- Authenticate protected pages and server actions. Scope every dictionary and learning read and write to the signed-in account on the server; never trust a client-supplied owner ID. Unowned legacy entries remain inaccessible until assigned.
- Attempts to access or mutate another account's entry must behave like requests for a nonexistent entry, with no disclosure or mutation.
- Meaning-match scoring requires an owned entry: accept its ID and the answer, load its stored phrase and language scoped to the signed-in account, and use those server-fetched values for scoring. Rate limits and active-session enforcement remain separate decisions. Scoring still sends data to the external provider.
- Redirect unauthenticated page navigation to sign-in. Reject unauthenticated actions without mutations or provider calls and prompt the user to sign in again; preserve unsaved input where practical, without guaranteeing survival across reloads.
- These controls do not provide isolation against access to the shared inbox, machine, or database.
