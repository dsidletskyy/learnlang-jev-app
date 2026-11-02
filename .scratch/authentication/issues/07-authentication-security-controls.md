# Define authentication and session security controls

Type: grilling
Status: resolved
Blocked by: 02

## Question

Which Better Auth authentication and session controls should the spec require, including password policy, session lifetime and revocation, reset-token behavior, rate limiting, account-enumeration protection, and cookie settings for local-only operation?

## Answer

- Passwords: minimum 12 characters, allow at least 64, spaces and Unicode; no composition rules. Reject common or compromised passwords using a versioned local blocklist. If the list is unavailable, fail closed for new and reset passwords with a safe retry error; existing sign-in remains possible. Use supported slow salted password hashing and validate normalization and limits against the selected Better Auth version.
- Sessions: expire after seven days of inactivity and no later than 30 days after creation. Sign-out revokes the current server-side session; offer sign-out-all. Successful password reset revokes all existing sessions and requires fresh sign-in. Validate Better Auth support for both lifetime limits and revocation.
- Reset links: cryptographically secure, single-use, expire after one hour; issuing a new link invalidates earlier unused links. Validate provider support and handle delivery failures safely.
- Reduce account enumeration for sign-in, registration, verification resend and password reset using generic responses, status codes and materially similar timing where practical. Shared inbox access can still reveal account activity.
- Rate-limit normalized identifiers: sign-in at five attempts per 15 minutes, and registration, verification resend and reset at three requests per operation per 15 minutes. Apply limits equally to known and unknown identifiers; use temporary window-based rejection, not permanent lockout. No client-wide cap: rotating identifiers can evade these limits.
- Use HttpOnly, host-only, SameSite=Lax session cookies; require Secure on HTTPS, with an explicit local HTTP exception. Retain CSRF and origin protections. Verify and test all selected controls against the pinned provider version rather than assuming defaults.
