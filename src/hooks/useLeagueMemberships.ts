"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { LeagueMembership } from "@/types/league";

export function useLeagueMemberships() {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<LeagueMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/leagues/mine", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as {
        memberships?: LeagueMembership[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Could not load leagues.");
      setMemberships(data.memberships ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load leagues.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { memberships, loading, error, refresh };
}

export function leagueMembershipsByGameId(
  memberships: LeagueMembership[],
): Map<string, LeagueMembership> {
  const map = new Map<string, LeagueMembership>();
  for (const membership of memberships) {
    if (membership.gameId) {
      map.set(membership.gameId, membership);
    }
  }
  return map;
}
