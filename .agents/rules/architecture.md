---
trigger: always_on
---

# Architecture Rules

**Priority:** HIGH

## Approved Stack

* Next.js
* TypeScript
* Prisma
* PostgreSQL

## Layering

Follow:

```text
UI
 ↓
Application Logic
 ↓
Data Access
 ↓
PostgreSQL
```

## Rules

* UI must not directly contain Prisma database operations.
* Authentication logic must be reusable and centralized.
* Database access should be centralized.
* Sensitive operations should remain server-side.
* Do not duplicate business logic.
* Do not introduce unnecessary architectural layers.

## Architecture Changes

Any significant architecture change requires:

1. Reason.
2. Impact assessment.
3. Implementation.
4. Documentation update.
5. Verification.
