"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { use, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LandscapeGate } from "@/components/play/LandscapeGate";
import { UserProfileBar } from "@/components/UserProfileBar";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuth } from "@/lib/firebase";
import { useGame } from "@/hooks/useGame";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useRoom } from "@/hooks/useRoom";
import { useTileset } from "@/hooks/useTileset";
import { ensureRoom } from "@/lib/firestore/rooms";
import { applyGamePuzzleToNpc } from "@/lib/game-npc";
import { GRID_SIZE, resolvePlaySpawn, type RoomDocument } from "@/types/room";

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

  const initialSpawn = useMemo(
    () => resolvePlaySpawn(room, game, roomId, urlSpawn),
    [urlSpawn, game, roomId, room],
  );

  const initialUnlockedByRoom = useMemo(
    () => (game ? { ...game.unlockedPortals } : {}),
    [game],
  );

  const playRoom = useMemo((): RoomDocument | null => {
    if (!room) return null;
    if (!game) return room;
    return {
      ...room,
      npcs: room.npcs.map((npc) => applyGamePuzzleToNpc(npc, game, roomId)),
    };
  }, [room, game, roomId]);

  useEffect(() => {
    if (!gameId || !roomId || !user) return;
    const ensurePuzzles = async () => {
      const currentUser = getFirebaseAuth().currentUser;
      if (!currentUser) return;
      const token = await currentUser.getIdToken();
      await fetch(`/api/games/${encodeURIComponent(gameId)}/ensure-puzzles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roomId }),
      }).catch(() => undefined);
    };
    void ensurePuzzles();
  }, [gameId, roomId, user]);

  useEffect(() => {
    if (!gameId) {
      router.replace("/dashboard");
    }
  }, [gameId, router]);

  useEffect(() => {
    if (!game || !gameId || urlSpawn) return;
    if (game.roomId !== roomId) {
      const spawn = resolvePlaySpawn(room, game, game.roomId, null);
      const params = new URLSearchParams({
        gameId,
        spawnX: String(spawn.x),
        spawnZ: String(spawn.z),
      });
      router.replace(
        `/play/${encodeURIComponent(game.roomId)}?${params.toString()}`,
      );
    }
  }, [game, gameId, roomId, urlSpawn, room, router]);

  useEffect(() => {
    if (!loading && !room) {
      void ensureRoom(roomId);
    }
  }, [loading, room, roomId]);

  const sceneLoading =
    loading || tilesetLoading || (gameId != null && gameLoading);

  return (
    <LandscapeGate>
      <div className="scanlines flex h-screen flex-col bg-term-bg">
        <header className="terminal-bezel mx-1 mt-1 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-1.5 sm:mx-4 sm:mt-3 sm:px-4 sm:py-3">
          <div className="min-w-0">
            <h1 className="truncate font-mono text-xs font-bold uppercase text-term-blue sm:text-sm">
              {game?.label ?? `ROOM: ${roomId}`}
            </h1>
            <p className="hidden font-mono text-[10px] text-zinc-500 sm:block">
              {roomId} // ISO_VIEW
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/dashboard"
              className="chunky-btn rounded px-2 py-1 text-[9px] text-white sm:px-3 sm:py-1.5 sm:text-[10px]"
            >
              Exit
            </Link>
            {isAdmin && (
              <Link
                href={`/admin/editor?roomId=${roomId}`}
                className="chunky-btn capacitor-btn hidden rounded px-3 py-1.5 text-[10px] text-white sm:inline-block"
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
          {gameId && game && playRoom && !tilesetLoading && !gameLoading && (
            <PlayScene
              key={`${gameId}-${roomId}-${initialSpawn.x}-${initialSpawn.z}`}
              room={playRoom}
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
