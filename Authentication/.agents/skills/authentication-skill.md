# Authentication Engineering Skill

## Purpose

Provide the standard workflow for implementing authentication functionality.

## Trigger

Use for:

* Registration
* Login
* Logout
* Sessions
* Password reset
* Email verification
* Authentication guards
* Protected routes

## Workflow

### 1. Read

Read:

```text
PRD.md
ARCHITECTURE.md
```

Then load:

```text
authentication-security.md
validation-error-handling.md
```

and any relevant UI/database rules.

### 2. Define the Flow

Document mentally:

```text
User
 ↓
Input
 ↓
Validation
 ↓
Authentication Logic
 ↓
Database
 ↓
Session / Result
 ↓
UI
```

### 3. Implement Server Logic

Keep sensitive authentication operations server-side.

### 4. Implement Persistence

Use Prisma.

### 5. Implement UI

Provide the required states and accessible interaction.

### 6. Test

Test:

* Success
* Invalid input
* Invalid credentials
* Failure conditions
* Security conditions

### 7. Review

Check:

* Secrets
* Passwords
* Sessions
* Tokens
* Error exposure
* Authorization
* Data exposure

## Completion

Authentication work is not complete until implementation, validation, security review, and relevant testing have been addressed.
