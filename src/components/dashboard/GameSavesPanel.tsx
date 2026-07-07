"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import { MAX_SAVED_GAMES, formatGameLabel, type GameSaveDocument } from "@/types/game";
import { formatRoomLabel } from "@/types/room";

interface GameSavesPanelProps {
  games: GameSaveDocument[];
  loading: boolean;
  roomsById: Map<string, { title?: string }>;
  defaultStartRoomId: string;
}

export function GameSavesPanel({
  games,
  loading,
  roomsById,
  defaultStartRoomId,
}: GameSavesPanelProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const atLimit = games.length >= MAX_SAVED_GAMES;

  const startNewGame = async () => {
    setCreating(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error("Sign in to start a game.");

      const token = await user.getIdToken();
      const res = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ startRoomId: defaultStartRoomId }),
      });

      const data = (await res.json()) as {
        game?: GameSaveDocument;
        error?: string;
      };
      if (!res.ok || !data.game) {
        throw new Error(data.error ?? "Could not start a new game.");
      }

      router.push(
        `/play/${encodeURIComponent(data.game.roomId)}?gameId=${encodeURIComponent(data.game.id)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start a new game.");
    } finally {
      setCreating(false);
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
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Your games
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Up to {MAX_SAVED_GAMES} saved games. Each game has its own gatekeeper
            conversations.
          </p>
        </div>
        <button
          type="button"
          disabled={creating || atLimit}
          onClick={() => void startNewGame()}
          className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {creating ? "Starting…" : "New game"}
        </button>
      </div>

      {atLimit && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
          Save limit reached — delete a game below to start a new one.
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Load
        </h3>
        {loading ? (
          <p className="mt-3 text-sm text-zinc-500">Loading saved games…</p>
        ) : games.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700">
            No saved games yet. Start a new game to begin.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {games.map((game) => {
              const roomMeta = roomsById.get(game.roomId);
              const roomLabel = roomMeta
                ? formatRoomLabel({ id: game.roomId, title: roomMeta.title })
                : game.roomId;
              const updated = new Date(game.updatedAt).toLocaleString();

              return (
                <li
                  key={game.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {formatGameLabel(game)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {roomLabel} · ({game.playerX}, {game.playerZ}) · {updated}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/play/${encodeURIComponent(game.roomId)}?gameId=${encodeURIComponent(game.id)}`}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                    >
                      Continue
                    </Link>
                    <button
                      type="button"
                      disabled={deletingId === game.id}
                      onClick={() => void deleteGame(game.id)}
                      className="rounded-lg border border-red-900/40 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      {deletingId === game.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
