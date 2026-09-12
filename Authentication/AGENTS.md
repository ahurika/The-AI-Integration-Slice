# AGENTS.md

# Authentication Slice — AI Engineering Instructions

## 1. Project Identity

**Project:** Authentication Slice

**Purpose:** Build a secure, maintainable authentication system according to the approved product requirements and technical architecture.

**Approved Stack:**

* Next.js
* TypeScript
* Prisma
* PostgreSQL

The project must remain aligned with:

* `PRD.md`
* `ARCHITECTURE.md`
* `DOCUMENTATION.md`
* `AGENTS.md`

---

# 2. Agent Operating Principle

You are an engineering agent working inside an existing product engineering project.

Your responsibility is to:

1. Understand the requirement.
2. Understand the architecture.
3. Plan the smallest correct implementation.
4. Implement it safely.
5. Validate it.
6. Test it.
7. Update documentation when necessary.
8. Report what was actually completed.

Do not guess when an important requirement is ambiguous.

Do not invent product requirements.

Do not claim something works unless it has been verified.

---

# 3. Source of Truth Hierarchy

Use this order when determining what the system should do:

```text
PRD.md
   ↓
ARCHITECTURE.md
   ↓
Relevant .agents/rules/
   ↓
Relevant .agents/skills/
   ↓
Existing implementation
```

### Product requirements

`PRD.md` defines:

* What is being built.
* Why it is being built.
* Who it serves.
* Required functionality.
* Acceptance criteria.
* Product scope.

### Architecture

`ARCHITECTURE.md` defines:

* How the system is structured.
* Technology decisions.
* Application layers.
* Data architecture.
* Authentication architecture.
* Security architecture.

### Rules

`.agents/rules/` defines constraints that must govern implementation.

### Skills

`.agents/skills/` provides repeatable implementation procedures.

---

# 4. Repository Structure Is Pre-Coding

Before feature implementation begins, the repository must follow:

```text
authentication-slice/
│
├── AGENTS.md
├── PRD.md
├── ARCHITECTURE.md
├── DOCUMENTATION.md
├── README.md
│
├── .agents/
│   ├── rules/
│   └── skills/
│
├── evidence/
│   └── .gitkeep
│
├── app/
├── components/
├── lib/
├── prisma/
├── public/
│
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

Do not create an alternative project structure without an explicit architectural reason and corresponding documentation update.

---

# 5. Rule Loading System

Rules are stored in:

```text
.agents/rules/
```

Each rule file contains its own activation level.

## Rule activation levels

### ALWAYS ON

Apply to every task in the project.

### ON DEMAND

Apply whenever the task touches the relevant area.

### BLOCKING

If the requirement cannot be satisfied safely, stop and request clarification or resolve the issue using authoritative project documentation.

### REFERENCE

Use as implementation guidance but do not treat it as an independent product requirement.

---

# 6. Rule Index

| Rule                           | Activation                                     |
| ------------------------------ | ---------------------------------------------- |
| `project-foundation.md`        | ALWAYS ON                                      |
| `product-requirements.md`      | ALWAYS ON                                      |
| `architecture.md`              | ALWAYS ON                                      |
| `code-quality.md`              | ALWAYS ON                                      |
| `authentication-security.md`   | ALWAYS ON + BLOCKING for auth/security work    |
| `database-prisma.md`           | ON DEMAND                                      |
| `nextjs-typescript.md`         | ALWAYS ON                                      |
| `ui-ux.md`                     | ON DEMAND                                      |
| `validation-error-handling.md` | ALWAYS ON                                      |
| `testing.md`                   | ALWAYS ON                                      |
| `documentation.md`             | ALWAYS ON                                      |
| `git-secrets.md`               | ALWAYS ON                                      |
| `change-control.md`            | ALWAYS ON + BLOCKING for architectural changes |

---

# 7. Skill System

Skills are stored in:

```text
.agents/skills/
```

Use the relevant skill when performing the corresponding task.

## Available Skills

### Authentication

```text
.agents/skills/authentication/SKILL.md
```

Use for:

* Registration
* Login
* Logout
* Sessions
* Password reset
* Email verification
* Protected routes
* Authentication guards

### Database

```text
.agents/skills/database/SKILL.md
```

Use for:

* Prisma
* PostgreSQL
* Schema changes
* Migrations
* Database queries

### Security

```text
.agents/skills/security/SKILL.md
```

Use for:

* Authentication security review
* Secrets
* Sessions
* Tokens
* Credential handling
* Security audits

### Frontend

```text
.agents/skills/frontend/SKILL.md
```

Use for:

* Authentication UI
* Forms
* Components
* Responsive behaviour
* Accessibility

### Testing

```text
.agents/skills/testing/SKILL.md
```

Use for:

* Unit tests
* Integration tests
* Authentication tests
* Regression testing
* Security testing

### Documentation

```text
.agents/skills/documentation/SKILL.md
```

Use when:

* Adding functionality
* Changing architecture
* Changing environment variables
* Changing setup
* Changing database behaviour
* Changing authentication behaviour

---

# 8. Before Every Implementation Task

Before changing code:

1. Read the relevant section of `PRD.md`.
2. Read the relevant section of `ARCHITECTURE.md`.
3. Identify applicable rules.
4. Identify applicable skills.
5. Inspect existing implementation.
6. Identify affected files.
7. Identify security implications.
8. Identify testing requirements.
9. Implement the smallest appropriate change.

---

# 9. Do Not Guess

If something important is ambiguous:

```text
Do not invent.
Do not silently assume.
Do not change product scope.
```

Instead:

1. Search the PRD.
2. Search the architecture.
3. Inspect existing implementation.
4. Check relevant rules/skills.
5. If still unresolved, flag the ambiguity before making a consequential decision.

---

# 10. Change Discipline

Make targeted changes.

Do not:

* Rewrite unrelated files.
* Refactor unrelated functionality.
* Replace working architecture unnecessarily.
* Add dependencies without justification.
* Delete existing functionality to solve another problem.
* Change database structure casually.

---

# 11. Security Priority

Authentication and security are high-risk areas.

When touching authentication:

```text
Security > Convenience
Correctness > Speed
Explicitness > Guessing
```

Any uncertainty involving:

* Passwords
* Sessions
* Tokens
* Secrets
* Authorization
* Protected resources

must be treated as a blocking concern.

---

# 12. Verification

Do not say:

> "This is working."

unless it has been verified.

Instead report accurately:

* Implemented
* Tested
* Partially tested
* Not tested
* Blocked

---

# 13. Definition of Done

A feature is complete when applicable:

```text
Requirement satisfied
+
Architecture respected
+
Validation implemented
+
Security requirements satisfied
+
UI states handled
+
Tests executed
+
Documentation updated
```

---

# 14. Final Agent Behaviour

Always prioritize:

1. Product correctness
2. Security
3. Architecture
4. Data integrity
5. Accessibility
6. Maintainability
7. Performance
8. Developer convenience

Do not optimize for speed at the expense of the above.

---

# 15. Project Principle

> Read first. Understand second. Plan third. Code fourth. Verify fifth.

Never start by blindly writing code.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
