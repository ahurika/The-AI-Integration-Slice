# Database Engineering Skill

## Purpose

Provide the standard workflow for PostgreSQL and Prisma implementation.

## Workflow

```text
Requirement
 ↓
Data Model
 ↓
Prisma Schema
 ↓
Migration
 ↓
Database
 ↓
Application Logic
 ↓
Testing
```

## Before Changes

Identify:

* Entity
* Fields
* Relationships
* Constraints
* Indexes
* Required/optional fields
* Sensitive information

## Implementation

1. Update schema.
2. Create appropriate migration.
3. Generate Prisma client where necessary.
4. Update application logic.
5. Test affected functionality.

## Query Principle

Retrieve only what is necessary.

Do not unnecessarily expose sensitive database fields.

## Completion

Database work is complete only when schema, migration, application behaviour, and verification are aligned.
