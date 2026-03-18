import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  // Firebase App Hosting provides Application Default Credentials automatically.
  // For local dev, use FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
    });
  }

  // Resolve GOOGLE_APPLICATION_CREDENTIALS — try cwd first, then monorepo root,
  // since Next.js may run from packages/web/ where relative paths break.
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    const candidates = [
      resolve(credPath),
      resolve(process.cwd(), '..', '..', credPath),
    ];
    for (const candidate of candidates) {
      try {
        const json = JSON.parse(readFileSync(candidate, 'utf-8'));
        return initializeApp({ credential: cert(json) });
      } catch {
        // Try next candidate
      }
    }
  }

  // Falls back to ADC (gcloud CLI or metadata server in production)
  return initializeApp();
}

const app = getAdminApp();
export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
