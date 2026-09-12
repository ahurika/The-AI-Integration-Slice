---
trigger: always_on
---

# Git & Secrets Rules

**Priority:** CRITICAL

## Never Commit

Never commit:

```text
.env
.env.local
.env.production
```

or files containing:

* Passwords
* Database credentials
* API keys
* Authentication secrets
* Private keys
* Access tokens

## `.env.example`

Commit only placeholder values.

## Before Commit

Check:

1. Changed files.
2. Git diff.
3. Environment files.
4. Generated files.
5. Secrets.
6. Relevant tests.

## Secret Exposure

If a credential has been committed:

1. Stop using it.
2. Rotate/revoke it.
3. Remove it from repository history where appropriate.
4. Replace it with a secure credential.
5. Verify the replacement.

Deleting the file alone does not make an exposed secret safe.
