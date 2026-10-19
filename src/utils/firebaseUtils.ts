/**
 * Recursively strips all `undefined` values from objects and arrays.
 * Firebase Realtime Database strictly rejects any write containing `undefined`.
 */
export function sanitizeForFirebase<T>(obj: T): T {
  if (obj === undefined) {
    return null as any;
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirebase(item)) as any;
  }
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      result[key] = sanitizeForFirebase(val);
    }
  }
  return result as any;
}
