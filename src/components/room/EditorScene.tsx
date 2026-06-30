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
  selectedFurnitureId: string | null;
  furnitureRotation: number;
  ghostPosition: { x: number; z: number } | null;
  ghostValid: boolean;
  brushPreview: {
    category: "floor" | "wall" | "door" | "window";
    tileId: string;
    floorCell?: { x: number; z: number };
    wallCell?: { side: WallSide; along: number; height: number };
  } | null;
  onFloorClick: (x: number, z: number) => void;
  onWallClick: (side: WallSide, along: number, height: number) => void;
  onFloorHover: (x: number, z: number) => void;
  onFloorHoverEnd: () => void;
  onWallHover: (side: WallSide, along: number, height: number) => void;
  onWallHoverEnd: () => void;
  onFurnitureSelect: (id: string) => void;
}

export function EditorScene({
  room,
  tilesets,
  mode,
  selectedTileId,
  selectedFurnitureType,
  selectedFurnitureId,
  furnitureRotation,
  ghostPosition,
  ghostValid,
  brushPreview,
  onFloorClick,
  onWallClick,
  onFloorHover,
  onFloorHoverEnd,
  onWallHover,
  onWallHoverEnd,
  onFurnitureSelect,
}: EditorSceneProps) {
  return (
    <RoomCanvas paintMode>
      <Room
        room={room}
        tilesets={tilesets}
        editorMode={mode}
        selectedTileId={selectedTileId}
        selectedFurnitureType={selectedFurnitureType}
        selectedFurnitureId={selectedFurnitureId}
        furnitureRotation={furnitureRotation}
        ghostPosition={ghostPosition}
        ghostValid={ghostValid}
        brushPreview={brushPreview}
        onFloorClick={onFloorClick}
        onWallClick={onWallClick}
        onFloorHover={onFloorHover}
        onFloorHoverEnd={onFloorHoverEnd}
        onWallHover={onWallHover}
        onWallHoverEnd={onWallHoverEnd}
        onFurnitureSelect={onFurnitureSelect}
      />
    </RoomCanvas>
  );
}
