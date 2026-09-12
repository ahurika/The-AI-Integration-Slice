---
trigger: glob
globs: prisma/** lib/db/** lib/**/database*.{ts,tsx} lib/**/prisma*.{ts,tsx}
---

# Database & Prisma Rules

**Priority:** HIGH

## Database

PostgreSQL is the approved database.

Prisma is the approved ORM.

## Schema

Database schema belongs in:

```text
prisma/schema.prisma
```

## Rules

* Centralize Prisma client initialization.
* Use Prisma for application database access.
* Retrieve only necessary fields.
* Protect sensitive fields.
* Use appropriate constraints.
* Use migrations for schema changes.
* Keep migrations reproducible.

## Schema Changes

Before changing the schema:

1. Identify the requirement.
2. Identify affected entities.
3. Identify affected application logic.
4. Determine migration impact.
5. Apply the change.
6. Test affected functionality.
