import type { Timestamp } from "firebase/firestore";
import type { AvatarConfig } from "@/types/avatar";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  twitterHandle: string | null;
  authProvider: string;
  marketingEmail: string | null;
  termsAcceptedAt: Timestamp | null;
  avatarConfig?: AvatarConfig | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
