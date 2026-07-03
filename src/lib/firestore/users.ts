import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { getFirebaseDb } from "@/lib/firebase";
import { extractTwitterHandle } from "@/lib/twitter";
import { DEFAULT_AVATAR_CONFIG } from "@/types/avatar";
import type { AvatarConfig } from "@/types/avatar";
import type { UserProfile } from "@/types/user";

function getAuthProvider(user: User): string {
  return user.providerData[0]?.providerId ?? "twitter.com";
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const ref = doc(getFirebaseDb(), "users", user.uid);
  const snapshot = await getDoc(ref);

  const twitterHandle = extractTwitterHandle(user);

  if (snapshot.exists()) {
    await updateDoc(ref, {
      displayName: user.displayName,
      photoURL: user.photoURL,
      ...(twitterHandle ? { twitterHandle } : {}),
      updatedAt: serverTimestamp(),
    });
    const updated = await getDoc(ref);
    return updated.data() as UserProfile;
  }

  const profile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    twitterHandle,
    authProvider: getAuthProvider(user),
    marketingEmail: null,
    termsAcceptedAt: null,
    avatarConfig: DEFAULT_AVATAR_CONFIG,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, profile);

  const created = await getDoc(ref);
  return created.data() as UserProfile;
}

export async function saveMarketingEmail(
  uid: string,
  email: string,
): Promise<UserProfile> {
  const ref = doc(getFirebaseDb(), "users", uid);
  await updateDoc(ref, {
    marketingEmail: email,
    termsAcceptedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const updated = await getDoc(ref);
  return updated.data() as UserProfile;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(getFirebaseDb(), "users", uid));
  if (!snapshot.exists()) return null;
  return snapshot.data() as UserProfile;
}

export async function saveAvatarConfig(
  uid: string,
  avatarConfig: AvatarConfig,
): Promise<UserProfile> {
  const ref = doc(getFirebaseDb(), "users", uid);
  await updateDoc(ref, {
    avatarConfig,
    updatedAt: serverTimestamp(),
  });
  const updated = await getDoc(ref);
  return updated.data() as UserProfile;
}

export function formatTimestamp(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return "—";
  return timestamp.toDate().toLocaleString();
}
