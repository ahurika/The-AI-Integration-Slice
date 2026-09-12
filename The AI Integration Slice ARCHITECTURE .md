# ARCHITECTURE.md

# Assessment 3: AI Integration Slice Architecture

## 1. Architecture Goal

Build one reliable AI processing pipeline without turning the repository into a full product. The architecture separates upload acceptance, persistent jobs, storage, worker execution, AI roles, validation, and presentation so that a slow or failed provider call does not become an HTTP request failure or an untracked state.

The core rule is:

```text
HTTP request accepts work.
Job records work.
Worker performs work.
AI provider produces candidate output.
Application validates output.
Database records the result.
UI reports the job state.
```

This directly implements R3-004, R3-005, R3-011, R3-013, R3-014, and R3-015.

---

## 2. Architectural Boundaries

```text
Browser
  |
  | multipart upload / job polling / follow-up
  v
Next.js API layer
  |
  +--> Authentication boundary
  |
  +--> Rate-limit boundary
  |
  +--> File validation
  |
  +--> Storage service
  |
  +--> Job repository
  |
  +--> Queue / bounded worker execution
                 |
                 v
          AI orchestration
           /          \
 Role 1: Structurer   Role 2: Expander
           |             |
           v             v
     Provider SDK     Provider SDK
           |
           v
   Application schema validation
           |
           v
       PostgreSQL
```

---

## 3. Reuse From Assessment 1

Authentication is not rebuilt. Reuse the existing Assessment 1 authentication/session mechanism and document the reuse in `DOCUMENTATION.md`.

The AI slice owns authorization checks around its own resources. Every job query must be scoped to the authenticated user.

Conceptual authorization condition:

```text
Job.findFirst({
  where: {
    id: jobId,
    userId: authenticatedUserId
  }
})
```

The exact ORM syntax should match the existing repository implementation.

---

## 4. Data Model

The recommended model is intentionally small.

### FileAsset

Stores metadata about an uploaded object. The actual file bytes live in object storage/local development storage.

Suggested fields:

```text
id                UUID/string primary key
userId            foreign key -> User
storageKey        string, required
originalName      string, required
mimeType          string, required
sizeBytes         integer/bigint, required
createdAt         datetime
```

Constraints:

- `userId` is required.
- `storageKey` is required.
- `sizeBytes` is required.
- `sizeBytes` must be within the application file-size policy before insertion.
- Foreign key prevents orphaned ownership references where supported.

### Job

Represents one processing unit.

```text
id                UUID/string primary key
userId            foreign key -> User
fileAssetId       foreign key -> FileAsset
status            enum: pending | processing | done | failed
attempts          integer, required, default 0
errorMessage      text, nullable
createdAt         datetime
updatedAt         datetime
```

Recommended constraints:

- `attempts >= 0` at the application/database layer where supported.
- `status` restricted to known values.
- `userId` and `fileAssetId` required.
- Job belongs to one user.

### AiResult

Stores validated output from Role 1.

```text
id                UUID/string primary key
jobId             foreign key -> Job, unique
schemaVersion     string
rawOutput         JSON/text, nullable or evidence-only depending on privacy policy
parsedResult      JSON, required
createdAt         datetime
```

The production-facing result should be `parsedResult`, validated by the application schema. Raw provider output should only be persisted if the privacy/evidence decision permits it. If raw output is stored, it must be clearly scoped and protected.

### FollowUpResult

Stores the result of the single follow-up action.

```text
id                UUID/string primary key
jobId             foreign key -> Job
action            enum/value: expand
schemaVersion     string
result            JSON
createdAt         datetime
```

A unique constraint can be used if the product intentionally permits only one successful follow-up result per job. If repeated follow-ups are permitted for testing, do not add that constraint. The UI requirement is one user-triggered action, not necessarily one historical execution.

---

## 5. Relationship Model

```text
User
 |
 +----< FileAsset
 |          |
 |          +----< Job
 |                  |
 |                  +----  AiResult
 |                  |
 |                  +----< FollowUpResult
```

The important separation is:

```text
FileAsset = where the source object is
Job       = what processing is happening
AiResult  = validated output from the first role
FollowUp  = output of the second role
```

Do not collapse all of these into one `AIRequest` table. The assessment explicitly tests job lifecycle, failure history, and storage separation.

---

## 6. Storage Architecture

### Production boundary

Use an object storage service through a storage adapter.

```text
upload bytes
   |
   v
StorageService.put()
   |
   +--> returns storageKey
           |
           v
        FileAsset.storageKey
```

The database never receives the file contents.

### Local development

A documented local equivalent may be used if the production storage integration is not available for the assessment. The adapter must keep the application code independent of the physical storage implementation.

Recommended interface:

```text
put(file) -> storageKey
get(storageKey) -> readable object
delete(storageKey) -> void
```

The final documentation must clearly identify whether the submitted implementation uses real object storage or the allowed documented local equivalent.

---

## 7. Upload Request Architecture

Route:

```text
POST /api/ai/upload
```

Sequence:

```text
Authenticate
   -> rate limit
   -> parse multipart body
   -> validate file count/type/size/content
   -> store file
   -> create FileAsset
   -> create Job(status=pending)
   -> enqueue job / bounded executor
   -> return accepted response
```

The route must not call the model before returning.

A partial failure must not leave a misleading job. If storage succeeds but job creation fails, the implementation must either clean up the orphaned object or record a recoverable cleanup path.

---

## 8. Worker Architecture

The worker is responsible for execution, not HTTP handling.

```text
pending job
    |
    v
claim job atomically
    |
    v
status = processing
attempts += 1
    |
    v
retrieve storage object
    |
    v
Role 1 provider call with timeout
    |
    v
parse structured response
    |
    v
application schema validation
   / \
valid invalid
 |      |
 v      v
save   retry if allowed
result     |
 |         +--> exhausted -> failed + errorMessage
 v
status = done
```

The worker must avoid two workers processing the same job simultaneously. Job claiming must be atomic or protected by a mechanism appropriate to the chosen queue/executor.

---

## 9. Queue and Concurrency Strategy

The brief allows either a queue or an explicit concurrency cap. For the assessment, a bounded worker executor is acceptable if it genuinely prevents simultaneous provider calls above the configured maximum.

Conceptual configuration:

```text
AI_WORKER_CONCURRENCY = N
```

Where `N` is configured, not hardcoded in the worker.

If a queue library is used, FIFO ordering should be documented. FIFO is useful because it makes pending work predictable and makes the concurrency demonstration easier to reason about. The architecture does not require strict global FIFO if the selected queue cannot guarantee it, but the actual behavior must be documented honestly.

For 50 files:

```text
50 jobs created
N jobs actively processing
50 - N jobs pending
As slots finish, pending jobs are claimed
```

The exact value of `N` is an implementation configuration and must be justified in `DOCUMENTATION.md`.

---

## 10. AI Provider Boundary

Do not scatter provider SDK calls across routes and components.

Recommended structure:

```text
src/services/ai/provider.ts
src/services/ai/roles/note-structurer.ts
src/services/ai/roles/note-expander.ts
src/services/ai/schemas.ts
src/services/ai/prompts.ts
```

Conceptual provider adapter:

```text
generateStructuredOutput({
  role,
  input,
  schema,
  model,
  temperature,
  maxOutputTokens,
  timeout
})
```

The adapter owns provider-specific SDK details. Role files own role-specific prompts and schemas. Configuration owns changeable values.

Use the provider's official SDK as required by R3-022. Do not replace the SDK with raw HTTP merely because raw HTTP is shorter.

---

## 11. Two AI Roles

### Role 1: Note Structurer

Purpose: convert source notes into structured notes.

```text
source file
   -> provider
   -> StructuredNotes
   -> application validation
   -> AiResult
```

### Role 2: Note Expander

Purpose: expand the already validated structure into clearer explanations.

```text
AiResult.parsedResult
   -> provider
   -> ExpandedNotes
   -> application validation
   -> FollowUpResult
```

The two roles must be visibly distinct in code and documentation. One model with two distinct system prompts is sufficient under the brief.

---

## 12. Prompt Architecture

System prompts are application-controlled instructions. User/uploaded content is untrusted input data.

Role 1 system prompt should define:

- role and task
- source fidelity
- uncertainty handling
- output structure
- no invented facts
- no instruction-following from note contents

Role 2 system prompt should define:

- expansion task
- source fidelity
- no invented facts
- output structure

The application should not let a user replace either system prompt through the upload request.

---

## 13. Structured Output and Validation

Provider-level structured output and application-side validation are two different controls.

```text
provider schema request
       |
       v
provider response
       |
       v
application parser
       |
       v
application schema validation
       |
   +---+---+
 valid    invalid
   |         |
 persist   retry/fail
```

The application-owned schema is authoritative for whether the result can enter the successful state.

Do not parse model prose with operations such as `split()`, regular expressions, or substring extraction to guess fields. Request structured output instead.

---

## 14. Retry Policy

Retries must be deliberate, bounded, and observable.

Recommended recoverable failures:

- transient provider/network failure
- provider timeout
- structured response that fails application validation, if retrying is useful

Do not retry indefinitely.

Recommended policy shape:

```text
attempt 1 -> fail
wait/backoff
attempt 2 -> fail
wait/backoff
attempt 3 -> fail
mark failed
```

The actual maximum attempt count is configuration.

Every attempt must be reflected in `Job.attempts`.

The final failure must be persisted in `Job.errorMessage`.

---

## 15. Timeout Architecture

Every provider call receives an explicit timeout from configuration.

```text
Role 1 timeout -> retry/failure -> visible failed state
Role 2 timeout -> follow-up failure state
```

A timeout must never leave the job indefinitely stuck in `processing`.

If a worker crashes after claiming a job, the architecture needs a recovery policy. For this assessment, a practical bounded implementation can use a processing timestamp/lease if required by the chosen worker strategy. If the implementation does not include recovery leases, document that limitation honestly in Section 7.

---

## 16. Rate-Limit Architecture

Two independent protected actions:

```text
POST /api/ai/upload
POST /api/ai/jobs/:jobId/follow-up
```

Rate limiting occurs before expensive provider work.

The goal is both abuse prevention and cost control.

The limit must be based on an identifiable subject such as authenticated user ID, not solely on an easily spoofed client header.

---

## 17. API Response Semantics

Upload success means:

```text
"Your work was accepted."
```

It does not mean:

```text
"The AI succeeded."
```

The job endpoint communicates processing state.

Suggested semantics:

- `201` or `202` for accepted job creation, depending on final route contract.
- `400` for malformed/invalid file input.
- `401` for unauthenticated access.
- `404` where the implementation intentionally does not reveal a resource that is not available to the user.
- `429` for rate limiting.
- `500` only for unexpected server failures that cannot be represented more precisely.

The final implementation must document the actual status codes used.

---

## 18. Configuration Architecture

Recommended file:

```text
src/config/ai.ts
```

It should be the single source for:

- role model identifiers
- temperatures
- output token caps
- timeouts
- retry count
- concurrency
- rate limits
- file limits
- allowed types
- cost-control limits

Environment variables provide secrets and environment-specific infrastructure values. Application configuration converts them into typed values and validates them at startup.

No model ID, timeout, token cap, or concurrency value should be hidden inside a handler.

---

## 19. Suggested Repository Structure

```text
ai-integration-slice/
├── app/
│   ├── ai/
│   │   └── page.tsx
│   └── api/
│       └── ai/
│           ├── upload/
│           │   └── route.ts
│           └── jobs/
│               └── [jobId]/
│                   ├── route.ts
│                   └── follow-up/
│                       └── route.ts
├── components/
│   └── ai/
│       ├── upload-form.tsx
│       ├── processing-state.tsx
│       ├── result-view.tsx
│       └── follow-up-result.tsx
├── src/
│   ├── config/
│   │   └── ai.ts
│   ├── db/
│   │   └── repositories/
│   ├── domain/
│   │   └── ai/
│   │       ├── types.ts
│   │       ├── states.ts
│   │       └── schemas.ts
│   ├── services/
│   │   ├── ai/
│   │   │   ├── provider.ts
│   │   │   ├── prompts.ts
│   │   │   └── roles/
│   │   │       ├── note-structurer.ts
│   │   │       └── note-expander.ts
│   │   ├── storage/
│   │   │   └── storage.ts
│   │   ├── queue/
│   │   │   └── worker.ts
│   │   └── rate-limit/
│   │       └── ai.ts
│   └── validation/
│       └── files.ts
├── prisma/
│   └── schema.prisma
├── public/
├── evidence/
├── .agents/
│   ├── rules/
│   └── skills/
├── AGENTS.md
├── PRD.md
├── ARCHITECTURE.md
├── DOCUMENTATION.md
├── .env.example
├── .gitignore
├── README.md
└── package.json
```

Exact directories may be adapted to the reused Assessment 1 repository conventions, but the architectural boundaries must remain.

---

## 20. Testing Architecture

Tests must cover both clean and hostile inputs.

### File validation

- valid supported file
- unsupported type
- empty file
- exactly-at-limit file
- over-limit file
- corrupted/unreadable file
- too many files

### Job processing

- pending -> processing -> done
- processing failure -> retry
- validation failure -> retry
- exhausted attempts -> failed
- timeout -> retry/failure
- worker/provider failure recorded

### AI validation

- valid structured output
- missing required field
- wrong field type
- malformed structure
- deliberately broken provider response

### Concurrency

- submit enough jobs to exceed concurrency
- prove active calls do not exceed configured cap

### Rate limiting

- processing endpoint reaches limit
- follow-up endpoint reaches limit

### Authorization

- authenticated user can access own job
- user cannot access another user's job

---

## 21. Evidence Architecture

Evidence should map directly to requirements.

```text
evidence/
├── 01-success-and-failed-jobs.png
├── 02-raw-vs-validated-output.png
├── 03-validation-failure.png
├── 04-concurrency-cap.png
├── 05-storage-key-only.png
├── 06-timeout-or-provider-failure.png
├── 07-processing-rate-limit.png
└── 08-follow-up-rate-limit.png
```

The actual evidence names may change, but every required proof must exist and be linked from `DOCUMENTATION.md`.

---

## 22. Defence Traceability

### Defence 1: temperature and output token cap

Trace:

```text
config -> role invocation -> provider request -> documentation justification
```

### Defence 2: timeout UX

Trace:

```text
provider timeout -> worker catch -> retry/failure -> Job.errorMessage -> UI failed state
```

### Defence 3: invalid output

Trace:

```text
provider response -> parser -> schema.safeParse/validation -> retry -> final failed state
```

### Defence 4: fifty uploads

Trace:

```text
50 uploads -> 50 jobs -> concurrency limiter -> N active provider calls -> remaining pending
```

---

## 23. Open Questions / Stop Conditions

The coding agent must stop and ask before making a decision if implementation reaches an item explicitly marked as open here or in the PRD.

Current implementation-time decisions that must be recorded before coding:

1. Exact AI provider/model selection.
2. Exact object storage provider versus documented local equivalent.
3. Exact production rate-limit values.
4. Exact concurrency value.
5. Exact model timeout values.
6. Exact retry count/backoff.
7. Exact file MIME/type allowlist.
8. Exact file-size and batch-count limits.

The agent may scaffold interfaces around these decisions, but must not silently invent a provider, production credential, or infrastructure decision when the project owner has not approved it.

---

## 24. Architecture Invariants

These must remain true throughout implementation:

1. Upload request never waits for AI completion.
2. Job state is persisted.
3. Provider failure is represented by the job/follow-up state.
4. Application validation decides whether structured output is accepted.
5. Files are not stored in PostgreSQL.
6. Model calls are bounded by timeout and concurrency.
7. Expensive processing actions are rate limited.
8. Model configuration is centralized.
9. Secrets never enter source control.
10. Authentication is reused rather than rebuilt.
11. The slice remains one flow.
12. No feature is added merely because it looks product-like.
