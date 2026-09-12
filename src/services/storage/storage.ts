import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { STORAGE_CONFIG } from '@/config/ai';

/**
 * src/services/storage/storage.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Storage adapter interface and scaffold implementation (R3-018, R3-019).
 *
 * OPEN QUESTION: Production storage provider is not yet chosen.
 * See ARCHITECTURE.md §23 item 2 and §6.
 *
 * The adapter keeps the application code independent of the physical storage
 * implementation. Route handlers and workers call StorageService — they do not
 * know whether storage is S3, GCS, R2, or a local filesystem equivalent.
 *
 * Interface contract:
 *   put(file)         → storageKey   (key persisted in FileAsset.storageKey)
 *   get(storageKey)   → Buffer       (file bytes for worker to pass to provider)
 *   delete(storageKey)→ void         (cleanup on orphaned upload)
 *
 * SCAFFOLD: The body of each method throws NotImplementedError.
 * A real implementation will replace this once the provider is confirmed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export class StorageNotImplementedError extends Error {
  constructor() {
    super(
      'StorageService: provider not implemented. ' +
      'Resolve open question (ARCHITECTURE.md §23 item 2) before calling storage methods.',
    );
    this.name = 'StorageNotImplementedError';
  }
}

export interface StoredFile {
  /** Opaque key used to retrieve this file from storage. Persisted in FileAsset. */
  storageKey: string;
}

export interface FilePayload {
  /** Original filename — used for generating a storage key prefix only. */
  originalName: string;
  /** MIME type — already validated before reaching this layer. */
  mimeType: string;
  /** Raw bytes of the uploaded file. Never written to PostgreSQL. */
  bytes: Buffer;
}

/**
 * Stores a file and returns its opaque storage key.
 *
 * SCAFFOLD: throws until provider is implemented.
 *
 * TODO: Implement once storage provider is confirmed (open question).
 * For local development, write to STORAGE_CONFIG.localStoragePath.
 * For production, call the object storage SDK.
 */
export async function putFile(file: FilePayload): Promise<StoredFile> {
  const extension = path.extname(file.originalName) || '.bin';
  const storageKey = `${crypto.randomUUID()}${extension}`;
  const fullPath = path.join(STORAGE_CONFIG.localStoragePath, storageKey);

  // Ensure directory exists
  await fs.mkdir(STORAGE_CONFIG.localStoragePath, { recursive: true });
  await fs.writeFile(fullPath, file.bytes);

  return { storageKey };
}

/**
 * Retrieves file bytes by storage key.
 *
 * SCAFFOLD: throws until provider is implemented.
 *
 * TODO: Implement once storage provider is confirmed.
 */
export async function getFile(storageKey: string): Promise<Buffer> {
  const fullPath = path.join(STORAGE_CONFIG.localStoragePath, storageKey);
  return await fs.readFile(fullPath);
}

/**
 * Deletes a file from storage by its storage key.
 * Called during cleanup when job creation fails after a successful upload,
 * to prevent orphaned objects in storage.
 *
 * SCAFFOLD: throws until provider is implemented.
 *
 * TODO: Implement once storage provider is confirmed.
 */
export async function deleteFile(storageKey: string): Promise<void> {
  const fullPath = path.join(STORAGE_CONFIG.localStoragePath, storageKey);
  try {
    await fs.unlink(fullPath);
  } catch (error: any) {
    // Ignore if file doesn't exist
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}
