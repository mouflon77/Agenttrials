import type { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  twitterHandle: string | null;
  authProvider: string;
  marketingEmail: string | null;
  termsAcceptedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
