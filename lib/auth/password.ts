/**
 * lib/auth/password.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Password hashing and verification using Argon2id.
 *
 * ALGORITHM CHOICE — ARGON2ID
 * ───────────────────────────
 * Argon2id is the winner of the Password Hashing Competition (2015) and is
 * recommended by OWASP. It is memory-hard, making GPU/ASIC brute-force
 * attacks prohibitively expensive. The `id` variant combines:
 *   - Argon2i  (side-channel resistance via data-independent memory access)
 *   - Argon2d  (GPU resistance via data-dependent memory access)
 *
 * COST FACTOR
 * ───────────
 * memoryCost: 65536 KB (64 MiB)
 *   Each hash computation requires 64 MiB of RAM. An attacker attempting
 *   to run 1,000 parallel hash attempts would need 64 GiB of RAM.
 *
 * timeCost: 3 iterations
 *   Each hash makes 3 passes over the memory, increasing computation time
 *   and providing additional resistance.
 *
 * parallelism: 4
 *   Uses 4 threads per hash, consistent with a modern server CPU.
 *
 * ALTERNATIVE CONSIDERED
 * ──────────────────────
 * bcrypt — Rejected because:
 *   1. It truncates passwords at 72 bytes, creating an attack surface.
 *   2. It is CPU-bound only, meaning GPUs can parallelize attacks cheaply.
 *   3. Argon2id is the current OWASP first recommendation.
 *
 * USAGE
 * ─────
 * import { hashPassword, verifyPassword } from '@/lib/auth/password';
 * const hash = await hashPassword(plaintext);
 * const isValid = await verifyPassword(plaintext, storedHash);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { hash, verify, argon2id, type HashOptions } from 'argon2';

/** Argon2id options — do not lower these values in production. */
const ARGON2_OPTIONS: HashOptions = {
  type: argon2id,
  memoryCost: 65536, // 64 MiB — memory required per hash
  timeCost: 3,       // number of iterations over the memory
  parallelism: 4,    // number of parallel threads
};

/**
 * Hashes a plaintext password using Argon2id.
 *
 * @param plaintext - The raw password from the user
 * @returns A string containing the Argon2 hash (algorithm + params + salt + hash)
 *
 * @throws Will throw if argon2 fails to hash (e.g., out of memory)
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return hash(plaintext, ARGON2_OPTIONS);
}

/**
 * Verifies a plaintext password against a stored Argon2 hash.
 *
 * @param plaintext - The raw password to verify
 * @param storedHash - The stored hash to verify against
 * @returns true if the password matches, false otherwise
 *
 * @note This function will never throw for an invalid password — it returns
 *       false. It may throw if argon2 encounters a system error.
 */
export async function verifyPassword(plaintext: string, storedHash: string): Promise<boolean> {
  try {
    return await verify(storedHash, plaintext);
  } catch {
    // Argon2 throws on malformed hashes — treat as invalid rather than crashing
    return false;
  }
}
