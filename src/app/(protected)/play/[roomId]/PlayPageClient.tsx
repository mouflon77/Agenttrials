"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { use, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { UserProfileBar } from "@/components/UserProfileBar";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useRoom } from "@/hooks/useRoom";
import { useTileset } from "@/hooks/useTileset";
import { ensureRoom } from "@/lib/firestore/rooms";
import { GRID_SIZE } from "@/types/room";

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
  const { room, loading, error } = useRoom(roomId);
  const { tilesets, loading: tilesetLoading } = useTileset();
  const isAdmin = useIsAdmin();

  const initialSpawn = useMemo(() => {
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
    return { x: 6, z: 6 };
  }, [searchParams]);

  useEffect(() => {
    if (!loading && !room) {
      void ensureRoom(roomId);
    }
  }, [loading, room, roomId]);

  return (
    <div className="flex h-screen flex-col bg-zinc-900">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <h1 className="text-sm font-semibold text-zinc-100">
            Room: {roomId}
          </h1>
          <p className="text-xs text-zinc-500">Axonometric play view</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              href={`/admin/editor?roomId=${roomId}`}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              Open editor
            </Link>
          )}
          <UserProfileBar />
        </div>
      </header>

      <div className="relative flex-1">
        {(loading || tilesetLoading) && <SceneLoader />}
        {error && (
          <p className="absolute inset-0 flex items-center justify-center text-red-400">
            {error}
          </p>
        )}
        {room && !tilesetLoading && (
          <PlayScene
            key={`${roomId}-${initialSpawn.x}-${initialSpawn.z}`}
            room={room}
            tilesets={tilesets}
            roomId={roomId}
            initialSpawn={initialSpawn}
          />
        )}
      </div>
    </div>
  );
}
