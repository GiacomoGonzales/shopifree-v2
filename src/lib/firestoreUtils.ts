/**
 * Recursively removes properties whose value is `undefined` from objects and
 * arrays of objects. Firestore rejects `undefined` values with
 * `FirebaseError: Function ... called with invalid data. Unsupported field
 * value: undefined`, so we sanitize payloads before any write that could
 * legitimately contain optional fields the user cleared in the UI.
 *
 * Notes:
 * - Preserves `null` (Firestore accepts it; we use it explicitly to clear
 *   fields like `video`).
 * - Preserves `0`, `''`, `false` (only `undefined` is stripped).
 * - Returns the input unchanged for non-objects (string, number, etc.).
 * - Cleans nested objects and array entries.
 */
export function stripUndefined<T>(value: T): T {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) {
    return value.map(stripUndefined) as unknown as T
  }
  if (typeof value === 'object') {
    const cleaned: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        cleaned[key] = stripUndefined(v)
      }
    }
    return cleaned as T
  }
  return value
}
