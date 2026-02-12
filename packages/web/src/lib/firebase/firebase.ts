import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

function getApp(): FirebaseApp {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

let _auth: Auth | undefined;
let _clientDb: Firestore | undefined;

export function getClientAuth(): Auth {
  if (!_auth) _auth = getAuth(getApp());
  return _auth;
}

export function getClientDb(): Firestore {
  if (!_clientDb) _clientDb = getFirestore(getApp());
  return _clientDb;
}
