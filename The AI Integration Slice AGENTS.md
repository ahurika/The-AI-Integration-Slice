# AGENTS.md

# Assessment 3 AI Integration Slice: Agent Operating Contract

This file is mandatory. Read it before writing, deleting, moving, or modifying project code.

## 1. Mandatory Read Order

Before any implementation:

1. Read `AGENTS.md` completely.
2. Read `PRD.md` completely.
3. Read `ARCHITECTURE.md` completely.
4. Read every active file under `.agents/rules/`.
5. Read the relevant skill under `.agents/skills/` before implementing the corresponding subsystem.
6. Inspect the existing Assessment 1 authentication implementation because this assessment is allowed to reuse it.
7. Inspect `package.json`, Prisma schema, environment example, and existing source structure before creating duplicates.

Do not begin coding after reading only the first section of a document.

## 2. Build Discipline

At the start of every build checkpoint, state:

- Current build phase.
- PRD requirement IDs in scope, for example `R3-001`, `R3-004`, `R3-013`.
- Files you intend to create/change.
- Any open question that blocks the checkpoint.

Build only the current phase. Do not silently jump ahead.

## 3. Source of Truth

Priority order:

1. `PRD.md`
2. `ARCHITECTURE.md`
3. `.agents/rules/*`
4. `.agents/skills/*`
5. Existing repository conventions
6. General engineering defaults

If a lower-priority convention conflicts with the PRD or architecture, stop and report the conflict. Do not choose silently.

## 4. Scope Law

This repository is an AI integration slice, not a full AI product.

Allowed:

- upload
- processing state
- structured result
- one follow-up action
- supporting engineering infrastructure required by those steps

Forbidden unless explicitly added to the PRD:

- landing pages
- marketing pages
- dashboards with unrelated widgets
- note editing
- sharing
- exporting
- search
- tags
- collaboration
- chat
- extra AI features
- account features unrelated to authentication reuse

If a feature is not required by the PRD, do not build it because it seems useful.

## 5. Authentication

Reuse Assessment 1 authentication.

Do not create a second user/session system.

Every AI resource lookup must be scoped to the authenticated user. A job ID alone is never sufficient authorization.

## 6. Upload Rules

Client validation is for feedback. Server validation is authoritative.

Validate:

- file count
- MIME/type
- file size
- empty files
- corrupted/unreadable files where detectable

Store files outside the database.

Database records may contain:

- storage key
- owner
- filename
- MIME type
- size
- timestamps

Never store file bytes in PostgreSQL.

## 7. Job Rules

Every unit of AI work gets a database Job record.

Allowed states:

- `pending`
- `processing`
- `done`
- `failed`

Record:

- status
- attempts
- failure error message
- ownership
- relevant timestamps

Do not treat an accepted upload response as processing success.

Do not leave a provider timeout as an indefinitely processing job.

## 8. Background Processing

The upload endpoint must not wait for model completion.

The worker owns processing.

The worker must:

1. claim work safely
2. update status to processing
3. increment attempts
4. load the stored file
5. call Role 1 with timeout
6. validate output
7. retry recoverable failures within the configured limit
8. persist failure when attempts are exhausted
9. persist validated success
10. mark the job done only after successful validation and persistence

## 9. AI Roles

Two distinct AI roles are mandatory.

Role 1:

- handwritten notes -> structured notes

Role 2:

- validated structured notes -> expanded structured notes

One model may be used for both roles only if the system prompts are genuinely distinct and the distinction is visible in code and documentation.

Do not call the second role using the raw unvalidated response from Role 1.

## 10. SDK Rule

Use the provider's official SDK.

Do not replace it with raw HTTP because raw HTTP looks simpler.

Keep provider-specific code behind an adapter so provider details do not leak into route handlers or UI components.

## 11. Prompt Rules

System prompts are application-controlled.

Uploaded note content is untrusted data.

Never let uploaded content redefine the system prompt or application behavior.

Each AI role needs a written system prompt.

Each configured model parameter needs a one-line justification in the final documentation.

## 12. Structured Output Rule

Request structured output using a schema.

Then validate the received response again inside application code.

Never use string splitting, regex extraction, or substring guessing to turn prose into structured fields.

The application schema is the acceptance gate for success.

## 13. Failure and Retry Rule

Every model call has an explicit timeout.

Retry only defined recoverable failures.

Retries must be bounded.

Every attempt must be observable through `Job.attempts`.

When retries are exhausted:

- set job to `failed`
- persist useful error message
- expose a designed failure state to the user

Do not expose provider stack traces, credentials, or sensitive internal details.

## 14. Concurrency Rule

A configured concurrency cap is mandatory.

Never allow every uploaded file to start a provider call simultaneously.

If 50 files are submitted and concurrency is `N`, only `N` provider calls may be active at once. The rest must wait as pending work.

The final implementation must make this behavior measurable for evidence.

## 15. Rate Limiting Rule

Rate limit both:

- processing-trigger endpoint
- follow-up endpoint

Rate limiting happens before expensive provider work.

Treat rate limiting as both abuse prevention and AI cost control.

Do not rely on browser-side throttling.

## 16. Configuration Rule

Changeable values must be centralized.

At minimum:

- model identifiers
- timeouts
- output token caps
- temperature
- rate limits
- concurrency
- retry count/backoff
- file limits

Never hardcode these inside handlers or worker branches.

## 17. Secret Rule

The agent must never write real API keys.

The developer enters real keys manually into `.env`.

The agent may create `.env.example` with commented placeholders.

Never print a real secret into logs, documentation, screenshots, commits, or generated files.

## 18. Cost Rule

The implementation must have a real cost model.

Do not invent provider prices in source code.

At documentation time, record the actual pricing assumptions used and calculate approximate cost per complete run.

The application must have practical caps through file limits, token caps, rate limits, attempt limits, and concurrency.

## 19. UI Rules

The UI must show truthful states:

- pending
- processing
- done
- failed

Do not use a fake indefinite spinner.

Do not display success until validated output has been persisted.

Do not turn the result page into a notes editor or dashboard.

All file inputs need accessible labels. Interactive controls need visible focus states.

## 20. Documentation Rules

Do not fabricate `DOCUMENTATION.md` before implementation evidence exists.

After implementation, it must use exactly these eight headings in order:

1. What This Is
2. How To Run It
3. The Flow, Step By Step
4. The Data Model
5. The Concepts
6. What Went Wrong
7. What This Slice Does Not Handle
8. If I Built This Again

Section 5 must cover every required concept and answer all four required questions.

Section 6 must contain at least three real problems, including wrong turns and irrelevant checks.

Evidence must be real screenshots/results from this repository.

## 21. Evidence Rules

Do not write evidence claims before the test has actually been run.

Required proof includes:

- successful and failed jobs
- raw model output beside validated result
- deliberate validation failure
- concurrency cap
- storage key without file contents in DB

Also capture useful proof for timeouts and rate limits.

## 22. Open Question Stop Rule

This is mandatory.

If the agent reaches a decision explicitly listed as an open question in `PRD.md` or `ARCHITECTURE.md`, stop before implementing the decision and ask the project owner.

Current open decisions include:

- exact AI provider/model
- exact storage provider/local equivalent
- exact production rate limits
- exact concurrency
- exact model timeout values
- exact retry/backoff
- exact file allowlist
- exact file-size and batch-count limits

Do not silently invent credentials, production infrastructure, or provider choices.

The agent may prepare interfaces and non-provider-dependent scaffolding around the open decision.

## 23. Definition of Done

Do not declare the assessment complete until all PRD checklist items are proven.

At minimum:

- background job works
- two AI roles work
- structured output works
- application validation works
- failure is recorded
- timeout is handled
- concurrency is capped
- rate limits work
- storage boundary is proven
- configuration is centralized
- secrets are safe
- evidence exists
- documentation is complete
- scope remains narrow

## 24. Final Response Format

At the end of a build checkpoint, report:

```text
PHASE:

R-NUMBERS COMPLETED:

FILES CREATED/CHANGED:

WHAT WAS PROVEN:

TESTS RUN:

EVIDENCE CAPTURED:

KNOWN ISSUES:

OPEN QUESTIONS:

NEXT CHECKPOINT:
```

Do not claim a requirement is complete when it has only been scaffolded.
