# Define password recovery behavior

Type: grilling
Status: resolved
Blocked by: 03, 06, 07

## Question

How should password recovery work for verified and unverified accounts, including requesting, completing and retrying recovery, delivery failures, and interactions with verification and sign-in?

## Answer

- The sign-in page offers Forgot password. An unauthenticated user submits an email identifier and receives the same acknowledgment whether or not an account exists. Existing per-identifier reset limits apply.
- Send the reset link to the shared local inbox. Links expire after one hour, are single-use, and are superseded by a new request. Invalid, expired, used, or superseded links cannot change a password; show a generic error and a route to request another link.
- The reset form requires a new password and confirmation, enforcing the agreed password policy. Validation failure leaves an otherwise valid link usable for correction until expiry, supersession, or successful use; no password or session changes occur.
- On success, password change, link consumption, and revocation of all sessions must succeed atomically or through an equivalent fail-closed mechanism. Do not report success if any fails; show a safe retry message. Show confirmation and require manual sign-in after success.
- Resetting an unverified account does not verify it; the account must still complete verification before sign-in.
- If delivery fails, keep the public request response generic, record a safe operational error without the token or link, and allow a rate-limited retry. Never bypass recovery or expose reset links in application responses or logs.
