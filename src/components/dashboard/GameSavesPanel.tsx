"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseAuth } from "@/lib/firebase";
import { getFirebaseDb } from "@/lib/firebase";
import { MAX_SAVED_GAMES, formatGameLabel, formatLevelReached, type GameSaveDocument } from "@/types/game";
import type { LeagueMembership } from "@/types/league";
import { normalizeRoom, resolvePlaySpawn, resolvePlayerSpawn } from "@/types/room";

interface GameSavesPanelProps {
  games: GameSaveDocument[];
  loading: boolean;
  loadError?: string | null;
  roomsById: Map<string, { title?: string; playerSpawnX?: number; playerSpawnZ?: number }>;
  defaultStartRoomId: string;
  leagueByGameId?: Map<string, LeagueMembership>;
}

const SLOT_COLORS = ["cartridge-red", "cartridge-blue", "cartridge-purple"];

function buildContinueHref(
  game: GameSaveDocument,
  roomMeta?: {
    title?: string;
    playerSpawnX?: number;
    playerSpawnZ?: number;
  } | null,
): string {
  const roomSpawn =
    roomMeta &&
    Number.isFinite(roomMeta.playerSpawnX) &&
    Number.isFinite(roomMeta.playerSpawnZ)
      ? {
          playerSpawnX: roomMeta.playerSpawnX as number,
          playerSpawnZ: roomMeta.playerSpawnZ as number,
        }
      : null;
  const spawn = resolvePlaySpawn(roomSpawn, game, game.roomId, null);
  const params = new URLSearchParams({
    gameId: game.id,
    spawnX: String(spawn.x),
    spawnZ: String(spawn.z),
  });
  return `/play/${encodeURIComponent(game.roomId)}?${params.toString()}`;
}

export function GameSavesPanel({
  games,
  loading,
  loadError = null,
  roomsById,
  defaultStartRoomId,
  leagueByGameId,
}: GameSavesPanelProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [creatingLeague, setCreatingLeague] = useState(false);
  const [showLeagueJoin, setShowLeagueJoin] = useState(false);
  const [leagueCode, setLeagueCode] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const atLimit = games.length >= MAX_SAVED_GAMES;
  const emptySlots = Math.max(0, MAX_SAVED_GAMES - games.length);

  const startNewGame = async () => {
    setCreating(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error("Sign in to start a game.");

      const roomSnap = await getDoc(
        doc(getFirebaseDb(), "rooms", defaultStartRoomId),
      );
      const room = roomSnap.exists()
        ? normalizeRoom(roomSnap.data() as Parameters<typeof normalizeRoom>[0])
        : null;
      const spawn = resolvePlayerSpawn(room);

      const token = await user.getIdToken();
      const res = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          startRoomId: defaultStartRoomId,
          playerSpawnX: spawn.x,
          playerSpawnZ: spawn.z,
        }),
      });

      const data = (await res.json()) as {
        game?: GameSaveDocument;
        error?: string;
      };
      if (!res.ok || !data.game) {
        throw new Error(data.error ?? "Could not start a new game.");
      }

      const params = new URLSearchParams({
        gameId: data.game.id,
        spawnX: String(data.game.playerX),
        spawnZ: String(data.game.playerZ),
      });
      router.push(
        `/play/${encodeURIComponent(data.game.roomId)}?${params.toString()}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start a new game.");
    } finally {
      setCreating(false);
    }
  };

  const startNewLeagueGame = async () => {
    const code = leagueCode.trim().toUpperCase();
    if (!code) return;
    setCreatingLeague(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error("Sign in to start a league game.");

      const token = await user.getIdToken();
      const createRes = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ startRoomId: defaultStartRoomId }),
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
        body: JSON.stringify({ code, gameId: game.id }),
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
        err instanceof Error ? err.message : "Could not start league game.",
      );
    } finally {
      setCreatingLeague(false);
    }
  };

  const deleteGame = async (gameId: string) => {
    const confirmed = window.confirm("Delete this saved game? This cannot be undone.");
    if (!confirmed) return;

    setDeletingId(gameId);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error("Sign in required.");

      const token = await user.getIdToken();
      const res = await fetch(`/api/games/${encodeURIComponent(gameId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Could not delete game.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete game.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b-4 border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-term-yellow">
            Saved Games
          </h2>
          <p className="mt-1 font-mono text-[10px] text-zinc-500">
            SLOTS: {games.length}/{MAX_SAVED_GAMES}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={creating || creatingLeague || atLimit}
            onClick={() => {
              setShowLeagueJoin((open) => !open);
              setError(null);
            }}
            className="chunky-btn rounded-md border-term-blue/50 bg-zinc-800 px-4 py-3 text-sm text-term-blue"
          >
            + NEW LEAGUE GAME
          </button>
          <button
            type="button"
            disabled={creating || creatingLeague || atLimit}
            onClick={() => void startNewGame()}
            className="chunky-btn rounded-md border-zinc-900 bg-zinc-700 px-6 py-3 text-sm text-white"
          >
            {creating ? "GENERATING..." : "+ NEW GAME"}
          </button>
        </div>
      </div>

      {showLeagueJoin && (
        <div className="mb-6 rounded-lg border-2 border-term-blue/40 bg-black/40 p-4">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-term-blue">
            Enter league invite code — creates a new save linked to that league
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[10rem] flex-1">
              <label className="mb-1 block font-mono text-[10px] uppercase text-zinc-500">
                Invite code
              </label>
              <input
                type="text"
                value={leagueCode}
                onChange={(e) => setLeagueCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && leagueCode.trim() && !atLimit) {
                    void startNewLeagueGame();
                  }
                }}
                placeholder="ABC123"
                disabled={creatingLeague || atLimit}
                className="term-input w-full rounded px-3 py-2 font-mono text-lg uppercase tracking-[0.35em]"
              />
            </div>
            <button
              type="button"
              disabled={creatingLeague || atLimit || !leagueCode.trim()}
              onClick={() => void startNewLeagueGame()}
              className="chunky-btn btn-glow-green rounded px-5 py-3 text-xs font-black uppercase"
            >
              {creatingLeague ? "STARTING..." : "Start league game"}
            </button>
            <button
              type="button"
              disabled={creatingLeague}
              onClick={() => {
                setShowLeagueJoin(false);
                setLeagueCode("");
              }}
              className="chunky-btn rounded px-4 py-3 text-xs text-zinc-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {atLimit && (
        <p className="mb-4 font-mono text-[10px] text-term-yellow">
          SAVE_LIMIT_REACHED — DELETE A GAME TO CONTINUE.
        </p>
      )}

      {loadError && (
        <p className="mb-4 font-mono text-xs text-term-red">
          Could not load saves: {loadError}
        </p>
      )}

      {error && (
        <p className="mb-4 font-mono text-xs text-term-red">{error}</p>
      )}

      <div className="space-y-6">
        {loading ? (
          <p className="font-mono text-xs text-zinc-500">READING_STORAGE...</p>
        ) : games.length === 0 ? (
          <div className="border-4 border-dashed border-zinc-800 rounded-lg p-6 text-center opacity-50">
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-600">
              No saved games. Start + NEW GAME.
            </p>
            <p className="mt-3 font-mono text-[9px] normal-case tracking-normal text-zinc-600">
              Saves live under your account in Firestore
              (users/&lt;your-uid&gt;/games). If you had saves before, confirm
              you&apos;re signed into the same account.
            </p>
          </div>
        ) : (
          games.map((game, index) => {
            const roomMeta = roomsById.get(game.roomId);
            const levelLabel = formatLevelReached(game.roomId, roomMeta?.title);
            const updated = new Date(game.updatedAt)
              .toISOString()
              .slice(0, 10)
              .replace(/-/g, ".");
            const colorClass =
              SLOT_COLORS[index % SLOT_COLORS.length] ?? "cartridge-red";
            const continueHref = buildContinueHref(game, roomMeta ?? null);
            const league = leagueByGameId?.get(game.id);

            return (
              <div
                key={game.id}
                className={`cartridge ${colorClass} flex items-stretch rounded-lg p-1`}
              >
                <div className="flex w-16 flex-col items-center justify-center gap-1 border-r-2 border-black/30 bg-black/20">
                  <div className="h-1 w-8 rounded bg-white/20" />
                  <div className="h-1 w-8 rounded bg-white/20" />
                  <div className="h-1 w-8 rounded bg-white/20" />
                </div>
                <div className="flex flex-grow flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-black uppercase tracking-tight text-white">
                        {formatGameLabel(game)}
                      </span>
                      <span className="rounded border border-term-green/30 bg-black/40 px-2 py-0.5 font-mono text-[10px] text-term-green">
                        ACTIVE
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-[11px] font-bold uppercase text-black/60">
                      LVL: {levelLabel} // TS: {updated}
                    </div>
                    {league && (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Link
                          href={`/leaderboard/${encodeURIComponent(league.leagueId)}`}
                          className="rounded border border-term-blue/40 bg-black/30 px-2 py-0.5 font-mono text-[9px] uppercase text-term-blue hover:bg-term-blue/10"
                        >
                          LEAGUE: {league.leagueName}
                        </Link>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Link
                      href={continueHref}
                      className="chunky-btn btn-glow-green rounded px-5 py-2 text-xs font-black"
                    >
                      CONTINUE
                    </Link>
                    <button
                      type="button"
                      disabled={deletingId === game.id}
                      onClick={() => void deleteGame(game.id)}
                      className="chunky-btn btn-recessed-red rounded px-5 py-2 text-xs font-black uppercase"
                    >
                      {deletingId === game.id ? "..." : "DEL"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {Array.from({ length: Math.min(emptySlots, 2) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="flex flex-col items-center justify-center rounded-lg border-4 border-dashed border-zinc-800 p-6 opacity-30 grayscale"
          >
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded bg-zinc-800">
              <span className="text-2xl text-zinc-600">+</span>
            </div>
            <span className="font-mono text-xs uppercase tracking-widest text-zinc-600">
              Empty Slot [{String(games.length + i + 1).padStart(2, "0")}]
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
