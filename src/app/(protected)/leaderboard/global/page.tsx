"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LeaguePlayerRow } from "@/components/league/LeaguePlayerRow";
import { TerminalShell } from "@/components/terminal/TerminalShell";
import { useAuth } from "@/contexts/AuthContext";
import type { LeaderboardEntry } from "@/types/league";

const PAGE_SIZE = 50;

export default function GlobalLeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (offset: number, append: boolean) => {
      if (!user) return;
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError(null);
      }
      try {
        const token = await user.getIdToken();
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(offset),
        });
        const res = await fetch(`/api/leaderboard/negotiators?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const raw = await res.text();
        const data = (raw ? JSON.parse(raw) : {}) as {
          entries?: LeaderboardEntry[];
          hasMore?: boolean;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Could not load rankings.");
        const next = data.entries ?? [];
        setEntries((prev) => (append ? [...prev, ...next] : next));
        setHasMore(Boolean(data.hasMore));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load rankings.");
        if (!append) setEntries([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user],
  );

  useEffect(() => {
    void loadPage(0, false);
  }, [loadPage]);

  return (
    <TerminalShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="border-l-4 border-term-pink py-2 pl-4">
          <p className="font-mono text-sm text-zinc-400">
            &gt; GLOBAL_RANKINGS: <span className="text-white">FULL_LIST</span>
            <br />
            &gt; FLOOR_PROGRESS // ALL_PLAYERS
          </p>
        </div>
        <Link
          href="/leaderboard"
          className="chunky-btn rounded px-4 py-2 text-[10px] text-white"
        >
          ← Leaderboard Hub
        </Link>
      </div>

      <section className="terminal-bezel overflow-hidden rounded-xl">
        <div className="border-b border-zinc-800 bg-black/40 px-4 py-3">
          <h2 className="font-mono text-xs font-black uppercase tracking-[0.2em] text-term-pink">
            Global Rankings
          </h2>
          <p className="mt-1 font-mono text-[9px] text-zinc-600">
            All players with saved game progress. Ranked by floor progress, then
            negotiation score.
          </p>
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
            No rankings yet. Start a game from the dashboard to appear here.
          </p>
        ) : (
          <>
            <div className="divide-y divide-zinc-800">
              {entries.map((entry, index) => (
                <LeaguePlayerRow
                  key={entry.uid}
                  entry={entry}
                  rank={index + 1}
                  isYou={entry.uid === user?.uid}
                  emphasis="league"
                />
              ))}
            </div>
            {hasMore && (
              <div className="border-t border-zinc-800 p-4 text-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void loadPage(entries.length, true)}
                  className="chunky-btn rounded px-6 py-3 text-[10px] font-black uppercase text-white"
                >
                  {loadingMore ? "LOADING..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </TerminalShell>
  );
}
