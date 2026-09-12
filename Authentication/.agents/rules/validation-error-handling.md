---
trigger: always_on
---

# Validation & Error Handling Rules

**Priority:** HIGH

## Validation

Client validation improves UX.

Server validation provides security.

Therefore:

> Client validation must never replace server validation.

## Flow

```text
Input
 ↓
Validation
 ↓
Business Logic
 ↓
Database
```

## Errors

Separate:

* Validation errors
* Authentication errors
* Authorization errors
* Server errors
* Database errors

## Security

Never expose:

* Stack traces
* SQL errors
* Prisma internals
* Secrets
* Environment variables
* Sensitive authentication information

## User Experience

Where appropriate, errors should provide a useful recovery action.
