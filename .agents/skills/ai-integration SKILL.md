# AI Integration Engineering Skill

## Activation

- Activation mode: **Always on**.
- Glob: `**/*`.
- This skill is repository-wide and must be consulted for AI integration, worker, upload, storage, validation, rate-limit, configuration, and evidence work.
- It is not an on-demand activation.

## Purpose

Implement Assessment 3 as a narrow, defensible AI integration slice. The implementation must prove that the system can accept files, create background work, call a real model through an official SDK, validate structured output, record failures, control concurrency and cost, and perform one follow-up action.

## Required Reading

Before implementation, read:

1. `AGENTS.md`
2. `PRD.md`
3. `ARCHITECTURE.md`
4. `.agents/rules/ai-integration.md`
5. Existing Assessment 1 authentication implementation

## Skill Workflow

### Step 1: Confirm scope

Identify the current R3 requirement IDs before coding.

Confirm that the work belongs to the AI slice and not an unrelated product feature.

### Step 2: Inspect the repository

Inspect:

- package manager
- Next.js structure
- TypeScript configuration
- Prisma schema
- existing authentication
- existing environment conventions
- existing design system/components

Do not create duplicate authentication or database infrastructure that already exists.

### Step 3: Resolve open decisions

Before provider-dependent implementation, confirm:

- AI provider
- model IDs
- storage implementation
- file limits
- rate limits
- concurrency
- timeout
- retry count/backoff

If these remain explicitly open in the PRD/architecture, stop and ask.

Never generate a real API key.

### Step 4: Build the data layer

Create the minimum models needed:

- FileAsset
- Job
- AiResult
- FollowUpResult

Reuse User from Assessment 1.

Use foreign keys and constraints where appropriate.

Ensure the database stores storage keys and metadata, not file bytes.

### Step 5: Build configuration

Create a typed configuration boundary for:

- role model IDs
- temperatures
- output token caps
- timeouts
- retry policy
- concurrency
- rate limits
- file count
- file size
- allowed types

Validate required environment values at startup or at the configuration boundary.

### Step 6: Build storage adapter

Implement a storage boundary with operations conceptually equivalent to:

```text
put
get
```

The API route should not know whether storage is local or object storage.

Return a storage key from upload.

Persist only the key in PostgreSQL.

### Step 7: Build upload route

Route:

```text
POST /api/ai/upload
```

Order:

1. authenticate
2. rate limit
3. parse multipart data
4. validate files
5. store files
6. create FileAsset records
7. create pending Job records
8. enqueue or schedule work
9. return accepted response

Do not call the AI provider in this request path.

### Step 8: Build bounded worker

The worker must enforce the configured concurrency limit.

Processing order:

```text
claim -> processing -> attempt++ -> load file -> AI -> validate -> persist -> done
```

Failure order:

```text
AI failure -> classify -> retry if allowed -> otherwise failed + error
```

Make job claiming safe against duplicate processing.

### Step 9: Build Role 1

Role name:

**Note Structurer**

Input: source handwritten notes.

Output: structured `StructuredNotes` object.

Use:

- explicit system prompt
- configured model
- configured temperature
- configured output token cap
- explicit timeout
- structured output schema
- application-side validation

Do not parse prose.

### Step 10: Build validation gate

The provider response is not automatically trusted.

Pipeline:

```text
provider response
-> parse
-> application schema validation
-> accept/reject
```

If invalid:

- record the failure context safely
- retry if configured
- increment attempts
- mark failed when exhausted

### Step 11: Build result persistence

Only validated Role 1 output becomes a successful result.

Persist the schema version with the result so future schema changes are distinguishable.

### Step 12: Build job status endpoint

Route:

```text
GET /api/ai/jobs/:jobId
```

Requirements:

- authentication
- ownership scoping
- truthful status
- result only when available
- safe error state

### Step 13: Build result UI

The UI must visibly distinguish:

- pending
- processing
- done
- failed

The result view renders structured data rather than dumping raw provider prose.

### Step 14: Build Role 2 follow-up

Action:

**Expand notes**

Route:

```text
POST /api/ai/jobs/:jobId/follow-up
```

Order:

1. authenticate
2. ownership check
3. confirm original result exists and is validated
4. rate limit
5. invoke Role 2
6. timeout
7. validate output
8. persist follow-up result
9. return result/failure

Role 2 receives validated Role 1 data.

### Step 15: Build failure UX

Handle:

- invalid file
- empty file
- corrupted file
- storage failure
- timeout
- provider failure
- validation failure
- exhausted retries
- rate limit

Do not show raw exceptions to users.

### Step 16: Build evidence tests

Capture:

1. successful job
2. failed job with error message
3. raw output versus validated parsed result
4. deliberate schema validation failure
5. concurrency cap under batch load
6. DB storage key without file bytes
7. processing rate limit
8. follow-up rate limit
9. timeout/failure UX when available

### Step 17: Cost calculation

At implementation time, record real provider pricing assumptions.

Calculate:

```text
Role 1 cost
+ Role 2 cost
= complete run cost
```

Then explain how:

- token caps
- file limits
- retry limits
- rate limits
- concurrency

control total exposure.

### Step 18: Documentation

Do not invent Section 6 problems.

Use the actual engineering log and terminal/browser evidence.

`DOCUMENTATION.md` must follow the bootcamp's exact eight-section structure.

Section 5 must cover:

- API endpoint
- SDK versus raw HTTP
- system prompts versus user prompts
- model parameters
- structured output and validation
- jobs and workers
- queues/FIFO/concurrency
- rate limiting as cost control
- object storage versus DB
- cost model

For every concept answer:

1. What it is
2. Why it is needed
3. How it was implemented
4. What was chosen against and why

### Step 19: Defence preparation

Prepare exact code traces for:

- temperature and token cap justification
- provider timeout -> UI failure
- invalid structured output -> validation -> retry/failure
- 50 uploads -> concurrency cap -> provider request pattern

### Step 20: Final audit

Before declaring done, verify every R3 requirement.

Search the repository for:

- hardcoded model IDs
- hardcoded token caps
- API keys
- raw HTTP provider calls
- string-based AI parsing
- file bytes being written to DB fields
- unbounded Promise.all/provider calls
- missing rate limits
- missing timeouts
- jobs without failure states

Fix violations before submission.

## Implementation Invariants

1. HTTP upload is non-blocking with respect to AI processing.
2. Job state is durable.
3. Provider calls are bounded.
4. Every provider call times out.
5. Structured output is validated by application code.
6. Files are not stored in the database.
7. Secrets are never written by the agent.
8. Configuration is centralized.
9. Both AI roles are explicit.
10. Follow-up is rate limited.
11. Processing is rate limited.
12. Authentication is reused.
13. User ownership is enforced on job access.
14. Failure is a designed state, not an uncaught exception.
15. The repository remains a single slice.
