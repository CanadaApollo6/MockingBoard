import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  // Firebase App Hosting provides Application Default Credentials automatically.
  // For local dev, use GOOGLE_APPLICATION_CREDENTIALS or an inline service account.
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
    });
  }

  // Falls back to ADC (GOOGLE_APPLICATION_CREDENTIALS env var or gcloud CLI)
  return initializeApp();
}

const app = getAdminApp();
export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
