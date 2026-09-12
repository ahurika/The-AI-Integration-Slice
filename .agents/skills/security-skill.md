# Security Review Skill

## Purpose

Perform a security-focused review of authentication functionality.

## Review

### Credentials

Check:

* Password hashing
* Password verification
* No plaintext storage
* No password logging

### Sessions

Check:

* Creation
* Validation
* Expiration
* Invalidation
* Logout

### Tokens

Check:

* Secure generation
* Expiration
* Validation
* Reuse protection where applicable
* No logging

### Secrets

Check:

* Environment variables
* `.gitignore`
* `.env.example`
* No hard-coded credentials

### Responses

Check:

* No password hashes
* No secrets
* No tokens
* No unnecessary account enumeration
* No internal database errors

### Protected Resources

Check:

* Unauthenticated requests are rejected.
* Authentication state is validated correctly.
* Users cannot access another user's protected resources.

## Review Result

Classify each applicable area:

```text
PASS
FAIL
NEEDS REVIEW
NOT APPLICABLE
```

Never mark `PASS` without verification.
