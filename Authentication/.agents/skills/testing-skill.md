# Testing Skill

## Purpose

Provide a systematic approach to testing authentication functionality.

## Workflow

For every feature identify:

```text
Expected behaviour
Invalid behaviour
Security behaviour
Failure behaviour
```

## Authentication Coverage

Test applicable:

* Registration
* Login
* Logout
* Session behaviour
* Password reset
* Email verification
* Protected routes

## Test Categories

### Positive

Valid expected behaviour.

### Negative

Invalid input and invalid credentials.

### Security

Unauthorized access and sensitive-data exposure.

### Failure

Server/database failure.

### Regression

Existing authentication functionality after changes.

## Verification Rule

A test that was not actually executed must not be reported as passed.
