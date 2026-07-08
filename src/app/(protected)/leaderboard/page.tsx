"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TerminalShell } from "@/components/terminal/TerminalShell";
import { useAuth } from "@/contexts/AuthContext";
import { useGames } from "@/hooks/useGames";
import { formatGameLabel } from "@/types/game";
import type { LeagueMembership } from "@/types/league";

export default function LeaderboardHubPage() {
  const { user } = useAuth();
  const { games, loading: gamesLoading } = useGames(user?.uid);
  const [memberships, setMemberships] = useState<LeagueMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState("");
  const [gameId, setGameId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/leagues/mine", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as {
        memberships?: LeagueMembership[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Could not load leagues.");
      setMemberships(data.memberships ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load leagues.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!gameId && games.length > 0) {
      setGameId(games[0]!.id);
    }
  }, [games, gameId]);

  const joinLeague = async () => {
    if (!user || !code.trim() || !gameId) return;
    setJoining(true);
    setError(null);
    setSuccess(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/leagues/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: code.trim(), gameId }),
      });
      const data = (await res.json()) as {
        membership?: LeagueMembership;
        error?: string;
      };
      if (!res.ok || !data.membership) {
        throw new Error(data.error ?? "Could not join league.");
      }
      setSuccess(`Joined ${data.membership.leagueName}.`);
      setCode("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join league.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <TerminalShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="border-l-4 border-term-green py-2 pl-4">
          <p className="font-mono text-sm text-zinc-400">
            &gt; LEADERBOARD_NET: <span className="text-white">ONLINE</span>
            <br />
            &gt; ENTER_CODE // SELECT_SAVE // COMPETE
          </p>
        </div>
        <Link
          href="/dashboard"
          className="chunky-btn rounded px-4 py-2 text-[10px] text-white"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <section className="terminal-bezel rounded-xl p-6 lg:col-span-5">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-term-pink">
            Join League
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase text-zinc-500">
                League code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="term-input w-full rounded px-3 py-2 font-mono text-lg uppercase tracking-[0.35em]"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase text-zinc-500">
                Competing save
              </label>
              <select
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                disabled={gamesLoading || games.length === 0}
                className="term-input w-full rounded px-3 py-2 font-mono text-sm"
              >
                {games.length === 0 ? (
                  <option value="">No saved games</option>
                ) : (
                  games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {formatGameLabel(game)}
                    </option>
                  ))
                )}
              </select>
              <p className="mt-1 font-mono text-[9px] text-zinc-600">
                Progress on this save counts toward the league.
              </p>
            </div>
            <button
              type="button"
              disabled={joining || !code.trim() || !gameId}
              onClick={() => void joinLeague()}
              className="chunky-btn btn-glow-green w-full rounded py-3 text-xs font-black uppercase"
            >
              {joining ? "JOINING..." : "Enter League"}
            </button>
            {error && (
              <p className="font-mono text-xs text-term-red">{error}</p>
            )}
            {success && (
              <p className="font-mono text-xs text-term-green">{success}</p>
            )}
          </div>
        </section>

        <section className="terminal-bezel rounded-xl p-6 lg:col-span-7">
          <h2 className="mb-6 text-sm font-black uppercase tracking-widest text-term-blue">
            My Leagues
          </h2>
          {loading ? (
            <p className="font-mono text-xs text-zinc-500">LOADING...</p>
          ) : memberships.length === 0 ? (
            <div className="rounded border border-dashed border-zinc-800 p-8 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-zinc-600">
                No leagues joined yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {memberships.map((m) => (
                <Link
                  key={m.leagueId}
                  href={`/leaderboard/${encodeURIComponent(m.leagueId)}`}
                  className="chunky-btn flex items-center justify-between rounded-lg border-zinc-800 bg-black/50 p-4 hover:border-term-green/40"
                >
                  <div>
                    <p className="text-sm font-bold uppercase text-white">
                      {m.leagueName}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-zinc-500">
                      CODE: {m.leagueCode}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-term-green">
                    VIEW →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </TerminalShell>
  );
}
