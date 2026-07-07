"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { use, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LandscapeGate } from "@/components/play/LandscapeGate";
import { UserProfileBar } from "@/components/UserProfileBar";
import { useAuth } from "@/contexts/AuthContext";
import { useGame } from "@/hooks/useGame";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useRoom } from "@/hooks/useRoom";
import { useTileset } from "@/hooks/useTileset";
import { ensureRoom } from "@/lib/firestore/rooms";
import { GRID_SIZE, resolvePlayerSpawn } from "@/types/room";

const PlayScene = dynamic(
  () => import("@/components/room/PlayScene").then((m) => m.PlayScene),
  { ssr: false, loading: () => <SceneLoader /> },
);

function SceneLoader() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-zinc-500">
      Loading room…
    </div>
  );
}

export default function PlayPageClient({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const gameId = searchParams.get("gameId")?.trim() ?? null;
  const { game, loading: gameLoading, error: gameError } = useGame(
    user?.uid,
    gameId,
  );
  const { room, loading, error } = useRoom(roomId);
  const { tilesets, loading: tilesetLoading } = useTileset();
  const isAdmin = useIsAdmin();

  const urlSpawn = useMemo(() => {
    const sx = Number(searchParams.get("spawnX"));
    const sz = Number(searchParams.get("spawnZ"));
    if (
      Number.isFinite(sx) &&
      Number.isFinite(sz) &&
      sx >= 0 &&
      sz >= 0 &&
      sx < GRID_SIZE &&
      sz < GRID_SIZE
    ) {
      return { x: sx, z: sz };
    }
    return null;
  }, [searchParams]);

  const initialSpawn = useMemo(() => {
    if (urlSpawn) return urlSpawn;
    if (game && game.roomId === roomId) {
      return { x: game.playerX, z: game.playerZ };
    }
    return resolvePlayerSpawn(room, null);
  }, [urlSpawn, game, roomId, room]);

  const initialUnlockedByRoom = useMemo(
    () => (game ? { ...game.unlockedPortals } : {}),
    [game],
  );

  useEffect(() => {
    if (!gameId) {
      router.replace("/dashboard");
    }
  }, [gameId, router]);

  useEffect(() => {
    if (!game || !gameId || urlSpawn) return;
    if (game.roomId !== roomId) {
      router.replace(
        `/play/${encodeURIComponent(game.roomId)}?gameId=${encodeURIComponent(gameId)}`,
      );
    }
  }, [game, gameId, roomId, urlSpawn, router]);

  useEffect(() => {
    if (!loading && !room) {
      void ensureRoom(roomId);
    }
  }, [loading, room, roomId]);

  const sceneLoading =
    loading || tilesetLoading || (gameId != null && gameLoading);

  return (
    <LandscapeGate>
      <div className="flex h-screen flex-col bg-zinc-900">
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-zinc-100">
              {game?.label ?? `Room: ${roomId}`}
            </h1>
            <p className="hidden text-xs text-zinc-500 sm:block">
              {roomId} · Isometric play view
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className="hidden rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 sm:inline-block"
            >
              Dashboard
            </Link>
            {isAdmin && (
              <Link
                href={`/admin/editor?roomId=${roomId}`}
                className="hidden rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 sm:inline-block"
              >
                Editor
              </Link>
            )}
            <UserProfileBar />
          </div>
        </header>

        <div className="relative min-h-0 flex-1">
          {sceneLoading && <SceneLoader />}
          {(error || gameError) && (
            <p className="absolute inset-0 flex items-center justify-center text-red-400">
              {error ?? gameError?.message}
            </p>
          )}
          {gameId && game && room && !tilesetLoading && !gameLoading && (
            <PlayScene
              key={`${gameId}-${roomId}-${initialSpawn.x}-${initialSpawn.z}`}
              room={room}
              tilesets={tilesets}
              roomId={roomId}
              gameId={gameId}
              initialSpawn={initialSpawn}
              initialUnlockedByRoom={initialUnlockedByRoom}
            />
          )}
          {gameId && !gameLoading && !game && (
            <p className="absolute inset-0 flex items-center justify-center text-red-400">
              Saved game not found.
            </p>
          )}
        </div>
      </div>
    </LandscapeGate>
  );
}
