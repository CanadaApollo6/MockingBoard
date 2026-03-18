import { test as setup } from '@playwright/test';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');

setup('authenticate', async ({ page }) => {
  const uid = process.env.PLAYWRIGHT_TEST_UID;
  if (!uid) {
    // No UID configured — skip auth setup gracefully.
    // Tests using authenticatedPage fixture will fail, but all other tests run fine.
    console.log('PLAYWRIGHT_TEST_UID not set — skipping auth setup.');
    return;
  }

  // Initialize Firebase Admin standalone (outside Next.js)
  if (getApps().length === 0) {
    const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (saJson) {
      initializeApp({ credential: cert(JSON.parse(saJson)) });
    } else {
      // Falls back to GOOGLE_APPLICATION_CREDENTIALS env var
      initializeApp();
    }
  }

  const customToken = await getAuth().createCustomToken(uid);

  // Navigate through the real auth callback flow
  await page.goto(`/auth/callback?token=${customToken}`);

  // Wait for auth callback to complete and redirect away
  await page.waitForFunction(
    () => !window.location.pathname.startsWith('/auth/callback'),
    { timeout: 15_000 },
  );

  // Save authenticated browser state (cookies + localStorage)
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});
