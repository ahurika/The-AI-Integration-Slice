# Authentication Slice — System Architecture

**Project:** Authentication Slice  
**Version:** 1.0  
**Status:** Pre-coding architecture specification  
**Stack:** Next.js + TypeScript + Prisma + PostgreSQL
 
---

## 1. Architecture Overview

The Authentication Slice is a modular authentication system built with Next.js, TypeScript, Prisma, and PostgreSQL.

The architecture separates:

- Application routes and pages
- Reusable UI components
- Authentication and business logic
- Database access
- Prisma schema and migrations
- Static assets
- Evidence and audit artifacts
- Project documentation

The system should be structured before implementation begins so that the repository has a predictable separation of concerns.

The architecture follows a **feature-oriented application structure with a clear separation between presentation, application logic, and data access**.

---

# 2. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js |
| Language | TypeScript |
| UI | React |
| Styling | Project-approved styling system |
| Database ORM | Prisma |
| Database | PostgreSQL |
| Authentication | Application authentication layer |
| Package Manager | npm |
| Environment Management | `.env` / `.env.example` |
| Version Control | Git / GitHub |

---

# 3. Repository Architecture

The repository must exist in the following structure **before coding begins**:

```text
authentication-slice/
│
├── PRD.md
├── ARCHITECTURE.md
├── DOCUMENTATION.md
├── README.md
│
├── evidence/
│   └── .gitkeep
│
├── app/
├── components/
├── lib/
├── prisma/
│
├── public/
│
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

This structure is an architectural requirement.

Developers should not begin implementation by creating an unstructured collection of files and folders and attempting to organize them later.

---

# 4. Directory Responsibilities

## 4.1 `app/`

The `app/` directory contains the Next.js application routes, layouts, loading states, error states, and route-specific UI.

Example:

```text
app/
├── layout.tsx
├── page.tsx
│
├── login/
│   └── page.tsx
│
├── signup/
│   └── page.tsx
│
├── forgot-password/
│   └── page.tsx
│
├── reset-password/
│   └── page.tsx
│
├── verify-email/
│   └── page.tsx
│
└── api/
    └── auth/
```

The exact route structure may expand during implementation, but authentication-related routes must remain grouped logically.

### Responsibility

`app/` is responsible for:

- Routing
- Page composition
- Route-level UI
- Server/client boundaries
- Authentication route handlers
- Loading and error states

`app/` should **not** become the location for reusable business logic.

---

# 5. `components/`

The `components/` directory contains reusable UI components.

Example:

```text
components/
├── auth/
│   ├── LoginForm.tsx
│   ├── SignupForm.tsx
│   ├── ForgotPasswordForm.tsx
│   ├── ResetPasswordForm.tsx
│   └── VerifyEmail.tsx
│
└── ui/
    ├── Button.tsx
    ├── Input.tsx
    ├── FormField.tsx
    └── ...
```

### Responsibility

Components should contain presentation and interaction logic that can reasonably be reused.

Components should not directly contain:

- Prisma queries
- Database connection logic
- Secret credentials
- Environment-specific infrastructure logic

---

# 6. `lib/`

The `lib/` directory contains application-level utilities, authentication logic, validation, database access, and other reusable non-UI functionality.

Example:

```text
lib/
├── auth/
│   ├── session.ts
│   ├── password.ts
│   ├── tokens.ts
│   └── guards.ts
│
├── db/
│   └── prisma.ts
│
├── validation/
│   └── auth.ts
│
└── utils/
```

### Responsibility

`lib/` is the primary location for logic that should not live inside React components or route pages.

Examples include:

- Password hashing and verification
- Session management
- Token generation and validation
- Authentication guards
- Input validation
- Database client access
- Shared utilities

---

# 7. `prisma/`

The `prisma/` directory contains database schema and migration-related files.

Expected structure:

```text
prisma/
├── schema.prisma
└── migrations/
```

### Responsibility

Prisma owns the application's database schema representation and database migrations.

The authentication data model should be defined here rather than embedded inside application code.

Potential entities include:

- User
- Session
- Verification token
- Password reset token

The final schema must follow the approved PRD requirements.

---

# 8. `public/`

The `public/` directory contains static assets that are safe to expose publicly.

Examples:

```text
public/
├── images/
├── icons/
└── ...
```

Authentication secrets, tokens, database credentials, or private files must never be placed in `public/`.

---

# 9. `evidence/`

The `evidence/` directory stores project evidence required for the assessment and documentation process.

Initial structure:

```text
evidence/
└── .gitkeep
```

Evidence may later include:

- Screenshots
- Authentication flow evidence
- Test evidence
- Security validation evidence
- UX audit evidence
- Implementation proof

Sensitive credentials, secrets, session tokens, private keys, and personal user data must not be committed to this directory.

---

# 10. Root Documentation Files

## `PRD.md`

Defines **what is being built and why**.

It contains:

- Product problem
- Goals
- Users
- Requirements
- User flows
- Functional requirements
- Non-functional requirements
- Acceptance criteria
- Scope
- Repository structure requirement

---

## `ARCHITECTURE.md`

Defines **how the system will be structured technically**.

It contains:

- Technology stack
- Repository architecture
- Directory responsibilities
- Application architecture
- Authentication architecture
- Data architecture
- Security architecture
- Request/data flow
- Environment requirements
- Development principles

---

## `DOCUMENTATION.md`

Defines **how the implemented system works and how it should be used**.

It should document:

- Setup
- Installation
- Environment variables
- Database setup
- Running the application
- Authentication flows
- Testing
- Troubleshooting
- Deployment considerations

This file should be updated alongside implementation.

---

## `README.md`

Provides the project's entry point for developers, reviewers, and assessors.

It should contain:

- Project overview
- Key features
- Technology stack
- Repository structure
- Setup instructions
- Development commands
- Links to PRD, architecture, and documentation

---

# 11. Authentication Architecture

The authentication system should follow this high-level flow:

```text
User
 │
 ▼
Authentication UI
 │
 ▼
Route / Server Action
 │
 ▼
Input Validation
 │
 ▼
Authentication Logic
 │
 ├───────────────┐
 ▼               ▼
Database       Session
 │               │
 ▼               ▼
User Record    Authenticated State
 │
 ▼
Response
 │
 ▼
Application
```

Authentication logic must not be implemented directly inside UI components.

---

# 12. Authentication Responsibilities

## Registration

The registration flow should:

1. Receive user input.
2. Validate the input.
3. Check whether the account already exists.
4. Securely process the password.
5. Create the user record.
6. Establish the appropriate authentication state.
7. Trigger required verification behaviour.
8. Return an appropriate response.

---

## Login

The login flow should:

1. Receive credentials.
2. Validate the input.
3. Locate the user.
4. Verify the credentials.
5. Create or establish the appropriate session.
6. Return the authenticated state or appropriate error.

Authentication errors should not unnecessarily reveal sensitive information about whether a specific account exists.

---

## Logout

Logout should:

1. Identify the active session.
2. Invalidate or remove the session.
3. Clear the relevant client-side authentication state.
4. Redirect or return the user to the appropriate unauthenticated state.

---

## Password Reset

The password-reset architecture should separate:

```text
Request reset
     │
     ▼
Generate secure token
     │
     ▼
Store token securely
     │
     ▼
Send reset mechanism
     │
     ▼
User submits token
     │
     ▼
Validate token
     │
     ▼
Set new password
     │
     ▼
Invalidate token
```

Reset tokens must be short-lived and single-use.

---

## Email Verification

Where required by the PRD:

```text
Registration
     │
     ▼
Create account
     │
     ▼
Generate verification token
     │
     ▼
Verification mechanism
     │
     ▼
User verifies account
     │
     ▼
Mark account verified
```

Verification tokens must be protected against reuse and unauthorized access.

---

# 13. Data Architecture

The application uses PostgreSQL as the persistent data store and Prisma as the ORM.

Conceptually:

```text
Application
     │
     ▼
Prisma Client
     │
     ▼
Prisma Schema
     │
     ▼
PostgreSQL
```

Application code should interact with the database through Prisma rather than directly constructing raw database connections throughout the application.

---

# 14. Core Data Model

The authentication system is expected to require concepts similar to:

```text
User
 │
 ├── credentials
 ├── account status
 ├── verification state
 └── timestamps
      │
      ├── Session
      │
      └── Authentication Tokens
```

The exact fields and relationships must be defined in `prisma/schema.prisma` based on the approved PRD.

---

# 15. Session Architecture

The authentication system must maintain a clear distinction between:

- Authentication credentials
- Authentication tokens
- Sessions
- User identity

A session represents an authenticated interaction with the application.

Session data should be designed so that sensitive information is not unnecessarily exposed to the client.

The session strategy must also provide a mechanism for:

- Session creation
- Session validation
- Session expiration
- Session invalidation
- Logout

---

# 16. Security Architecture

Security is a first-class architectural requirement.

The implementation must address:

### Password security

Passwords must never be stored in plaintext.

Passwords must be processed using an appropriate password-hashing mechanism.

### Secrets

Secrets must be stored through environment variables.

They must never be hard-coded into source files.

### Environment variables

Local secrets belong in:

```text
.env
```

The repository should only contain:

```text
.env.example
```

with placeholder values.

### Git protection

`.gitignore` must prevent sensitive environment files and generated artifacts from being committed.

At minimum, the project should account for:

```text
.env
.env.local
.next/
node_modules/
```

as appropriate for the project.

---

# 17. Environment Architecture

The project should provide an `.env.example` file documenting the required environment variables without exposing real credentials.

Example:

```env
DATABASE_URL="your-postgresql-connection-string"

AUTH_SECRET="your-authentication-secret"
```

The actual variable names must remain consistent across:

- Application code
- Prisma configuration
- Deployment configuration
- Documentation

No real credentials should be committed.

---

# 18. Validation Architecture

Authentication input should be validated before reaching business logic or database operations.

Conceptually:

```text
Raw Input
   │
   ▼
Schema Validation
   │
   ├── Invalid → Validation Error
   │
   ▼
Normalized Input
   │
   ▼
Authentication Logic
```

Validation should cover relevant fields such as:

- Email
- Password
- Password confirmation
- Reset tokens
- Verification tokens

depending on the specific flow.

---

# 19. Error Handling

Authentication errors should be:

- Predictable
- User-friendly
- Safe
- Consistent

The system should avoid exposing implementation details such as:

- Database errors
- Stack traces
- Secret values
- Internal authentication state
- Sensitive account information

Development logs may contain additional diagnostic information, but production responses must remain appropriately sanitized.

---

# 20. Application Layer Separation

The architecture follows this conceptual separation:

```text
┌──────────────────────────────┐
│            UI                │
│         app/components       │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│      Application Logic       │
│             lib/             │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Data Access Layer      │
│          Prisma              │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│         PostgreSQL           │
└──────────────────────────────┘
```

The primary rule is:

> UI should consume application behaviour; UI should not own database behaviour.

---

# 21. Server and Client Boundaries

Authentication-sensitive operations should execute on the server whenever possible.

Operations involving:

- Password verification
- Session creation
- Session validation
- Token validation
- Database access
- Authentication secrets

must not be unnecessarily exposed to client-side JavaScript.

Client components should handle presentation and user interaction while server-side logic handles sensitive operations.

---

# 22. Dependency Direction

Dependencies should flow inward:

```text
UI
 ↓
Application Logic
 ↓
Data Access
 ↓
Database
```

The database layer should not depend on UI components.

Authentication utilities should not depend on visual components.

Reusable UI components should remain independent of Prisma.

---

# 23. Pre-Coding Requirements

Before implementation begins, the repository must contain:

```text
PRD.md
ARCHITECTURE.md
DOCUMENTATION.md
README.md
evidence/.gitkeep
app/
components/
lib/
prisma/
public/
.env.example
.gitignore
package.json
tsconfig.json
```

The folders may initially be empty where implementation files have not yet been created.

The purpose of this requirement is to establish the project's structure before code is introduced.

---

# 24. Development Principles

The implementation should follow these principles:

1. **Build from the PRD.**
2. **Follow the approved architecture.**
3. **Keep authentication logic separate from presentation.**
4. **Keep database access centralized.**
5. **Never expose secrets.**
6. **Validate input before processing it.**
7. **Treat authentication failures securely.**
8. **Keep reusable UI components independent of database logic.**
9. **Document architectural decisions.**
10. **Do not introduce unnecessary dependencies or architectural complexity.**

---

# 25. Definition of Architectural Completion

The architecture is considered established when:

- The repository structure exists.
- `PRD.md` defines the product requirements.
- `ARCHITECTURE.md` defines the technical structure.
- `DOCUMENTATION.md` defines the documentation/setup requirements.
- `README.md` provides project orientation.
- Authentication responsibilities are separated from UI.
- Database responsibilities are separated from application logic.
- Environment and security requirements are defined.
- The project is ready for implementation without requiring developers to invent the foundational repository structure.

---

## Architecture Principle

> **Define the structure first. Build the authentication system second.**

The repository should be understandable before the first authentication feature is implemented.