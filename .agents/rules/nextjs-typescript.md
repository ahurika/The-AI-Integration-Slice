---
trigger: always_on
---

# Next.js & TypeScript Rules

**Priority:** HIGH

## Next.js

Use the App Router.

Routes belong under:

```text
app/
```

## Server Components

Use Server Components by default where appropriate.

Use Client Components only where client-side functionality requires them.

Do not add `"use client"` unnecessarily.

## Sensitive Operations

Authentication-sensitive operations should execute server-side whenever possible.

## TypeScript

Avoid:

```text
any
```

as a shortcut.

Do not weaken type safety simply to bypass an implementation problem.

## Environment Variables

Server-only secrets must never be exposed through client-side environment variables.

Do not expose sensitive variables through public environment configuration.
