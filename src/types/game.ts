import { GRID_SIZE } from "@/types/room";
import {
  normalizeGatekeeperStats,
  type GatekeeperStats,
} from "@/types/room";

export const MAX_SAVED_GAMES = 5;

/** AI-generated negotiation puzzle for one NPC in one playthrough. */
export interface GeneratedNpcPuzzle {
  /** Disposition / conditions the gatekeeper wants satisfied. */
  prompt: string;
  /** Comma-separated instant-pass keywords (unique per new game). */
  passKeywords: string;
  /** Shown when the player asks for a hint. */
  passHint: string;
  stats: GatekeeperStats;
}

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
  /** Per-room, per-npc generated puzzles for this playthrough. */
  npcPuzzles: Record<string, Record<string, GeneratedNpcPuzzle>>;
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

function normalizeNpcPuzzles(
  raw: unknown,
): Record<string, Record<string, GeneratedNpcPuzzle>> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, Record<string, GeneratedNpcPuzzle>> = {};
  for (const [roomId, byNpc] of Object.entries(raw as Record<string, unknown>)) {
    if (!roomId || !byNpc || typeof byNpc !== "object") continue;
    const roomPuzzles: Record<string, GeneratedNpcPuzzle> = {};
    for (const [npcId, puzzleRaw] of Object.entries(
      byNpc as Record<string, unknown>,
    )) {
      if (!npcId || !puzzleRaw || typeof puzzleRaw !== "object") continue;
      const p = puzzleRaw as Partial<GeneratedNpcPuzzle>;
      const prompt = String(p.prompt ?? "").trim();
      const passKeywords = String(p.passKeywords ?? "").trim();
      const passHint = String(p.passHint ?? "").trim();
      if (!prompt || !passKeywords) continue;
      roomPuzzles[npcId] = {
        prompt: prompt.slice(0, 1200),
        passKeywords: passKeywords.slice(0, 200),
        passHint: passHint.slice(0, 600),
        stats: normalizeGatekeeperStats(p.stats),
      };
    }
    if (Object.keys(roomPuzzles).length > 0) out[roomId] = roomPuzzles;
  }
  return out;
}

export function parseRoomFloor(roomId: string): number {
  const match = /^room_(\d+)$/i.exec(roomId);
  if (match) return Math.max(1, Number(match[1]));
  return 1;
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
    npcPuzzles: normalizeNpcPuzzles(data.npcPuzzles),
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

/** Human label for the furthest room reached in a save. */
export function formatLevelReached(
  roomId: string,
  roomTitle?: string,
): string {
  const title = roomTitle?.trim();
  if (title) return title;
  const match = /^room_(\d+)$/i.exec(roomId);
  if (match) return `Floor ${Number(match[1])}`;
  return roomId.toUpperCase();
}

export function unlockedPortalsForRoom(
  game: GameSaveDocument,
  roomId: string,
): string[] {
  return game.unlockedPortals[roomId] ?? [];
}
