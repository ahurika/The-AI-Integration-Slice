# PRD — Assessment 1: The Authentication Slice

**Project:** Product Engineering Bootcamp — Four Build Assessments  
**Assessment:** 1 — The Authentication Slice  
**Time budget:** 14–18 hours  
**Source of truth:** Four Build Assessments brief, Assessment 1

---

## 1. Product Goal

Build a complete authentication system as a single working slice, with its own interface, that takes a user from account creation/sign-in through the required verification and password-recovery flows and ends at a deliberately minimal placeholder dashboard.

The slice must demonstrate that authentication works correctly both from the browser and when requests are sent directly to the server. Security-sensitive behaviour must be enforced server-side and backed by database constraints where required.

> **Scope rule:** This is an authentication assessment, not a full product. Anything not explicitly required below is out of scope.

---

## 2. What To Build

### 2.1 Screens

Build only these screens/flows:

1. **Create account**
2. **Sign in**
3. **Forgot password**
   - Request form only.
4. **Reset password**
   - Form reached from the emailed reset link.
5. **Email verification**
   - Verification code entry.
   - Resend control.
6. **Placeholder dashboard**
   - Shows the signed-in user's name.
   - Shows a sign-out button.
   - Contains nothing else.

### 2.2 Required behaviours

The completed slice must support:

- A new user can create an account.
- The new user can verify their email.
- After verification, the user can reach the dashboard.
- A returning user can sign in.
- A user who forgets their password can request a reset.
- The user can use the password-reset link/token to set a new password.
- The user can then sign in using the new password.
- A signed-out user who directly enters the dashboard URL is sent to sign in.
- Signing out properly ends the session.

---

## 3. Do Not Build

The following are explicitly out of scope:

- Landing page.
- Marketing page.
- Dashboard features.
- Profile editing.
- Settings.
- Social sign-in.
- Two-factor authentication.
- Any other feature not required by this authentication flow.

### Dashboard boundary

The dashboard is intentionally minimal:

> **You are signed in** + the user's name + a sign-out button.

Do not turn the dashboard into a product dashboard.

---

## 4. Functional Requirements

### FR-01 — Account creation

A user can submit the create-account form with the required account information.

The server must validate the submitted data using the declared validation schema and must not rely on browser validation.

The user's password must never be stored as plain text.

The email address must be unique at the database level.

The signup operation must be idempotent so that a double submission creates only one account.

### FR-02 — Email verification

After account creation, the user must be able to verify their email using a verification code.

The verification code must:

- Be stored in the database.
- Have an expiry stored/enforced by the server/database state.
- Be rejected after expiry.
- Support a resend action.
- Have a resend cooldown enforced by the server.

### FR-03 — Sign in

A returning user can sign in with their credentials.

Signin must:

- Validate input server-side.
- Use the stored password hash for password verification.
- Be rate limited.
- Create a properly configured session when authentication succeeds.

### FR-04 — Forgot password

A user can submit a password-reset request.

The endpoint must be rate limited.

The resulting reset mechanism must use a time-limited token.

### FR-05 — Reset password

A user reaching the reset form through the reset mechanism can set a new password.

The reset token must:

- Be time limited.
- Be single use.
- Not be reusable after successful consumption.

### FR-06 — Session and protected dashboard

An authenticated user can reach the placeholder dashboard.

An unauthenticated user who directly requests the dashboard must be redirected to sign in.

The session must end correctly when the user signs out.

### FR-07 — Validation

Validation rules must be declared as schemas rather than duplicated/scattered through individual handlers.

Client-side validation should mirror the server-side rules to provide immediate feedback.

Server-side validation remains authoritative.

### FR-08 — Rate limiting

Rate limiting is required on:

- Signin.
- Signup.
- Password-reset request.
- Verification-code resend.

The implementation must produce evidence that the rate limit triggers.

The rate-limit response must include an appropriate status code and retry indication.

---

## 5. Engineering Requirements

Every item in this section is required for the assessment.

### 5.1 Password hashing

Use an **adaptive password-hashing algorithm**, not a general-purpose hash.

The implementation must make the hashing choice explicit and document:

- Why the selected algorithm was chosen.
- Its configured cost/work factor.
- What the cost factor means.
- The alternative considered and why it was not chosen.

### 5.2 Server-side validation

Every input must be validated on the server.

Validation rules must be declared as schemas rather than scattered through request handlers.

Client-side validation must mirror the server schema for user feedback.

### 5.3 Rate limiting

Rate-limit all four required endpoints:

- Signin.
- Signup.
- Password-reset request.
- Verification-code resend.

Do not forget the resend route.

### 5.4 Session management

Use session-based authentication or another clearly justified session approach.

The session cookie must be configured correctly.

The documentation must identify:

- Where the session is created.
- What the cookie contains.
- The relevant cookie security configuration.

### 5.5 Verification-code expiry

Verification codes must expire based on database/server state.

A UI countdown alone is not sufficient.

The expired state must be enforceable even when the request bypasses the interface.

### 5.6 Resend cooldown

The verification-code resend cooldown must be enforced on the server.

A client-side timer alone is insufficient.

### 5.7 Password-reset tokens

Password-reset tokens must be:

- Time limited.
- Single use.

### 5.8 Database email uniqueness

The database must contain a unique constraint on email.

Application-level checks alone are not sufficient.

### 5.9 Idempotent signup

A repeated signup request caused by double submission must not create duplicate accounts.

The endpoint and database design must work together to make this safe.

### 5.10 Protected route handling

The dashboard must not be reachable without a valid authenticated session.

The protection must happen on the server/protected-route boundary, not only through client-side navigation.

### 5.11 Accessible form inputs

Input groups must have:

- Labels.
- Programmatic label-to-input binding.
- Visible focus states.

---

## 6. Suggested Data Model Requirements

The exact schema should be determined during implementation, but the database must be capable of representing at minimum:

### User/account state

A user/account record needs to support:

- Unique email.
- Password hash.
- User name.
- Email-verification state.

### Verification state

Verification data needs to support:

- Verification code.
- Expiry.
- Resend cooldown state as needed by the implementation.

### Password-reset state

Reset data needs to support:

- Reset token or secure token representation.
- Expiry.
- Single-use/consumed state as required by the implementation.

### Session state

Session data needs to support:

- An authenticated session.
- Association with its user.
- Expiry/invalidation.

> Do not copy this section directly into Prisma without making implementation decisions. The final schema must be documented with the reason for each type, constraint, and nullable/non-nullable decision.

---

## 7. Required Evidence

The repository/documentation must include evidence rather than only claims.

### Evidence 1 — Password hashing

Include a screenshot of the users table showing a stored password hash so it is visible that no plain password exists.

### Evidence 2 — Direct signup request

Include:

- The exact `curl` command used to hit the signup endpoint directly.
- The server response.

The evidence should demonstrate that the server validates requests independently of the browser.

### Evidence 3 — Rate limiting

Include evidence of the rate limit triggering, including the returned status code.

For an excellent submission, the response should also show a retry indication.

### Evidence 4 — Verification-code expiry

Include:

- A screenshot of a verification-code record in the database before expiry.
- A screenshot of the same record/state after expiry.

---

## 8. Required Documentation

Create:

```text
DOCUMENTATION.md
```

at the repository root.

It must contain these eight sections, in this exact order:

1. What This Is
2. How To Run It
3. The Flow, Step By Step
4. The Data Model
5. The Concepts
6. What Went Wrong
7. What This Slice Does Not Handle
8. If I Built This Again

### Section 5 concepts

Each concept must have its own subsection and answer all four questions:

1. What it is.
2. Why it is needed.
3. How I implemented it.
4. What I chose against, and why.

Required concepts:

- Password hashing.
- Rate limiting.
- Client-side versus server-side validation.
- Session management and why sessions or tokens were chosen.
- Token and code expiry, and why expiry must live in the database.
- Idempotency.
- Database constraints as a last line of defence.
- Protected routes.

---

## 9. Defence Questions

The implementation and documentation must prepare for these exact questions:

1. **Why that hashing algorithm, and what happens if I set the cost factor to 4?**
2. **Show me the exact line where the session is created and tell me what is inside the cookie.**
3. **I send your signup request twice in the same second. Walk me through what happens in the database.**
4. **Which of your validation rules cannot be enforced on the client, and why?**

---

## 10. Grading Targets

### Pass

The submission should have:

- All required screens working.
- All engineering requirements present.
- Complete documentation with all eight sections.

### Excellent

Aim for:

- Validation rules declared once and shared between client and server.
- `curl` evidence showing the server rejecting input that the browser would have blocked.
- Section 5 answering all four questions for every required concept.
- Correct rate-limit status code with a retry indication.

---

## 11. Known Traps To Avoid

Do not:

- Validate only on the client.
- Build a real dashboard instead of the placeholder.
- Leave verification codes with no server-side/database expiry.
- Treat an interface countdown as security.
- Commit `.env`.
- Rate-limit signin but forget verification-code resend.
- Add features outside the brief.

---

## 12. Repository Boundary

The repository should contain only what is necessary to run, understand, test, and document this authentication slice.

Expected high-level structure will depend on the chosen implementation, but the root must include:

```text
/
├── DOCUMENTATION.md
├── PRD.md
├── .env.example
├── .gitignore
└── <application source>
```

Never commit real environment secrets.

The final implementation should be runnable from a fresh clone using the instructions in `DOCUMENTATION.md`.
