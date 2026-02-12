import 'server-only';

/** Strip Firestore class instances (Timestamp, etc.) to plain serializable objects.
 *  Firestore Admin SDK Timestamps store data as `_seconds`/`_nanoseconds` (private
 *  own properties) with `seconds`/`nanoseconds` as getters. `JSON.stringify` only
 *  serializes own enumerable properties, so the result has underscored keys.
 *  The replacer normalizes these to `{ seconds, nanoseconds }`. */
export function sanitize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      if (
        value !== null &&
        typeof value === 'object' &&
        '_seconds' in value &&
        '_nanoseconds' in value
      ) {
        return { seconds: value._seconds, nanoseconds: value._nanoseconds };
      }
      return value;
    }),
  );
}

/** Hydrate a single Firestore document snapshot into a typed object with its id. */
export function hydrateDoc<T extends { id: string }>(
  doc: FirebaseFirestore.DocumentSnapshot,
): T {
  return { id: doc.id, ...doc.data() } as T;
}

/** Hydrate all documents from a query snapshot into typed objects. */
export function hydrateDocs<T extends { id: string }>(
  snapshot: FirebaseFirestore.QuerySnapshot,
): T[] {
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}
