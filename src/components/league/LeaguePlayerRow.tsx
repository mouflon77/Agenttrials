"use client";

import { AvatarPreview2D } from "@/components/profile/AvatarPreview2D";
import { NegotiationScoreBadge } from "@/components/league/NegotiationScoreBadge";
import { formatLevelReached } from "@/types/game";
import {
  DEFAULT_AVATAR_CONFIG,
  normalizeAvatarConfig,
} from "@/types/avatar";
import {
  formatLeaderboardRank,
  type LeaderboardEntry,
} from "@/types/league";

const RANK_COLORS = [
  "text-term-yellow",
  "text-zinc-300",
  "text-amber-600",
] as const;

interface LeaguePlayerRowProps {
  entry: LeaderboardEntry;
  rank: number;
  isYou?: boolean;
  /** Global negotiator board highlights negotiation score. */
  emphasis?: "league" | "negotiation";
}

export function LeaguePlayerRow({
  entry,
  rank,
  isYou,
  emphasis = "league",
}: LeaguePlayerRowProps) {
  const rankColor = RANK_COLORS[rank - 1] ?? "text-zinc-400";
  const handle =
    entry.twitterHandle?.replace(/^@/, "") || entry.displayName;
  const avatarConfig = normalizeAvatarConfig(
    entry.avatarConfig ?? DEFAULT_AVATAR_CONFIG,
  );

  return (
    <div
      className={`flex flex-wrap items-center gap-3 px-4 py-3 sm:gap-4 ${
        isYou ? "bg-term-green/5" : "bg-black/20"
      }`}
    >
      <span className={`w-8 font-mono text-lg font-black sm:w-10 ${rankColor}`}>
        {formatLeaderboardRank(rank)}
      </span>

      <div className="shrink-0 overflow-visible scale-90 sm:scale-100">
        <AvatarPreview2D
          config={avatarConfig}
          photoURL={entry.photoURL}
          size="xs"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold uppercase text-white">
          @{handle}
          {isYou && (
            <span className="ml-2 font-mono text-[9px] text-term-green">
              YOU
            </span>
          )}
        </p>
        <p className="font-mono text-[10px] text-zinc-500">
          LVL: {formatLevelReached(entry.roomId)}
        </p>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        {emphasis === "negotiation" ? (
          <>
            <NegotiationScoreBadge score={entry.negotiationScore} />
            <div className="text-right">
              <p className="font-mono text-sm font-bold text-term-yellow">
                FLOOR {entry.floor}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="text-right">
              <p className="font-mono text-sm font-bold text-term-yellow">
                FLOOR {entry.floor}
              </p>
              <p className="font-mono text-[9px] text-zinc-600">
                PROG {entry.score}
              </p>
            </div>
            <NegotiationScoreBadge score={entry.negotiationScore} />
          </>
        )}
      </div>
    </div>
  );
}
