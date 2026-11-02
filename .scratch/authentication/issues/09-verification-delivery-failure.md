# Define verification delivery failure behavior

Type: grilling
Status: resolved
Blocked by: 03, 06, 07

## Question

If registration or a verification resend cannot deliver its email, what account and verification-link state should remain, and how should the registrant recover without exposing account existence or bypassing verification? How should earlier usable links be handled if delivery of a replacement fails?

## Answer

- If initial verification email delivery fails, keep the account unverified. It cannot sign in until verification succeeds.
- A new verification request invalidates earlier unused links even if delivery of the new message fails. The registrant can request another link after mail service recovers.
- Use a generic public acknowledgment, record a safe operational error without tokens or links, and permit rate-limited resend. Never bypass verification or expose verification links in application responses or logs.
