# Define account verification behavior

Type: grilling
Status: resolved
Blocked by: 03

## Question

What may an unverified registrant do, and how should verification, expired links, and resending verification work in the local-mail setup?

## Answer

- Unverified accounts cannot sign in or use protected dictionary and learning features. They may request verification and password recovery.
- Verification links expire after 24 hours. A new request invalidates earlier unused links for that account; validate support in Better Auth or provide an appropriate mechanism.
- Allow unauthenticated verification-link requests from sign-in or verification screens. Respond generically regardless of account eligibility and throttle requests; exact limits remain a separate decision.
- Invalid, expired, and used links do not verify an account. Show safe guidance and a resend option; replay must not create a session or change another account. Already-verified users can proceed to sign-in without exposing account details.
- After successful verification, show confirmation and a sign-in link; do not sign in automatically. Verification establishes shared local inbox access, not external email ownership.
