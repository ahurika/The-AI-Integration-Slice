/**
 * src/validation/files.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side file validation (R3-003, R3-026).
 *
 * Client-side validation is for feedback only. This server validation is
 * authoritative. Calling code must not proceed to storage or job creation
 * unless validate() returns a successful result.
 *
 * Validated cases:
 * - Too many files in one submission
 * - MIME type not in allowlist
 * - File size exceeds configured maximum
 * - Empty file (0 bytes)
 *
 * Corrupted-file detection is noted as a TODO because it requires reading
 * file content, which depends on the storage strategy (open question).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { FILE_CONFIG } from '@/src/config/ai';

export type FileValidationError =
  | { code: 'TOO_MANY_FILES'; max: number; received: number }
  | { code: 'INVALID_MIME_TYPE'; mimeType: string; allowed: string[] }
  | { code: 'FILE_TOO_LARGE'; maxBytes: number; receivedBytes: number; fileName: string }
  | { code: 'EMPTY_FILE'; fileName: string };

export interface FileInput {
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: FileValidationError[];
}

/**
 * Validates a batch of files against the configured limits and allowlist.
 * Returns a list of all validation errors found (not just the first one).
 */
export function validateFiles(files: FileInput[]): ValidationResult {
  const errors: FileValidationError[] = [];

  // Guard: open question not yet resolved — config values will be 0.
  // These checks will become meaningful once FILE_CONFIG is populated.
  if (FILE_CONFIG.maxFilesPerSubmission > 0 && files.length > FILE_CONFIG.maxFilesPerSubmission) {
    errors.push({
      code: 'TOO_MANY_FILES',
      max: FILE_CONFIG.maxFilesPerSubmission,
      received: files.length,
    });
    // Do not continue per-file checks if the batch is already rejected.
    return { valid: false, errors };
  }

  for (const file of files) {
    // Empty file check
    if (file.sizeBytes === 0) {
      errors.push({ code: 'EMPTY_FILE', fileName: file.name });
      continue;
    }

    // MIME type check
    if (
      FILE_CONFIG.allowedMimeTypes.length > 0 &&
      !FILE_CONFIG.allowedMimeTypes.includes(file.mimeType as any)
    ) {
      errors.push({
        code: 'INVALID_MIME_TYPE',
        mimeType: file.mimeType,
        allowed: [...FILE_CONFIG.allowedMimeTypes],
      });
    }

    // Size check
    if (FILE_CONFIG.maxFileSizeBytes > 0 && file.sizeBytes > FILE_CONFIG.maxFileSizeBytes) {
      errors.push({
        code: 'FILE_TOO_LARGE',
        maxBytes: FILE_CONFIG.maxFileSizeBytes,
        receivedBytes: file.sizeBytes,
        fileName: file.name,
      });
    }
  }

  // TODO: Add corrupted/unreadable file detection once storage strategy is confirmed.
  // Corruption detection requires attempting to read/parse the file bytes,
  // which is storage-implementation-specific.

  return { valid: errors.length === 0, errors };
}

/**
 * Returns a user-safe error message for a validation error.
 * Never exposes internal stack traces or sensitive details.
 */
export function describeValidationError(error: FileValidationError): string {
  switch (error.code) {
    case 'TOO_MANY_FILES':
      return `Too many files. Maximum ${error.max} per submission, received ${error.received}.`;
    case 'INVALID_MIME_TYPE':
      return `File type "${error.mimeType}" is not supported. Allowed types: ${error.allowed.join(', ')}.`;
    case 'FILE_TOO_LARGE':
      return `"${error.fileName}" is too large. Maximum size is ${Math.round(error.maxBytes / 1_048_576)} MB.`;
    case 'EMPTY_FILE':
      return `"${error.fileName}" is empty and cannot be processed.`;
  }
}
