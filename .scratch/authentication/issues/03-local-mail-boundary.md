# Define local mail access and recovery boundary

Type: grilling
Status: resolved
Blocked by: none

## Question

Who can access the local mail catcher, and what security and usability expectations should apply to verification and password recovery when all messages remain on the same machine?

## Answer

- A shared local mail catcher serves mutually trusted local app users. Anyone with inbox access can read every verification and reset link and potentially access any account; passwords do not protect users from one another under this model.
- Email is an account identifier. Verification establishes access to the shared local inbox, not ownership or reachability of an external mailbox. Communicate this limitation.
- Access to the shared inbox is the sole recovery route; no administrative bypass or external email recovery is in scope.
- Bind the inbox UI and SMTP listener to loopback only; do not expose them through network-accessible proxies. Loopback does not isolate other users or software on the machine.
- If mail delivery fails, verification and recovery remain blocked until retry. Do not bypass them or expose reset links in application responses or logs. Report delivery problems where safe.
