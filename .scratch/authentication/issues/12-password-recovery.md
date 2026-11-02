# 12: Recover password

**What to build:** A user who forgot a password can request a reset through the local inbox and safely set a new password without bypassing verification.

**Blocked by:** 10: Verified accounts and private dictionaries.

**Status:** resolved

- [x] Sign-in offers recovery; known and unknown identifiers receive generic acknowledgments and specified per-identifier throttling. Delivery failures record safe operational errors without exposing links and permit retry.
- [x] Cryptographically secure reset links expire after one hour, are single-use and are superseded by later accepted requests even when delivery fails. Bound database acquisition and lock waits; durable invalidation failure returns a generic temporary-failure response. Use per-account locking; rare account-dependent temporary failures under account-specific database contention are accepted, even when an unknown identifier receives an acknowledgment. Database access is outside the isolation boundary. Rejected requests may leave prior links valid; no background work outlives the response. Invalid links offer safe guidance and another request.
- [x] Password and confirmation obey the specified password policy and blocklist; validation errors do not consume valid links or change credentials or sessions. Blocklist unavailability fails closed.
- [x] Successful reset changes the password, consumes the link and revokes all sessions atomically or equivalently fail-closed; failures never report partial success. Require manual sign-in and leave verification status unchanged.
- [x] Browser and integration tests cover verified and unverified accounts, expiry, replay, supersession, validation retry, delivery failure, throttling, session revocation and injected completion failures.

Source: [authentication spec](../spec.md).
