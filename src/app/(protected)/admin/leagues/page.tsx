"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LeagueShareButtons } from "@/components/admin/LeagueShareButtons";
import { TerminalShell } from "@/components/terminal/TerminalShell";
import { useAuth } from "@/contexts/AuthContext";
import type { LeagueDocument } from "@/types/league";

export default function AdminLeaguesPage() {
  const { user } = useAuth();
  const [leagues, setLeagues] = useState<LeagueDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [lastCreated, setLastCreated] = useState<LeagueDocument | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/leagues", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as {
        leagues?: LeagueDocument[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Could not load leagues.");
      setLeagues(data.leagues ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load leagues.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createLeague = async () => {
    if (!user || !name.trim()) return;
    setCreating(true);
    setError(null);
    setLastCreated(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/leagues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          ...(code.trim() ? { code: code.trim() } : {}),
        }),
      });
      const data = (await res.json()) as {
        league?: LeagueDocument;
        error?: string;
      };
      if (!res.ok || !data.league) {
        throw new Error(data.error ?? "Could not create league.");
      }
      setLastCreated(data.league);
      setName("");
      setCode("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create league.");
    } finally {
      setCreating(false);
    }
  };

  const deleteLeague = async (leagueId: string) => {
    if (!user) return;
    const confirmed = window.confirm("Delete this league and all standings?");
    if (!confirmed) return;

    setDeletingId(leagueId);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/admin/leagues/${encodeURIComponent(leagueId)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Could not delete league.");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete league.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <TerminalShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="border-l-4 border-term-pink py-2 pl-4">
          <p className="font-mono text-sm text-zinc-400">
            &gt; ADMIN_MODULE: <span className="text-white">LEAGUE_CTRL</span>
            <br />
            &gt; CREATE_CODES // DISTRIBUTE_TO_PLAYERS
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard"
            className="chunky-btn rounded px-4 py-2 text-[10px] text-white"
          >
            ← Dashboard
          </Link>
          <Link
            href="/admin/editor?roomId=room_01"
            className="chunky-btn capacitor-btn rounded px-4 py-2 text-[10px] text-white"
          >
            Editor
          </Link>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <section className="terminal-bezel rounded-xl p-6 lg:col-span-5">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-term-yellow">
            New League
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase text-zinc-500">
                League name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Spring Championship"
                className="term-input w-full rounded px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase text-zinc-500">
                Join code (optional)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="AUTO-GENERATE"
                className="term-input w-full rounded px-3 py-2 font-mono text-sm uppercase tracking-widest"
              />
              <p className="mt-1 font-mono text-[9px] text-zinc-600">
                Leave blank for a random 6-character code.
              </p>
            </div>
            <button
              type="button"
              disabled={creating || !name.trim()}
              onClick={() => void createLeague()}
              className="chunky-btn btn-glow-green w-full rounded py-3 text-xs font-black uppercase"
            >
              {creating ? "CREATING..." : "Create League"}
            </button>
          </div>

          {lastCreated && (
            <div className="mt-6 rounded border border-term-green/40 bg-term-green/10 p-4">
              <p className="font-mono text-[10px] uppercase text-term-green">
                League created
              </p>
              <p className="mt-2 text-lg font-black text-white">{lastCreated.name}</p>
              <p className="mt-1 font-mono text-sm text-term-yellow">
                CODE: <span className="tracking-[0.3em]">{lastCreated.code}</span>
              </p>
              <div className="mt-4">
                <LeagueShareButtons
                  leagueName={lastCreated.name}
                  code={lastCreated.code}
                />
              </div>
            </div>
          )}
        </section>

        <section className="terminal-bezel circuit-bg rounded-xl p-6 lg:col-span-7">
          <h2 className="relative z-10 mb-6 text-xl font-black uppercase italic tracking-widest text-term-blue">
            Active Leagues
          </h2>

          {error && (
            <p className="relative z-10 mb-4 font-mono text-xs text-term-red">
              {error}
            </p>
          )}

          <div className="relative z-10 space-y-3">
            {loading ? (
              <p className="font-mono text-xs text-zinc-500">LOADING_LEAGUES...</p>
            ) : leagues.length === 0 ? (
              <p className="font-mono text-xs text-zinc-600">
                No leagues yet. Create one to get a join code.
              </p>
            ) : (
              leagues.map((league) => (
                <div
                  key={league.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded border-2 border-zinc-800 bg-black/60 p-4"
                >
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-white">
                      {league.name}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-term-yellow">
                      CODE:{" "}
                      <span className="tracking-[0.25em]">{league.code}</span>
                    </p>
                    <p className="font-mono text-[9px] text-zinc-600">
                      {league.active ? "STATUS: OPEN" : "STATUS: CLOSED"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/leaderboard/${encodeURIComponent(league.id)}`}
                        className="chunky-btn rounded px-4 py-2 text-[10px] text-white"
                      >
                        View Board
                      </Link>
                      <button
                        type="button"
                        disabled={deletingId === league.id}
                        onClick={() => void deleteLeague(league.id)}
                        className="chunky-btn btn-recessed-red rounded px-4 py-2 text-[10px] font-black"
                      >
                        {deletingId === league.id ? "..." : "DEL"}
                      </button>
                    </div>
                    <LeagueShareButtons
                      leagueName={league.name}
                      code={league.code}
                      compact
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </TerminalShell>
  );
}
