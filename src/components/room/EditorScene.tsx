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
  selectedNpcId: string | null;
  selectedPortalId: string | null;
  furnitureRotation: number;
  ghostPosition: { x: number; z: number } | null;
  ghostValid: boolean;
  npcGhostPosition: { x: number; z: number } | null;
  portalGhostPosition: { x: number; z: number } | null;
  portalGhostValid: boolean;
  brushPreview: {
    category: "floor" | "wall" | "door" | "window";
    tileId: string;
    floorCell?: { x: number; z: number };
    wallCell?: { side: WallSide; along: number; height: number };
  } | null;
  onFloorClick: (x: number, z: number) => void;
  onWallClick: (side: WallSide, along: number, height: number) => void;
  onWallErase: (side: WallSide, along: number, height: number) => void;
  wallEraserActive: boolean;
  onFloorHover: (x: number, z: number) => void;
  onFloorHoverEnd: () => void;
  onWallHover: (side: WallSide, along: number, height: number) => void;
  onWallHoverEnd: () => void;
  onFurnitureSelect: (id: string) => void;
  onNpcSelect: (id: string) => void;
  onPortalSelect: (id: string) => void;
}

export function EditorScene({
  room,
  tilesets,
  mode,
  selectedTileId,
  selectedFurnitureType,
  selectedFurnitureId,
  selectedNpcId,
  selectedPortalId,
  furnitureRotation,
  ghostPosition,
  ghostValid,
  npcGhostPosition,
  portalGhostPosition,
  portalGhostValid,
  brushPreview,
  onFloorClick,
  onWallClick,
  onWallErase,
  wallEraserActive,
  onFloorHover,
  onFloorHoverEnd,
  onWallHover,
  onWallHoverEnd,
  onFurnitureSelect,
  onNpcSelect,
  onPortalSelect,
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
        selectedNpcId={selectedNpcId}
        selectedPortalId={selectedPortalId}
        furnitureRotation={furnitureRotation}
        ghostPosition={ghostPosition}
        ghostValid={ghostValid}
        npcGhostPosition={npcGhostPosition}
        portalGhostPosition={portalGhostPosition}
        portalGhostValid={portalGhostValid}
        brushPreview={brushPreview}
        onFloorClick={onFloorClick}
        onWallClick={onWallClick}
        onWallErase={onWallErase}
        wallEraserActive={wallEraserActive}
        onFloorHover={onFloorHover}
        onFloorHoverEnd={onFloorHoverEnd}
        onWallHover={onWallHover}
        onWallHoverEnd={onWallHoverEnd}
        onFurnitureSelect={onFurnitureSelect}
        onNpcSelect={onNpcSelect}
        onPortalSelect={onPortalSelect}
      />
    </RoomCanvas>
  );
}
