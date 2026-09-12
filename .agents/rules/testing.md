---
trigger: always_on
---

# Testing Rules

**Priority:** HIGH

## Principle

Do not test only successful scenarios.

Authentication functionality must consider:

```text
Happy path
+
Invalid input
+
Invalid credentials
+
Expired state
+
Unauthorized access
+
Server failure
+
Database failure
```

## Security Testing

Verify that:

* Passwords are not exposed.
* Tokens are not logged.
* Secrets are not committed.
* Protected resources reject unauthenticated access.
* Sensitive information is not unnecessarily exposed.

## Completion

Do not claim a feature has been fully verified if relevant tests have not been executed.

Report incomplete verification honestly.
