import type { User } from "firebase/auth";
import type { UserProfile } from "@/types/user";

function normalizeHandle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

/** Best-effort X/Twitter @handle from Firebase auth + stored profile. */
export function extractTwitterHandle(user: User): string | null {
  const twitter = user.providerData.find((p) => p.providerId === "twitter.com");
  const candidates = [
    twitter?.displayName,
    user.displayName,
  ].filter((v): v is string => Boolean(v?.trim()));

  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (trimmed.startsWith("@")) {
      return normalizeHandle(trimmed);
    }
    if (/^[A-Za-z0-9_]{1,15}$/.test(trimmed)) {
      return normalizeHandle(trimmed);
    }
  }

  return null;
}

export function formatTwitterHandle(
  user: User,
  profile?: UserProfile | null,
): string | null {
  if (profile?.twitterHandle) {
    return normalizeHandle(profile.twitterHandle);
  }
  return extractTwitterHandle(user);
}
