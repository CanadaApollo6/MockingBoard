'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { getClientAuth, getClientDb } from '@/lib/firebase';

export interface UserProfile {
  displayName: string;
  email?: string;
  discordUsername?: string;
  hasDiscord: boolean;
  hasWebhook: boolean;
  isGuest: boolean;
}

interface AuthContextValue {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getClientAuth();
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
  }, []);

  // Fetch user profile from Firestore when auth state changes
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    const db = getClientDb();
    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile({
          displayName: data.displayName ?? data.discordUsername ?? 'User',
          email: data.email,
          discordUsername: data.discordUsername,
          hasDiscord: !!data.discordId,
          hasWebhook: !!data.discordWebhookUrl,
          isGuest: !!data.isGuest,
        });
      }
    });
  }, [user]);

  async function signOut() {
    const auth = getClientAuth();
    await firebaseSignOut(auth);
    await fetch('/api/auth/session', { method: 'DELETE' });
    setProfile(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
