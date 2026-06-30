"use client";

import { Room } from "@/components/room/Room";
import { RoomCanvas } from "@/components/room/RoomCanvas";
import type { TilesetRegistry } from "@/lib/tileset-collections";
import type { EditorMode, RoomDocument, WallSide } from "@/types/room";

interface EditorSceneProps {
  room: RoomDocument;
  tilesets: TilesetRegistry;
  mode: EditorMode;
  selectedTileId: string;
  selectedFurnitureType: string;
  furnitureRotation: number;
  ghostPosition: { x: number; z: number } | null;
  ghostValid: boolean;
  onFloorClick: (x: number, z: number) => void;
  onWallClick: (side: WallSide, along: number, height: number) => void;
  onFloorHover: (x: number, z: number) => void;
  onFloorHoverEnd: () => void;
}

export function EditorScene({
  room,
  tilesets,
  mode,
  selectedTileId,
  selectedFurnitureType,
  furnitureRotation,
  ghostPosition,
  ghostValid,
  onFloorClick,
  onWallClick,
  onFloorHover,
  onFloorHoverEnd,
}: EditorSceneProps) {
  return (
    <RoomCanvas>
      <Room
        room={room}
        tilesets={tilesets}
        editorMode={mode}
        selectedTileId={selectedTileId}
        selectedFurnitureType={selectedFurnitureType}
        furnitureRotation={furnitureRotation}
        ghostPosition={ghostPosition}
        ghostValid={ghostValid}
        onFloorClick={onFloorClick}
        onWallClick={onWallClick}
        onFloorHover={onFloorHover}
        onFloorHoverEnd={onFloorHoverEnd}
      />
    </RoomCanvas>
  );
}
