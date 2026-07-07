import { GRID_SIZE } from "@/types/room";

export const MAX_SAVED_GAMES = 5;

export interface GameSaveDocument {
  id: string;
  label: string;
  /** Room the player is currently in. */
  roomId: string;
  playerX: number;
  playerZ: number;
  /** First room when this game was started. */
  startRoomId: string;
  /** Portal ids unlocked per room (roomId → portal ids). */
  unlockedPortals: Record<string, string[]>;
  createdAt: string;
  updatedAt: string;
}

export interface GameSavePatch {
  roomId?: string;
  playerX?: number;
  playerZ?: number;
  unlockedPortals?: Record<string, string[]>;
  label?: string;
}

function clampTile(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(GRID_SIZE - 1, Math.max(0, Math.round(n)));
}

function normalizeUnlockedPortals(
  raw: unknown,
): Record<string, string[]> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string[]> = {};
  for (const [roomId, ids] of Object.entries(raw as Record<string, unknown>)) {
    if (!roomId || !Array.isArray(ids)) continue;
    const portalIds = ids.filter((id): id is string => typeof id === "string");
    if (portalIds.length > 0) out[roomId] = portalIds;
  }
  return out;
}

export function normalizeGameSave(
  id: string,
  data: Record<string, unknown> | undefined,
): GameSaveDocument | null {
  if (!data) return null;
  const roomId = String(data.roomId ?? "");
  if (!roomId) return null;

  return {
    id,
    label: String(data.label ?? "Saved game").slice(0, 80),
    roomId,
    playerX: clampTile(data.playerX, 6),
    playerZ: clampTile(data.playerZ, 6),
    startRoomId: String(data.startRoomId ?? roomId),
    unlockedPortals: normalizeUnlockedPortals(data.unlockedPortals),
    createdAt:
      typeof data.createdAt === "string"
        ? data.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof data.updatedAt === "string"
        ? data.updatedAt
        : new Date().toISOString(),
  };
}

export function formatGameLabel(game: GameSaveDocument): string {
  return game.label.trim() || game.id;
}

export function unlockedPortalsForRoom(
  game: GameSaveDocument,
  roomId: string,
): string[] {
  return game.unlockedPortals[roomId] ?? [];
}
