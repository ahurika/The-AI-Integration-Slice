---
description: "Always-on rules for Assessment 3 AI Integration Slice"
globs:
  - "**/*"
alwaysApply: true
---

# Assessment 3 AI Integration Rules

## Activation

- Activation mode: **Always on**.
- Glob: `**/*`.
- These rules apply to every file in the repository.
- They are not on-demand rules.

## R3 Scope

- Implement only the AI Integration Slice defined in `PRD.md`.
- Do not add product features outside the brief.
- Reuse Assessment 1 authentication.

## R3 Upload

- Validate uploads on the server even if the client validates first.
- Enforce configured file count, type, and size limits.
- Handle empty and corrupted files.
- Store file bytes outside the database.
- Store only storage key and metadata in the database.

## R3 Jobs

- Every unit of work gets a Job record.
- Job status is `pending`, `processing`, `done`, or `failed`.
- Attempts and failure error are persisted.
- Do not equate HTTP request success with job success.
- A job must not remain silently stuck after a model timeout.

## R3 AI

- Use a real model through an official SDK.
- Implement two distinct AI roles.
- Give each role a written system prompt.
- Keep model IDs and changeable parameters in configuration.
- Never hardcode model IDs, token caps, temperature, timeout, concurrency, or rate-limit values in handlers.

## R3 Structured Output

- Request structured output using a schema.
- Validate the response again in application code.
- Do not parse prose using string operations.
- Invalid output must trigger the configured retry/failure path.

## R3 Reliability

- Every model call has an explicit timeout.
- Retry only defined recoverable failures.
- Retries are bounded.
- Persist the final failure and expose an honest failure state.

## R3 Concurrency

- Provider calls are bounded by a configured concurrency cap.
- A large upload batch must create pending jobs rather than uncontrolled simultaneous provider calls.
- Concurrency must be demonstrated in evidence.

## R3 Rate Limiting

- Rate limit processing-trigger requests.
- Rate limit the follow-up action.
- Apply limits server-side before expensive AI work.
- Treat limits as cost control as well as abuse protection.

## R3 Secrets

- Agents never write real API keys.
- `.env.example` may contain commented placeholders.
- Never expose secrets in logs, screenshots, source, or documentation.

## R3 Storage

- Database never stores uploaded file contents.
- Use object storage or the documented local development equivalent.
- Keep storage behind an adapter.

## R3 UI

- Show truthful pending, processing, done, and failed states.
- Do not show success before validated result persistence.
- Keep the interface minimal.
- Inputs need labels.
- Interactive elements need visible focus states.

## R3 Documentation

- `DOCUMENTATION.md` must contain exactly the eight required sections in order.
- Section 5 must cover every required concept using all four questions.
- Section 6 must contain at least three real problems and investigations.
- Do not fabricate evidence or implementation problems.

## R3 Open Questions

- Stop before choosing any item marked open in `PRD.md` or `ARCHITECTURE.md`.
- Ask the project owner rather than inventing a provider, storage infrastructure, production limits, or credential.
