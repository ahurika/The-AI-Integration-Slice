# DOCUMENTATION.md — Assessment 1: The Authentication Slice

---

# 1. What This Is

This is a complete authentication slice built with Next.js, TypeScript, Prisma, and PostgreSQL. **Note: This assessment (Assessment 1) was cloned into this repository to serve as the foundation for Assessment 3 (The AI Integration Slice).** It takes a user from account creation through email verification, provides a forgot-password and password-reset flow, and ends at a minimal authenticated dashboard. Every security-sensitive operation — password hashing, session creation, token validation, rate limiting, and protected-route enforcement — runs on the server. The client handles presentation and user interaction only.

This slice deliberately excludes everything that is not authentication. There is no landing page, no marketing page, no dashboard functionality, no profile editing, no settings, no social sign-in, and no two-factor authentication. The dashboard exists solely to demonstrate that an authenticated session is working: it shows the signed-in user's name and a sign-out button, nothing more. The boundary is intentional — this is an authentication assessment, not a product.

---

# 2. How To Run It

## Prerequisites

1. **Node.js** — v18 or later (tested on v26.2.0)
2. **npm** — bundled with Node.js
3. **PostgreSQL** — v14 or later, running locally or accessible via a connection string

## Installation

```bash
git clone <repository-url>
cd authentication-slice
npm install
```

`npm install` runs `prisma generate` automatically via the `postinstall` script.

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | What it is for | Where it comes from |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Your local PostgreSQL instance or a hosted provider |
| `NEXT_PUBLIC_APP_URL` | Base URL used in reset links and client references | `http://localhost:3000` for local development |
| `NODE_ENV` | Runtime environment | Set automatically by Next.js; set to `production` in production |

## Database Setup

```bash
# Create the database schema and run migrations
node node_modules/prisma/build/index.js migrate dev --name init

# Or if npx is available:
npx prisma migrate dev --name init
```

## Start the application

```bash
npm run dev
```

## Local URL

`http://localhost:3000`

---

# 3. The Flow, Step By Step

## Step 1 — Create account

**User action:**
The user navigates to `/signup`, fills in their name, email address, and password, and submits the form.

**Frontend sends:**
`POST /api/auth/signup` with body `{ name, email, password }`.

**Server does:**

1. Reads the client IP and checks the signup rate limit (3 requests per hour per IP). Returns HTTP 429 with `Retry-After` header if exceeded.
2. Parses the body and validates it against `signUpSchema` (Zod). Returns HTTP 400 with field-level errors on failure.
3. Queries `prisma.user.findUnique({ where: { email } })` as a fast-path duplicate check.
4. If the user already exists, returns HTTP 409.
5. Hashes the password with Argon2id (64 MiB memory, 3 iterations, 4 threads).
6. Creates the user record with `prisma.user.create(...)`. If a simultaneous request races past the `findUnique` check, Prisma throws P2002 (unique constraint violation), which is caught and returned as HTTP 409 — the DB constraint is the authoritative last line of defence.
7. Generates a 6-digit verification code (cryptographically random), stores it with a 15-minute expiry, and returns it in the response body (for local development — production would send email).

**Code location:**
`app/api/auth/signup/route.ts`, `lib/auth/password.ts`, `lib/auth/tokens.ts`, `lib/auth/rateLimit.ts`, `lib/validation/auth.ts`

---

## Step 2 — Email verification

**User action:**
After signup the user is redirected to `/verify-email?email=<their-email>`. They enter the 6-digit code shown in the server response (or received via email in production) and submit the form.

**Frontend sends:**
`POST /api/auth/verify-email` with body `{ email, code }`.

**Server does:**

1. Validates the body against `verifyEmailSchema` (Zod). Returns HTTP 400 on failure.
2. Looks up the user by email.
3. Calls `validateVerificationCode(userId, code)`, which queries the `VerificationCode` table for a matching record, checks that `expiresAt` is in the future (server-side — not a UI timer), then deletes the record (single-use).
4. Updates `user.isEmailVerified = true`.
5. Returns HTTP 200. The client then redirects to `/login`.

**Code location:**
`app/api/auth/verify-email/route.ts`, `lib/auth/tokens.ts`

---

## Step 3 — Verification resend

**User action:**
The user clicks "Resend Code" on the `/verify-email` page.

**Frontend sends:**
`POST /api/auth/resend-code` with body `{ email }`.

**Server does:**

1. Checks the resend rate limit (3 requests per hour per IP). Returns HTTP 429 if exceeded.
2. Validates the email with Zod (`forgotPasswordSchema`).
3. Looks up the user. Returns a success-shaped response regardless (avoids enumeration).
4. Calls `createVerificationCode(userId)`, which checks the **server-side resend cooldown**: if the most recent code was created less than 60 seconds ago, it throws an error returned as HTTP 429. This is enforced in the database — a client-side timer alone is not sufficient.
5. Deletes old codes, generates a new one, stores it with a fresh 15-minute expiry.

**Code location:**
`app/api/auth/resend-code/route.ts`, `lib/auth/tokens.ts`

---

## Step 4 — Sign in

**User action:**
The user navigates to `/login`, enters their email and password, and submits.

**Frontend sends:**
`POST /api/auth/signin` with body `{ email, password }`.

**Server does:**

1. Checks the signin rate limit (5 requests per 15 minutes per IP). Returns HTTP 429 with `Retry-After` if exceeded.
2. Validates the body against `signInSchema` (Zod).
3. Looks up the user by email.
4. Calls `verifyPassword(plaintext, hash)` using Argon2id's `verify()`. Returns the same HTTP 401 `"Invalid email or password."` for both missing account and wrong password — intentional, to avoid revealing whether an email is registered.
5. Calls `createSession(userId)`, which generates a 64-hex-character cryptographically secure session ID, stores a `Session` record in the database with a 30-day expiry, and sets an `HttpOnly; Secure; SameSite=Lax` cookie containing only the session ID.

**Code location:**
`app/api/auth/signin/route.ts`, `lib/auth/session.ts`, `lib/auth/password.ts`

---

## Step 5 — Forgot password

**User action:**
The user navigates to `/forgot-password`, enters their email, and submits.

**Frontend sends:**
`POST /api/auth/forgot-password` with body `{ email }`.

**Server does:**

1. Checks the reset rate limit (3 requests per hour per IP). Returns HTTP 429 with `Retry-After` if exceeded.
2. Validates the body against `forgotPasswordSchema` (Zod).
3. Looks up the user. **Always returns HTTP 200 with the same message** whether or not the account exists — avoids account enumeration.
4. If the user exists: generates a 32-byte cryptographically secure random token, hashes it with SHA-256, stores only the hash in the `PasswordResetToken` table with a 1-hour expiry and `consumed: false`. Logs the raw token to the console (for local development — production would email it).

**Code location:**
`app/api/auth/forgot-password/route.ts`, `lib/auth/tokens.ts`

---

## Step 6 — Reset password

**User action:**
The user opens the reset link (`/reset-password?token=<raw-token>`), enters and confirms their new password, and submits the form.

**Frontend sends:**
`POST /api/auth/reset-password` with body `{ token, password, confirmPassword }`.

**Server does:**

1. Validates the body against `resetPasswordSchema` (Zod), which includes a `refine` check that `password === confirmPassword`.
2. Calls `validatePasswordResetToken(rawToken)`, which hashes the raw token with SHA-256, looks up the hash in `PasswordResetToken`, checks that it is not `consumed`, and checks that `expiresAt` is in the future. Throws on failure.
3. Hashes the new password with Argon2id.
4. Updates `user.passwordHash`.
5. Calls `consumePasswordResetToken(rawToken)`, which sets `consumed: true` — the token cannot be reused even before it expires.

**Code location:**
`app/api/auth/reset-password/route.ts`, `lib/auth/tokens.ts`, `lib/auth/password.ts`

---

## Step 7 — Protected dashboard

**User action:**
The user navigates to `/dashboard` after signing in.

**Frontend sends:**
A standard browser GET request to `/dashboard`, which automatically includes the `session_id` cookie.

**Server does:**

1. `DashboardPage` is a Next.js Server Component. At the top of the component, it calls `requireAuth()`.
2. `requireAuth()` calls `getSession()`, which reads the `session_id` cookie, queries `prisma.session.findUnique({ where: { id } })`, and checks that the session has not expired.
3. If the session is valid, the page renders the user's name and a sign-out button.
4. If the session is invalid or missing, `redirect('/login')` is called — Next.js returns a 307 redirect to the sign-in page.

**Code location:**
`app/dashboard/page.tsx`, `lib/auth/guards.ts`, `lib/auth/session.ts`

---

## Step 8 — Sign out

**User action:**
The signed-in user clicks the "Sign Out" button on the dashboard.

**Frontend sends:**
`POST /api/auth/signout` (no body).

**Server does:**

1. Reads the `session_id` cookie.
2. Deletes the `Session` record from the database — the session ID in the cookie is now worthless even if the cookie somehow persists.
3. Clears the cookie by calling `cookieStore.delete(SESSION_COOKIE)`.
4. Returns HTTP 200.

The client then redirects to `/login`.

**Code location:**
`app/api/auth/signout/route.ts`, `lib/auth/session.ts`

---

## Step 9 — Direct dashboard access while signed out

**User action:**
A user who is not signed in enters `http://localhost:3000/dashboard` directly in their browser.

**Frontend sends:**
A GET request to `/dashboard` with no `session_id` cookie.

**Server does:**

1. `DashboardPage` calls `requireAuth()`.
2. `getSession()` finds no cookie and returns `null`.
3. `requireAuth()` calls `redirect('/login')`, which Next.js converts to a 307 redirect.
4. The browser is sent to `/login`. The dashboard content is never rendered.

This protection happens in the Server Component, not in client-side navigation — it cannot be bypassed by disabling JavaScript or crafting a direct HTTP request.

**Code location:**
`lib/auth/guards.ts`, `lib/auth/session.ts`

---

# 4. The Data Model

## Table: `User`

**What it holds:**
One record per registered account. Stores credentials, identity, and verification state.

| Column | Type | Nullable? | Constraint/default | Why this decision? |
|---|---|---|---|---|
| `id` | `String` (UUID) | No | `@id @default(uuid())` | UUIDs avoid sequential ID enumeration attacks |
| `email` | `String` | No | `@unique` | Enforces one account per address at the database level — application checks alone are insufficient |
| `name` | `String` | No | — | Display name; required at signup |
| `passwordHash` | `String` | No | — | Argon2id hash; the plaintext password is never stored |
| `isEmailVerified` | `Boolean` | No | `@default(false)` | Tracks verification state; defaults to unverified on creation |

---

## Table: `Session`

**What it holds:**
One record per authenticated browser session. The client holds only the opaque ID in a cookie.

| Column | Type | Nullable? | Constraint/default | Why this decision? |
|---|---|---|---|---|
| `id` | `String` | No | `@id` | 64-char hex string from 32 random bytes; set by application, not DB |
| `userId` | `String` | No | FK → User, cascade delete | Associates session with its owner; deletes sessions when user is deleted |
| `expiresAt` | `DateTime` | No | — | Server-enforced expiry; sessions older than 30 days are rejected |

---

## Table: `VerificationCode`

**What it holds:**
One or zero codes per user, used during email verification.

| Column | Type | Nullable? | Constraint/default | Why this decision? |
|---|---|---|---|---|
| `id` | `String` (UUID) | No | `@id @default(uuid())` | Stable row identifier for deletion |
| `code` | `String` | No | — | 6-digit numeric code; deleted after use (single-use) |
| `userId` | `String` | No | FK → User, cascade delete | Associates the code with the user being verified |
| `expiresAt` | `DateTime` | No | — | Server-enforced 15-minute expiry; a UI countdown alone is not sufficient |

Index on `userId` for efficient lookup by user.

---

## Table: `PasswordResetToken`

**What it holds:**
One or zero active reset tokens per user.

| Column | Type | Nullable? | Constraint/default | Why this decision? |
|---|---|---|---|---|
| `tokenHash` | `String` | No | `@id` | SHA-256 hash of the raw token; the raw token never touches the DB |
| `userId` | `String` | No | FK → User, cascade delete | Associates the token with the requesting user |
| `expiresAt` | `DateTime` | No | — | 1-hour server-enforced expiry |
| `consumed` | `Boolean` | No | `@default(false)` | Marks the token as used; prevents reuse even before expiry |

---

## Table: `RateLimit`

**What it holds:**
One record per endpoint+IP combination, tracking request counts within a rolling window.

| Column | Type | Nullable? | Constraint/default | Why this decision? |
|---|---|---|---|---|
| `key` | `String` | No | `@id` | Composite key: `"endpoint:ip"` e.g. `"signin:192.168.1.1"` |
| `points` | `Int` | No | `@default(0)` | Number of requests made in the current window |
| `expiresAt` | `DateTime` | No | — | Window reset time; DB-backed so it survives server restarts |

---

## Which constraints make invalid state impossible?

| Constraint | Prevents |
|---|---|
| `@unique` on `User.email` | Two accounts with the same email address — the DB rejects a second `INSERT` with the same email even if the application-level check is bypassed (e.g. a race condition between simultaneous signups) |
| `@default(false)` on `User.isEmailVerified` | A user being created in a verified state without completing verification |
| FK `Session.userId → User.id` with cascade delete | Orphaned sessions for a deleted user |
| FK `VerificationCode.userId → User.id` with cascade delete | Orphaned verification codes for a deleted user |
| FK `PasswordResetToken.userId → User.id` with cascade delete | Orphaned reset tokens for a deleted user |
| `PasswordResetToken.consumed` boolean | A reset token being used more than once — set to `true` on first use, rejected on any subsequent attempt |
| `PasswordResetToken.tokenHash` as `@id` | Two reset tokens with the same hash (effectively: the same raw token being stored twice) |

---

# 5. The Concepts

> All implementation details below refer to actual files and functions in this repository.

## 5.1 Password Hashing

### What it is

Password hashing is a one-way transformation of a plaintext password into a fixed-length string that cannot be reversed. When a user signs in, the submitted password is run through the same algorithm and the output is compared to the stored hash — the plaintext is never stored or transmitted in a recoverable form.

### Why it is needed

If the database is compromised and passwords are stored in plaintext, every user's password is immediately exposed. Password hashing ensures that a database dump leaks only hashes, not passwords. An attacker must spend significant computational resources to crack each hash individually, and modern adaptive algorithms make that cost prohibitive.

### How I implemented it

Algorithm: **Argon2id** via the `argon2` npm package.

Configuration (`lib/auth/password.ts`):

```text
memoryCost: 65536   // 64 MiB of RAM required per hash computation
timeCost:   3       // 3 iterations over the memory
parallelism: 4      // 4 parallel threads
```

The `memoryCost` is the most important parameter: an attacker attempting 1,000 parallel hash attempts needs 64 GiB of RAM. The `id` variant combines Argon2i (side-channel resistance) and Argon2d (GPU resistance).

Usage:
- `hashPassword(plaintext)` — called in the signup and reset-password routes
- `verifyPassword(plaintext, storedHash)` — called in the signin route

### What I chose against, and why

**bcrypt** was considered and rejected because:
1. It truncates passwords at 72 bytes, creating an attack surface for passwords longer than that.
2. It is CPU-bound only, meaning modern GPUs can parallelize attacks cheaply.
3. Argon2id is OWASP's current first recommendation, specifically because of its memory-hard property.

---

## 5.2 Rate Limiting

### What it is

Rate limiting restricts how many requests a single client (identified by IP address) can make to a given endpoint within a time window. When the limit is exceeded, the server returns HTTP 429 Too Many Requests with a `Retry-After` header indicating when the window resets.

### Why it is needed

Without rate limiting, an attacker can automate credential-stuffing attacks (trying millions of username/password combinations), brute-force password-reset codes, or generate thousands of verification codes — all for free. Rate limiting makes these attacks economically and computationally expensive.

### How I implemented it

Implementation: `lib/auth/rateLimit.ts` — database-backed rate limiting using the PostgreSQL `RateLimit` table.

Limits:
```text
signin:   5 requests per 15 minutes per IP
signup:   3 requests per hour per IP
reset:    3 requests per hour per IP
resend:   3 requests per hour per IP
```

Each limit hit returns:
```text
HTTP 429 Too Many Requests
{ "error": "Too many requests. Please try again in N seconds." }
Retry-After: N
```

The DB-backed approach means limits survive server restarts and work correctly across multiple application instances — an in-memory approach would not.

### What I chose against, and why

An **in-memory rate limiter** (e.g. a `Map` keyed by IP) was considered and rejected because: it resets on every server restart, it does not work in a multi-instance deployment, and it is invisible to other processes. The database approach is slightly slower per request but is correct in all deployment scenarios.

---

## 5.3 Client-Side Versus Server-Side Validation

### What it is

**Client-side validation** runs in the browser before the request is sent — it provides immediate feedback (e.g. "Password must be at least 8 characters") without a round trip. **Server-side validation** runs in the API route handler after the request arrives — it is the authoritative check that cannot be bypassed by disabling JavaScript or sending a crafted HTTP request.

### Why it is needed

A user can bypass client-side validation entirely by sending a `curl` request directly to the API. If the server does not also validate input, malformed or malicious data reaches the database. Client validation improves user experience; server validation provides security. Both are required.

### How I implemented it

Single source of truth: `lib/validation/auth.ts`.

All five flows (signup, signin, verify-email, forgot-password, reset-password) have their Zod schemas declared once in this file. The same schemas are used in:
1. **API route handlers** — `schema.safeParse(body)` before any business logic runs
2. **React form components** — the same rules constrain what the client considers valid

Example — the password rule is declared once:
```text
password: z.string().min(8).max(128)
```
If this rule changes, it changes in one place and both the server and client reflect it automatically.

Rules that **cannot be enforced on the client**:
- Email uniqueness (requires a DB query)
- Password correctness during sign-in (requires the stored hash)
- Token validity (requires a DB lookup)
- Rate limits (require server-side state)

### What I chose against, and why

Maintaining **separate validation rules** in each route handler and each form component was rejected. Duplicated rules diverge over time — a server might reject a password the client accepted, or vice versa — creating a confusing user experience and a potential security gap.

---

## 5.4 Session Management and Why I Chose Sessions

### What it is

A session is a record of an authenticated interaction stored on the server. After the user signs in, the server creates a `Session` row in the database and sends the client an opaque session ID in an `HttpOnly` cookie. On every subsequent request, the browser sends the cookie and the server validates the session ID against the database.

### Why it is needed

Without a session mechanism, the server has no way to know whether an incoming request comes from a previously authenticated user. Every request would require the user to re-submit credentials. A properly managed session persists the authenticated state securely across multiple requests.

### How I implemented it

Strategy: **database-backed sessions** (not JWTs).

Session creation (`lib/auth/session.ts`, function `createSession`):
```text
1. Generate a 32-byte cryptographically random session ID (64 hex chars)
2. Store { id, userId, expiresAt } in the Session table (30-day TTL)
3. Set an HttpOnly cookie containing only the session ID
```

Cookie configuration:
```text
httpOnly: true    — JavaScript cannot read it (XSS mitigation)
secure:   true    — HTTPS only (false in local development)
sameSite: 'lax'   — Prevents CSRF for top-level navigations
path:     '/'     — Available across the entire application
expires:  30 days — Matches the DB expiresAt
```

### What I chose against, and why

**JWTs (JSON Web Tokens)** were considered and rejected because:
1. JWTs are stateless — once issued, they cannot be revoked before expiry. A signed-out session token could still be used if captured.
2. Database-backed sessions allow immediate logout by deleting the row. The session ID in any persisted cookie becomes worthless instantly.
3. For an authentication slice without a distributed microservice architecture, the database round-trip per request is acceptable and the revocability benefit is significant.

---

## 5.5 Token and Code Expiry

### What it is

Expiry is a time-limit stored in the database after which a verification code or password-reset token is rejected by the server, regardless of what the client presents.

### Why it is needed

Without expiry, a verification code or reset token obtained once remains valid indefinitely. An attacker who intercepts a code (e.g. from an old email) could use it weeks later. Expiry limits the window of opportunity.

### How I implemented it

Both token types store an `expiresAt` `DateTime` column in the database:

- `VerificationCode.expiresAt` — 15 minutes from creation
- `PasswordResetToken.expiresAt` — 1 hour from creation

Expiry is checked server-side (`lib/auth/tokens.ts`):
```text
if (record.expiresAt < new Date()) {
  throw new Error('...');
}
```

This check runs in the database-layer query response, not in client-side JavaScript. A UI countdown is purely cosmetic — the server always re-checks `expiresAt` against the current time when the request arrives, regardless of what the client says.

### What I chose against, and why

A **UI-only countdown** was explicitly rejected. The PRD (Engineering Requirement 5.5) is clear: "A UI countdown alone is not sufficient." A client-side timer can be manipulated, paused, or bypassed entirely by sending a direct HTTP request. The database timestamp is the authority.

---

## 5.6 Idempotency

### What it is

Idempotency means that performing the same operation multiple times produces the same result as performing it once. In the context of signup, it means that submitting the form twice (e.g. due to a double-click or a network retry) creates only one account.

### Why it is needed

Without idempotency, a double submission or a browser retry could create two accounts for the same email, resulting in duplicate records and unpredictable behaviour.

### How I implemented it

Two layers work together (`app/api/auth/signup/route.ts`):

1. **Application-level check:** `prisma.user.findUnique({ where: { email } })` — returns HTTP 409 if the user already exists (fast path for the common case).

2. **Database constraint as last line of defence:** The `@unique` constraint on `User.email` in `prisma/schema.prisma`. If two requests race past the `findUnique` check simultaneously, only one `create` will succeed. The second hits the Prisma P2002 error (unique constraint violation), which is caught and returned as HTTP 409 — never as a 500.

Walk-through for two simultaneous requests:
- Request A and B both read `findUnique` → both see no user → both proceed to `create`
- Request A's `create` succeeds → user row written
- Request B's `create` hits the unique constraint → Prisma throws P2002 → caught → HTTP 409
- Result: one account, two appropriate responses

### What I chose against, and why

Relying **only on the application-level `findUnique` check** was rejected. The check-then-act pattern has a race condition. The database unique constraint is the authoritative guard that makes the operation truly idempotent.

---

## 5.7 Database Constraints as a Last Line of Defence

### What it is

A database constraint is a rule enforced by the database engine itself, independent of application code. Even if application code has bugs, is bypassed, or processes concurrent requests, the database constraint cannot be circumvented.

### Why it is needed

Application code runs before the database write. If two requests arrive simultaneously, or if application validation is bypassed (e.g. via a direct API call), the application check may pass for both requests. The database constraint is the one enforcement point that always runs, for every write, regardless of how the request arrived.

### How I implemented it

Key constraints in `prisma/schema.prisma`:

```text
model User {
  email  String  @unique    ← database-level uniqueness guarantee
  ...
}

model PasswordResetToken {
  tokenHash String @id      ← token hash is the primary key; duplicates rejected
  consumed  Boolean @default(false)
  ...
}
```

The `@unique` on email means the database itself will reject a second account with the same email even if the application code fails to check first.

### What I chose against, and why

**Application-only validation** (checking for duplicates in code without a DB constraint) was rejected. Application code is one layer that can fail, be bypassed, or encounter race conditions. The database constraint is the layer that cannot be bypassed — it runs inside the transaction that writes the data.

---

## 5.8 Protected Routes

### What it is

A protected route is a URL that is only accessible to authenticated users. An unauthenticated user who requests it is redirected to the sign-in page — the protected content is never rendered or sent.

### Why it is needed

If route protection exists only in client-side navigation (e.g. checking whether a `useSession` hook returns a user and redirecting in a `useEffect`), an attacker can bypass it by disabling JavaScript, navigating directly via URL, or sending an HTTP request. The protection must happen on the server before any content is rendered.

### How I implemented it

Server-side guard (`lib/auth/guards.ts`, function `requireAuth`):

```text
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect('/login');   // Next.js 307 redirect — throws internally
  }
  return session;
}
```

`DashboardPage` (`app/dashboard/page.tsx`) is a **Server Component**. The very first thing it does is:

```text
const session = await requireAuth();
```

If there is no valid session, `redirect('/login')` is called before any JSX is evaluated or rendered. The client never sees the dashboard content.

### What I chose against, and why

**Client-only route guards** (checking auth state in a React hook and redirecting in `useEffect`) were rejected because they can be bypassed. A direct GET request to `/dashboard` with no cookies would render the page on the server and send the HTML to the client before any client-side check could run. The server-component guard runs before rendering and prevents this entirely.

---

# 6. What Went Wrong

> This section documents real problems encountered during implementation. It is intentionally left for completion during and after the build — do not invent entries before running the application.

## Problem 1 — NPM Installation Error in PowerShell

**Symptom:** The `npm install` command failed with an `UnauthorizedAccess` PSSecurityException in the terminal.

**Investigation:** Checked the terminal output, which indicated that running scripts was disabled on the system (`npm.ps1 cannot be loaded`). Tried using the `&&` operator to chain commands, which also failed due to PowerShell syntax restrictions.

**Cause:** The system's PowerShell Execution Policy restricted running external scripts like `npm.ps1`.

**Fix:** Ran the npm commands through the traditional command prompt using `cmd /c "npm install ..."` to bypass the PowerShell script restriction.

## Problem 2 — Prisma Schema Syntax Error

**Symptom:** Prisma migrations and studio failed to run, and the Neon database could not be accessed.

**Investigation:** Inspected `prisma/schema.prisma` and noticed a corrupted concatenation of `datasource` and `generator` blocks at the top of the file (e.g., `}generator client {` on the same line), along with a duplicated datasource definition.

**Cause:** Manual or script-based edits resulted in a malformed `schema.prisma` file, incorrectly merging two blocks onto the same line and duplicating the datasource definition.

**Fix:** Removed the malformed lines and the duplicate datasource block, properly separated the `generator client` and `datasource db` blocks, and successfully ran `npx prisma db push` to sync the database schema.

## Problem 3 — Verification Emails Not Being Sent (Nodemailer Crash)

**Symptom:** Users were not receiving verification emails. The signup API route would throw an error or crash after user creation.

**Investigation:** Reviewed the server logs and the `app/api/auth/signup/route.ts` and `lib/auth/email.ts` files. Noticed that if SMTP credentials were not set or were placeholders (`your-email@gmail.com`), `nodemailer` would throw an authentication error, crashing the route *after* creating the user in the database.

**Cause:** The `.env` file contained placeholder Gmail credentials instead of a valid email and App Password, causing SMTP authentication to fail. Additionally, the lack of error handling in `sendVerificationEmail` caused the unhandled rejection to crash the API route.

**Fix:** Wrapped the `transporter.sendMail()` call in a `try/catch` block in `lib/auth/email.ts` to swallow the error gracefully and log the verification code to the console in development mode. Advised updating the `.env` file with a valid Gmail account and a generated App Password.

---

# 7. What This Slice Does Not Handle

## Outside the brief

The following are deliberately not handled because they are outside Assessment 1:

- Landing pages.
- Marketing pages.
- Dashboard functionality.
- Profile editing.
- Settings.
- Social sign-in.
- Two-factor authentication.

## Limitations before real users

- **Email delivery:** The current implementation logs verification codes and reset tokens to the server console. A real deployment requires an email service (e.g. SendGrid, Resend, AWS SES) to send these to users.
- **Session sliding expiry:** Sessions have a fixed 30-day TTL from creation. A real system would typically refresh the expiry on each request to keep active sessions alive longer.
- **Account deletion:** There is no mechanism to delete an account. Cascade deletes on FK relationships are in place for when this is added.
- **HTTPS enforcement:** The cookie `secure` flag is `false` in development. In production, HTTPS is required and the flag must be `true`.

## Scale limitations

- **Rate limiting table growth:** The `RateLimit` table accumulates records and is never pruned. At scale, a cron job or TTL-based cleanup is needed, or an alternative store (Redis) should be used.
- **Single PostgreSQL instance:** There is no read replica or connection pooling (e.g. PgBouncer). Under high traffic, the connection pool may become the bottleneck.
- **Argon2id memory cost at scale:** At 64 MiB per hash and high concurrency, signup and login endpoints can consume significant RAM. The cost factor may need tuning for the target hardware.

## Time-limited omissions

None — all items above are either outside the assessment brief or documented known limitations, not omissions caused by time constraints.

---

# 8. If I Built This Again

If I built this again, the single biggest change I would make is to integrate a proper email delivery service from the very beginning rather than logging tokens to the console. Every flow — email verification, password reset, and account notifications — ultimately depends on email, and the current console-log approach means the happy path only works if a developer has direct access to server logs. Starting with a real email adapter (even a sandboxed development one like Mailpit or Resend's test mode) would have allowed end-to-end testing of every flow from day one, rather than requiring the workaround of reading tokens from terminal output during development and assessment.

---

# Evidence

The assessment requires evidence rather than claims. Add the actual screenshots/artifacts here or reference them from the `evidence/` directory.

## Evidence 1 — Stored password hash

**Required:** Screenshot of the users table showing a stored hash and no plain password.

`[ADD IMAGE/REFERENCE — capture after running the app and creating an account]`

## Evidence 2 — Direct signup request

**Required:** Exact curl command and server response.

```bash
# Run after starting the dev server with: npm run dev
# Replace with the actual values used

curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

**Server response:**

```text
[PASTE ACTUAL RESPONSE — capture after running the command above]
```

## Evidence 3 — Rate limit triggered

**Required:** Evidence showing the rate limit triggering and the returned status code.

```bash
# Hit signup 4 times in quick succession from the same IP (limit: 3/hour)
for i in 1 2 3 4; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3000/api/auth/signup \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"User $i\",\"email\":\"user$i@example.com\",\"password\":\"password123\"}"
done
# Expected: 201 201 201 429
```

`[ADD SCREENSHOT OR TERMINAL OUTPUT]`

## Evidence 4 — Verification-code expiry

**Required:**

- Screenshot before expiry (VerificationCode record in DB with future expiresAt).
- Screenshot after expiry (attempt to use the code rejected by the server).

`[ADD SCREENSHOTS — capture after running the app]`

---

# Defence Questions

Prepare answers to these exact questions:

**1. Why that hashing algorithm, and what happens if I set the cost factor to 4?**

I chose Argon2id because it is OWASP's first recommendation: it is memory-hard (making GPU/ASIC attacks expensive) and combines side-channel resistance with GPU resistance. The current `timeCost` is 3 (iterations over the 64 MiB memory block).

Setting `timeCost` to 4 would make each hash computation take approximately 33% longer on the server, increasing resistance to brute force. However, it would also increase sign-in latency for legitimate users. Setting it below the recommended minimum (OWASP recommends at least 1 iteration at 64 MiB) would weaken the hash significantly — an attacker with a GPU farm could attempt millions of hashes per second.

**2. Show me the exact line where the session is created and tell me what is inside the cookie.**

Session creation: `lib/auth/session.ts`, function `createSession`, line `await prisma.session.create(...)`, followed immediately by `cookieStore.set(SESSION_COOKIE, id, { httpOnly: true, ... })`.

The cookie (`session_id`) contains **only the session ID** — a 64-character hexadecimal string generated from 32 cryptographically random bytes. It contains no user data, no email, no role, and no expiry information. All of that lives in the `Session` table row on the server. The cookie is `HttpOnly` (no JavaScript access), `Secure` (HTTPS only in production), and `SameSite=Lax`.

**3. I send your signup request twice in the same second. Walk me through what happens in the database.**

Both requests pass rate limiting (they share the same IP window but the limit is 3/hour). Both call `findUnique({ where: { email } })` — at the exact same millisecond, neither finds an existing user. Both proceed to `hashPassword` (the hashing takes ~100ms at the configured cost). Both then call `prisma.user.create(...)`.

The first `create` acquires a row lock on the unique index for that email and writes the row. The second `create` attempts to insert the same email — PostgreSQL sees the unique constraint violation and throws. Prisma surfaces this as a `PrismaClientKnownRequestError` with code `P2002`. The route handler catches P2002 and returns HTTP 409 `"An account with this email already exists."` — no duplicate account is created.

**4. Which of your validation rules cannot be enforced on the client, and why?**

- **Email uniqueness:** Checking whether an email is already registered requires a database query. The client has no database access.
- **Password correctness (sign-in):** Verifying a password against a stored Argon2id hash requires the hash, which is never sent to the client (that would expose it).
- **Token validity (reset/verify):** Whether a token or code is valid, unexpired, and unconsumed requires a database lookup — the client cannot know the server-side state of a token.
- **Rate limits:** Rate limit counters are stored in the database and keyed by server-observed IP address — the client cannot observe or enforce these.
