# 11: Resend verification

**What to build:** An unverified registrant can request another verification link without signing in and recover from an invalid or expired link without revealing account existence.

**Blocked by:** 10: Verified accounts and private dictionaries.

**Status:** ready-for-agent

- [ ] Provide unauthenticated resend from sign-in or verification screens and safe guidance for invalid, expired, used or superseded links.
- [ ] Each request invalidates earlier unused links, including when replacement delivery fails; failed delivery never verifies the account or exposes links in responses or logs.
- [ ] Known and unknown identifiers receive generic acknowledgments and specified per-identifier limits, with materially similar timing where practical; operational errors are safe to log and retry.
- [ ] Browser and integration tests cover resend, expiry, replay, supersession, delivery failure, throttling and manual sign-in after successful verification.

Source: [authentication spec](../spec.md).
