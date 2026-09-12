---
trigger: always_on
---

# Change Control Rules

**Priority:** HIGH
**Mode:** BLOCKING for significant architectural changes

Before modifying existing functionality, determine:

* Why the change is required.
* Which requirement it satisfies.
* Which files are affected.
* Whether the database is affected.
* Whether authentication is affected.
* Whether security is affected.
* Whether documentation must change.

## Smallest Safe Change

Prefer targeted changes.

Do not rewrite unrelated code.

Do not perform unrelated refactoring while implementing a feature.

## Architectural Changes

Changes to:

* Framework
* Database
* ORM
* Authentication strategy
* Session strategy
* Repository architecture
* Major dependencies

must be treated as architectural changes.

Document significant architectural changes.

## Agent Restriction

The agent must never alter architecture simply because the existing architecture is inconvenient to implement.
