"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { use, useEffect } from "react";
import { useRoom } from "@/hooks/useRoom";
import { useTileset } from "@/hooks/useTileset";
import { ensureRoom } from "@/lib/firestore/rooms";

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

export default function PlayPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const { room, loading, error } = useRoom(roomId);
  const { tilesets, loading: tilesetLoading } = useTileset();

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
          <Link
            href="/admin/editor"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Open editor
          </Link>
        </header>

        <div className="relative flex-1">
          {(loading || tilesetLoading) && <SceneLoader />}
          {error && (
            <p className="absolute inset-0 flex items-center justify-center text-red-400">
              {error}
            </p>
          )}
          {room && !tilesetLoading && (
            <PlayScene room={room} tilesets={tilesets} />
          )}
        </div>
      </div>
  );
}
