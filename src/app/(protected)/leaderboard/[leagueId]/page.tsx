"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { TerminalShell } from "@/components/terminal/TerminalShell";
import { useAuth } from "@/contexts/AuthContext";
import { formatLevelReached } from "@/types/game";
import {
  formatLeaderboardRank,
  type LeaderboardEntry,
  type LeagueDocument,
} from "@/types/league";

const RANK_COLORS = [
  "text-term-yellow",
  "text-zinc-300",
  "text-amber-600",
] as const;

export default function LeagueLeaderboardPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = use(params);
  const { user } = useAuth();
  const [league, setLeague] = useState<LeagueDocument | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/leaderboard`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = (await res.json()) as {
        league?: LeagueDocument;
        entries?: LeaderboardEntry[];
        error?: string;
      };
      if (!res.ok || !data.league) {
        throw new Error(data.error ?? "Could not load leaderboard.");
      }
      setLeague(data.league);
      setEntries(data.entries ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load leaderboard.");
    } finally {
      setLoading(false);
    }
  }, [user, leagueId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <TerminalShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="border-l-4 border-term-blue py-2 pl-4">
          <p className="font-mono text-sm text-zinc-400">
            &gt; LEAGUE:{" "}
            <span className="font-bold text-white">
              {league?.name ?? "LOADING..."}
            </span>
            {league && (
              <>
                <br />
                &gt; CODE:{" "}
                <span className="tracking-[0.25em] text-term-yellow">
                  {league.code}
                </span>
              </>
            )}
          </p>
        </div>
        <Link
          href="/leaderboard"
          className="chunky-btn rounded px-4 py-2 text-[10px] text-white"
        >
          ← All Leagues
        </Link>
      </div>

      <section className="terminal-bezel overflow-hidden rounded-xl">
        <div className="border-b border-zinc-800 bg-black/40 px-4 py-3">
          <h2 className="font-mono text-xs font-black uppercase tracking-[0.2em] text-term-green">
            Standings // Sorted by floor reached
          </h2>
        </div>

        {error && (
          <p className="p-4 font-mono text-xs text-term-red">{error}</p>
        )}

        {loading ? (
          <p className="p-8 text-center font-mono text-xs text-zinc-500">
            FETCHING_RANKINGS...
          </p>
        ) : entries.length === 0 ? (
          <p className="p-8 text-center font-mono text-xs text-zinc-600">
            No entries yet. Be the first to compete.
          </p>
        ) : (
          <div className="divide-y divide-zinc-800">
            {entries.map((entry, index) => {
              const rank = index + 1;
              const isYou = entry.uid === user?.uid;
              const rankColor =
                RANK_COLORS[index] ?? "text-zinc-400";
              const label =
                entry.twitterHandle?.replace(/^@/, "") || entry.displayName;

              return (
                <div
                  key={entry.uid}
                  className={`flex flex-wrap items-center gap-4 px-4 py-3 ${
                    isYou ? "bg-term-green/5" : "bg-black/20"
                  }`}
                >
                  <span
                    className={`w-10 font-mono text-lg font-black ${rankColor}`}
                  >
                    {formatLeaderboardRank(rank)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold uppercase text-white">
                      {label}
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
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-term-yellow">
                      FLOOR {entry.floor}
                    </p>
                    <p className="font-mono text-[9px] text-zinc-600">
                      SCORE {entry.score}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </TerminalShell>
  );
}
