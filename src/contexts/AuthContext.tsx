"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  TwitterAuthProvider,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { ensureUserProfile, saveMarketingEmail } from "@/lib/firestore/users";
import type { UserProfile } from "@/types/user";

interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithTwitter: () => Promise<void>;
  saveEmailConsent: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const profile = await ensureUserProfile(firebaseUser);
          setUserProfile(profile);
        } catch {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithTwitter = async () => {
    const auth = getFirebaseAuth();
    const provider = new TwitterAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const profile = await ensureUserProfile(result.user);
    setUserProfile(profile);
  };

  const saveEmailConsent = async (email: string) => {
    if (!user) return;
    const profile = await saveMarketingEmail(user.uid, email);
    setUserProfile(profile);
  };

  const logout = async () => {
    await signOut(getFirebaseAuth());
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signInWithTwitter,
        saveEmailConsent,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
