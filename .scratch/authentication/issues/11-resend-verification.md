# 11: Resend verification

**What to build:** An unverified registrant can request another verification link without signing in and recover from an invalid or expired link without revealing account existence.

**Blocked by:** 10: Verified accounts and private dictionaries.

**Status:** ready-for-agent

- [ ] Provide unauthenticated resend from sign-in or verification screens and safe guidance for invalid or expired links.
- [ ] Earlier unexpired links remain valid after a new request, including when replacement delivery fails. Reusing a valid link after verification may report success without creating a session or triggering further side effects; failed delivery never verifies the account or exposes links in responses or logs.
- [ ] Known and unknown identifiers receive generic acknowledgments and specified per-identifier limits, with materially similar timing where practical; operational errors are safe to log and retry.
- [ ] Browser and integration tests cover resend, expiry, harmless replay, earlier-link validity after resend and delivery failure, throttling and manual sign-in after successful verification.

Source: [authentication spec](../spec.md).
