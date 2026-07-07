"use client";

import { useEffect, useState } from "react";
import { subscribeToGame } from "@/lib/firestore/games";
import type { GameSaveDocument } from "@/types/game";

export function useGame(uid: string | null | undefined, gameId: string | null) {
  const [game, setGame] = useState<GameSaveDocument | null>(null);
  const [loading, setLoading] = useState(Boolean(uid && gameId));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid || !gameId) {
      setGame(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    return subscribeToGame(
      uid,
      gameId,
      (next) => {
        setGame(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
  }, [uid, gameId]);

  return { game, loading, error };
}
