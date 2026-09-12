---
trigger: always_on
---

# Authentication Security Rules

**Priority:** CRITICAL
**Mode:** BLOCKING when modifying authentication/security functionality

## Passwords

Passwords must never be stored in plaintext.

Passwords must never be exposed to the client.

Passwords must never be logged.

Use an appropriate password-hashing mechanism.

## Secrets

Never hard-code:

* Database credentials
* Authentication secrets
* API keys
* Private keys
* Encryption keys
* Access tokens

## Sessions

Sessions must have appropriate:

* Creation
* Validation
* Expiration
* Invalidation
* Logout behaviour

## Tokens

Authentication tokens must be:

* Securely generated.
* Appropriately time-limited.
* Server-side validated.
* Protected against reuse where applicable.
* Excluded from logs.

## Password Reset

Reset functionality must:

* Use secure tokens.
* Use expiration.
* Prevent token reuse where applicable.
* Avoid unnecessary account enumeration.
* Invalidate the reset mechanism after successful use.

## Authentication Errors

Do not expose unnecessary information about:

* Account existence
* Password validity
* Database internals
* Authentication internals

## Sensitive Responses

Never return unnecessary:

* Password hashes
* Tokens
* Secrets
* Internal database errors

## Blocking Rule

If the agent cannot determine whether an implementation is secure, it must not guess.

Investigate the project requirements and implementation context first.
