// sdk/src/hash.ts
// SHA-256 hashing utilities

import { createHash } from 'crypto';
import { toCanonicalJson } from './canonicalJson';

/**
 * SHA-256 hash of a string, returns hex
 */
export function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * SHA-256 hash of bytes, returns hex
 */
export function sha256Bytes(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * SHA-256 hash of an object (via canonical JSON)
 */
export function sha256Object(obj: unknown): string {
  const canonical = toCanonicalJson(obj);
  return sha256(canonical);
}