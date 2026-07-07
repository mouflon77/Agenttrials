"use client";

import { useEffect, useState } from "react";
import { subscribeToGames } from "@/lib/firestore/games";
import type { GameSaveDocument } from "@/types/game";

export function useGames(uid: string | null | undefined) {
  const [games, setGames] = useState<GameSaveDocument[]>([]);
  const [loading, setLoading] = useState(Boolean(uid));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) {
      setGames([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    return subscribeToGames(
      uid,
      (next) => {
        setGames(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
  }, [uid]);

  return { games, loading, error };
}
