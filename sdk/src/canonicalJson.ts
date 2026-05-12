// sdk/src/canonicalJson.ts
// Canonical JSON serialization for consistent hashing

import canonicalize from 'canonicalize';

/**
 * Convert object to canonical JSON string
 * - Keys sorted alphabetically
 * - No whitespace
 * - Consistent number formatting
 */
export function toCanonicalJson(obj: unknown): string {
  const result = canonicalize(obj);
  if (result === undefined) {
    throw new Error('Failed to canonicalize object');
  }
  return result;
}