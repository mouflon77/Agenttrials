import type { GameSaveDocument } from "@/types/game";
import { parseRoomFloor } from "@/types/game";
import type { AvatarConfig } from "@/types/avatar";

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
  /** Admin / server only — not exposed on player APIs after join. */
  leagueCode?: string;
  gameId: string;
  joinedAt: string;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  twitterHandle?: string;
  photoURL?: string;
  avatarConfig?: AvatarConfig;
  gameId: string;
  roomId: string;
  floor: number;
  /** Progress score: floor × 1000 + portals unlocked. */
  score: number;
  /** Negotiation quality 0–100; omitted until first keyword guessed. */
  negotiationScore?: number;
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

/** RAG text color: green at 100 → red at 0. */
export function negotiationScoreTextClass(score: number): string {
  if (score >= 80) return "text-term-green";
  if (score >= 60) return "text-lime-400";
  if (score >= 40) return "text-term-yellow";
  if (score >= 20) return "text-orange-400";
  return "text-term-red";
}

/** RAG background for score pill. */
export function negotiationScoreBgStyle(score: number): {
  backgroundColor: string;
  color: string;
} {
  const hue = Math.round((score / 100) * 120);
  return {
    backgroundColor: `hsla(${hue}, 72%, 38%, 0.35)`,
    color: `hsl(${hue}, 85%, 72%)`,
  };
}

export function formatNegotiationScore(score: number): string {
  return String(clampNegotiationScore(score)).padStart(3, "0");
}

export function clampNegotiationScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}

export function hasNegotiationScore(
  score: number | null | undefined,
): score is number {
  return typeof score === "number" && Number.isFinite(score);
}
