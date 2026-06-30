"use client";

import { useAuth } from "@/contexts/AuthContext";
import { isAdminUid } from "@/lib/admin";

export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return isAdminUid(user?.uid);
}
