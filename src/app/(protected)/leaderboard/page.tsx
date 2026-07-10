"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LeaguePlayerRow } from "@/components/league/LeaguePlayerRow";
import { TerminalShell } from "@/components/terminal/TerminalShell";
import { useAuth } from "@/contexts/AuthContext";
import { useLeagueMemberships } from "@/hooks/useLeagueMemberships";
import { type GameSaveDocument } from "@/types/game";
import type { LeaderboardEntry } from "@/types/league";

export default function LeaderboardHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { memberships, loading } = useLeagueMemberships();
  const [topNegotiators, setTopNegotiators] = useState<LeaderboardEntry[]>([]);
  const [negotiatorsLoading, setNegotiatorsLoading] = useState(true);
  const [creatingRun, setCreatingRun] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const joinCode = searchParams.get("join")?.trim().toUpperCase();
    if (joinCode) setCode(joinCode);
  }, [searchParams]);

  const loadNegotiators = useCallback(async () => {
    if (!user) return;
    setNegotiatorsLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/leaderboard/negotiators", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw = await res.text();
      const data = (raw ? JSON.parse(raw) : {}) as {
        entries?: LeaderboardEntry[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Could not load rankings.");
      setTopNegotiators(data.entries ?? []);
    } catch {
      setTopNegotiators([]);
    } finally {
      setNegotiatorsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadNegotiators();
  }, [loadNegotiators]);

  const startNewLeagueRun = async () => {
    if (!user || !code.trim()) return;
    setCreatingRun(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const createRes = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ startRoomId: "room_01" }),
      });
      const createData = (await createRes.json()) as {
        game?: GameSaveDocument;
        error?: string;
      };
      if (!createRes.ok || !createData.game) {
        throw new Error(createData.error ?? "Could not start a new game.");
      }

      const game = createData.game;
      const joinRes = await fetch("/api/leagues/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: code.trim(), gameId: game.id }),
      });
      const joinData = (await joinRes.json()) as {
        membership?: { leagueId: string; leagueName: string };
        error?: string;
      };
      if (!joinRes.ok || !joinData.membership) {
        throw new Error(joinData.error ?? "Could not join league.");
      }

      const params = new URLSearchParams({
        gameId: game.id,
        spawnX: String(game.playerX),
        spawnZ: String(game.playerZ),
      });
      router.push(
        `/play/${encodeURIComponent(game.roomId)}?${params.toString()}`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start league run.",
      );
    } finally {
      setCreatingRun(false);
    }
  };

  return (
    <TerminalShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="border-l-4 border-term-green py-2 pl-4">
          <p className="font-mono text-sm text-zinc-400">
            &gt; LEADERBOARD_NET: <span className="text-white">ONLINE</span>
            <br />
            &gt; GLOBAL_RANKINGS // LEAGUES
          </p>
        </div>
        <Link
          href="/dashboard"
          className="chunky-btn rounded px-4 py-2 text-[10px] text-white"
        >
          ← Dashboard
        </Link>
      </div>

      <section className="terminal-bezel mb-8 overflow-hidden rounded-xl">
        <div className="border-b border-zinc-800 bg-black/40 px-4 py-3">
          <h2 className="font-mono text-xs font-black uppercase tracking-[0.2em] text-term-pink">
            Global Rankings
          </h2>
          <p className="mt-1 font-mono text-[9px] text-zinc-600">
            All players with saved game progress. Ranked by floor progress, then
            negotiation score once you have talked to a gatekeeper.
          </p>
        </div>
        {negotiatorsLoading ? (
          <p className="p-6 font-mono text-xs text-zinc-500">LOADING...</p>
        ) : topNegotiators.length === 0 ? (
          <p className="p-6 text-center font-mono text-xs text-zinc-600">
            No rankings yet. Start a game from the dashboard to appear here.
          </p>
        ) : (
          <div className="divide-y divide-zinc-800">
            {topNegotiators.map((entry, index) => (
              <LeaguePlayerRow
                key={entry.uid}
                entry={entry}
                rank={index + 1}
                isYou={entry.uid === user?.uid}
                emphasis="league"
              />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-12">
        <section className="terminal-bezel rounded-xl p-6 lg:col-span-5">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-term-pink">
            Join League
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase text-zinc-500">
                Invite code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="term-input w-full rounded px-3 py-2 font-mono text-lg uppercase tracking-[0.35em]"
              />
              <p className="mt-1 font-mono text-[9px] text-zinc-600">
                Enter the code shared with you. A new game save is created for
                this league run.
              </p>
            </div>
            <button
              type="button"
              disabled={creatingRun || !code.trim()}
              onClick={() => void startNewLeagueRun()}
              className="chunky-btn btn-glow-green w-full rounded py-3 text-xs font-black uppercase"
            >
              {creatingRun ? "STARTING..." : "Start new game for league"}
            </button>
            {error && (
              <p className="font-mono text-xs text-term-red">{error}</p>
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
                    <p className="mt-1 font-mono text-[9px] text-zinc-500">
                      League run linked to your account
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
