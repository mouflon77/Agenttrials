import type { GameSaveDocument } from "@/types/game";
import { parseRoomFloor } from "@/types/game";

export interface LeagueDocument {
  id: string;
  name: string;
  /** Uppercase join code players enter. */
  code: string;
  active: boolean;
  createdAt: string;
  createdBy: string;
}

export interface LeagueMembership {
  leagueId: string;
  leagueName: string;
  leagueCode: string;
  gameId: string;
  joinedAt: string;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  twitterHandle?: string;
  gameId: string;
  roomId: string;
  floor: number;
  score: number;
  updatedAt: string;
}

export function normalizeLeagueCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}

export function computeLeaderboardScore(game: Pick<GameSaveDocument, "roomId" | "unlockedPortals">): {
  floor: number;
  score: number;
  roomId: string;
} {
  const floor = parseRoomFloor(game.roomId);
  const portalsUnlocked = Object.values(game.unlockedPortals).reduce(
    (sum, ids) => sum + ids.length,
    0,
  );
  return {
    roomId: game.roomId,
    floor,
    score: floor * 1000 + portalsUnlocked,
  };
}

export function formatLeaderboardRank(rank: number): string {
  return String(rank).padStart(2, "0");
}
