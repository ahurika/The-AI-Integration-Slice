/**
 * src/db/repositories/file-asset.repository.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Database access for FileAsset records.
 *
 * SCAFFOLD — method bodies return typed stubs.
 * Full implementation follows once storage provider is confirmed.
 *
 * Rules (R3-019):
 * - Never accept file bytes as a parameter — only storage key + metadata.
 * - Always scope reads to userId.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { prisma } from '@/lib/db/prisma';
import type { FileAssetRecord } from '@/src/domain/ai/types';

export interface CreateFileAssetInput {
  userId: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Persists metadata for one uploaded file.
 * File bytes must already be in object storage before calling this.
 */
export async function createFileAsset(
  input: CreateFileAssetInput,
): Promise<FileAssetRecord> {
  return prisma.fileAsset.create({
    data: {
      userId: input.userId,
      storageKey: input.storageKey,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    },
  }) as Promise<FileAssetRecord>;
}

/**
 * Finds a FileAsset by id, scoped to the owning user.
 * Returns null if not found or not owned by userId (R3-005 ownership).
 */
export async function findFileAssetByIdForUser(
  id: string,
  userId: string,
): Promise<FileAssetRecord | null> {
  return prisma.fileAsset.findFirst({
    where: { id, userId },
  }) as Promise<FileAssetRecord | null>;
}
