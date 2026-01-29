import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { resolve } from 'node:path';

if (getApps().length === 0) {
  const keyPath = resolve(import.meta.dirname, '../../../../firebase-key.json');
  initializeApp({ credential: cert(keyPath) });
}

export const db = getFirestore();
