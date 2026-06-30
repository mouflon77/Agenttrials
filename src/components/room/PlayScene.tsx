"use client";

import { Room } from "@/components/room/Room";
import { RoomCanvas } from "@/components/room/RoomCanvas";
import type { TilesetRegistry } from "@/lib/tileset-collections";
import type { RoomDocument } from "@/types/room";

interface PlaySceneProps {
  room: RoomDocument;
  tilesets: TilesetRegistry;
}

export function PlayScene({ room, tilesets }: PlaySceneProps) {
  return (
    <RoomCanvas>
      <Room room={room} tilesets={tilesets} />
    </RoomCanvas>
  );
}
