---
trigger: always_on
---

# Code Quality Rules

**Priority:** HIGH

## Rules

Write code that another experienced developer can understand.

Prefer:

* Clear naming
* Small focused functions
* Explicit types
* Reusable logic
* Predictable control flow
* Minimal dependencies

Avoid:

* Unnecessary abstraction
* Clever code
* Large multi-purpose functions
* Repeated business logic
* `any` as a shortcut
* Unnecessary comments

## TypeScript

Use TypeScript throughout.

Do not bypass type safety simply to make compilation succeed.

Prefer fixing the underlying type problem.

## Comments

Comments should explain **why**, not simply repeat **what** the code does.
