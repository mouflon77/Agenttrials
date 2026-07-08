"use client";

import { useCallback, useEffect, useRef } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import type { GameSavePatch } from "@/types/game";

async function patchGame(gameId: string, patch: GameSavePatch): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return;

  const token = await user.getIdToken();
  const res = await fetch(`/api/games/${encodeURIComponent(gameId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(patch),
  });

  if (!res.ok && process.env.NODE_ENV === "development") {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    console.warn("[useGameSave]", data.error ?? res.status);
  }
}

export function useGameSave(
  gameId: string | null | undefined,
  snapshot: {
    roomId: string;
    playerX: number;
    playerZ: number;
    unlockedPortals: Record<string, string[]>;
  },
  options?: { skipPositionAutosave?: boolean },
) {
  const skipPosition = options?.skipPositionAutosave ?? false;
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const saveNow = useCallback(
    async (override?: Partial<GameSavePatch>) => {
      if (!gameId) return;
      const current = snapshotRef.current;
      const patch: GameSavePatch = {
        roomId: override?.roomId ?? current.roomId,
        unlockedPortals: override?.unlockedPortals ?? current.unlockedPortals,
        ...override,
      };
      if (!skipPosition || override?.playerX != null || override?.playerZ != null) {
        patch.playerX = override?.playerX ?? current.playerX;
        patch.playerZ = override?.playerZ ?? current.playerZ;
      }
      await patchGame(gameId, patch);
    },
    [gameId, skipPosition],
  );

  useEffect(() => {
    if (!gameId || skipPosition) return;
    const timer = window.setTimeout(() => {
      void saveNow();
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [
    gameId,
    skipPosition,
    snapshot.roomId,
    snapshot.playerX,
    snapshot.playerZ,
    JSON.stringify(snapshot.unlockedPortals),
    saveNow,
  ]);

  return { saveNow };
}
