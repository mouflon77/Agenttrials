"use client";

import { useCallback, useEffect, useState } from "react";
import { GRID_SIZE, type PlayerPosition } from "@/types/room";

const MOVE_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);

function isBlocked(x: number, z: number, blocked: Set<string>): boolean {
  return blocked.has(`${x},${z}`);
}

export function usePlayerMovement(
  initial: PlayerPosition,
  blockedCells: Set<string>,
) {
  const [position, setPosition] = useState<PlayerPosition>(initial);

  const tryMove = useCallback(
    (dx: number, dz: number) => {
      setPosition((prev) => {
        const nx = prev.x + dx;
        const nz = prev.z + dz;
        if (nx < 0 || nz < 0 || nx >= GRID_SIZE || nz >= GRID_SIZE) return prev;
        if (isBlocked(nx, nz, blockedCells)) return prev;
        return { x: nx, z: nz };
      });
    },
    [blockedCells],
  );

  const moveTo = useCallback(
    (x: number, z: number) => {
      if (x < 0 || z < 0 || x >= GRID_SIZE || z >= GRID_SIZE) return;
      if (isBlocked(x, z, blockedCells)) return;
      setPosition({ x, z });
    },
    [blockedCells],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!MOVE_KEYS.has(key)) return;
      event.preventDefault();
      if (key === "w" || key === "arrowup") tryMove(0, -1);
      if (key === "s" || key === "arrowdown") tryMove(0, 1);
      if (key === "a" || key === "arrowleft") tryMove(-1, 0);
      if (key === "d" || key === "arrowright") tryMove(1, 0);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tryMove]);

  return { position, moveTo, tryMove, setPosition };
}
