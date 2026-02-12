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
import { getClientAuth, getClientDb } from '@/lib/firebase/firebase';
import type { TeamAbbreviation } from '@mockingboard/shared';

export interface UserProfile {
  displayName: string;
  email?: string;
  discordUsername?: string;
  hasDiscord: boolean;
  hasWebhook: boolean;
  isGuest: boolean;
  slug?: string;
  bio?: string;
  avatar?: string;
  links?: {
    youtube?: string;
    twitter?: string;
    bluesky?: string;
    website?: string;
  };
  isPublic?: boolean;
  isAdmin?: boolean;
  favoriteTeam?: TeamAbbreviation;
  favoriteSchool?: string;
  followedTeam?: TeamAbbreviation;
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
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      // Proactively refresh the server-side session cookie so it stays in sync
      // with the client-side Firebase Auth state. This runs on page load and on
      // token refresh (~hourly), preventing 401s from stale/expired cookies.
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });
        } catch {
          // Ignore — will retry on next auth state change
        }
      }
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
          slug: data.slug,
          bio: data.bio,
          avatar: data.avatar,
          links: data.links,
          isPublic: data.isPublic,
          isAdmin: !!data.isAdmin,
          favoriteTeam: data.favoriteTeam || undefined,
          favoriteSchool: data.favoriteSchool || undefined,
          followedTeam: data.followedTeam || undefined,
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
    window.location.href = '/';
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
