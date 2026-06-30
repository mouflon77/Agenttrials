"use client";

import { Suspense, useMemo } from "react";
import { getTile, type TilesetRegistry } from "@/lib/tileset-collections";
import {
  GRID_SIZE,
  WALL_HEIGHT,
  WALL_SIDES,
  floorIndex,
  getWallTransform,
  wallKey,
} from "@/types/room";
import type { EditorMode, RoomDocument, WallSide } from "@/types/room";
import { Tile } from "@/components/room/Tile";
import { FurnitureGhost, FurnitureMesh } from "@/components/room/Furniture";

interface RoomProps {
  room: RoomDocument;
  tilesets: TilesetRegistry;
  editorMode?: EditorMode;
  selectedTileId?: string;
  selectedFurnitureType?: string;
  furnitureRotation?: number;
  ghostPosition?: { x: number; z: number } | null;
  ghostValid?: boolean;
  onFloorClick?: (x: number, z: number) => void;
  onWallClick?: (side: WallSide, along: number, height: number) => void;
  onFloorHover?: (x: number, z: number) => void;
  onFloorHoverEnd?: () => void;
}

function resolveTile(
  tilesets: TilesetRegistry,
  category: "floor" | "wall" | "door" | "window",
  tileId: string | undefined,
) {
  const entry = getTile(tilesets, category, tileId);
  if (!entry) return null;
  return {
    textureUrl: entry.textureUrl || undefined,
    pixelWidth: entry.pixelWidth ?? 64,
    pixelHeight: entry.pixelHeight ?? 64,
  };
}

function isActiveOverlay(tileId: string | undefined): boolean {
  return Boolean(tileId && tileId !== "none" && tileId !== "");
}

export function Room({
  room,
  tilesets,
  editorMode,
  selectedTileId,
  selectedFurnitureType,
  furnitureRotation = 0,
  ghostPosition,
  ghostValid = false,
  onFloorClick,
  onWallClick,
  onFloorHover,
  onFloorHoverEnd,
}: RoomProps) {
  const floorTiles = useMemo(() => {
    const tiles = [];
    for (let z = 0; z < GRID_SIZE; z++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const index = floorIndex(x, z);
        const tileId = room.floorGrid[index] ?? "default_floor";
        tiles.push({ x, z, index, tileId });
      }
    }
    return tiles;
  }, [room.floorGrid]);

  const wallTiles = useMemo(() => {
    const tiles: Array<{
      side: WallSide;
      along: number;
      height: number;
      key: string;
      tileId: string;
    }> = [];
    for (const side of WALL_SIDES) {
      for (let along = 0; along < GRID_SIZE; along++) {
        for (let height = 0; height < WALL_HEIGHT; height++) {
          const key = wallKey(side, along, height);
          tiles.push({
            side,
            along,
            height,
            key,
            tileId: room.wallGrid[key] ?? "default_wall",
          });
        }
      }
    }
    return tiles;
  }, [room.wallGrid]);

  const overlayTiles = useMemo(() => {
    const tiles: Array<{
      side: WallSide;
      along: number;
      height: number;
      key: string;
      tileId: string;
      kind: "door" | "window";
    }> = [];

    for (const side of WALL_SIDES) {
      for (let along = 0; along < GRID_SIZE; along++) {
        for (let height = 0; height < WALL_HEIGHT; height++) {
          const key = wallKey(side, along, height);
          const doorId = room.doorGrid[key];
          const windowId = room.windowGrid[key];
          if (isActiveOverlay(doorId)) {
            tiles.push({
              side,
              along,
              height,
              key,
              tileId: doorId,
              kind: "door",
            });
          }
          if (isActiveOverlay(windowId)) {
            tiles.push({
              side,
              along,
              height,
              key,
              tileId: windowId,
              kind: "window",
            });
          }
        }
      }
    }
    return tiles;
  }, [room.doorGrid, room.windowGrid]);

  const wallClickHandler =
    editorMode === "wall" || editorMode === "door" || editorMode === "window"
      ? onWallClick
      : undefined;

  return (
    <Suspense fallback={null}>
      <group>
        {floorTiles.map(({ x, z, index, tileId }) => {
          const resolved = resolveTile(tilesets, "floor", tileId);
          return (
            <Tile
              key={`floor-${index}`}
              textureUrl={resolved?.textureUrl}
              pixelWidth={resolved?.pixelWidth}
              pixelHeight={resolved?.pixelHeight}
              color={room.floorColor}
              position={[x + 0.5, 0.001, z + 0.5]}
              rotation={[-Math.PI / 2, 0, 0]}
              onClick={() => onFloorClick?.(x, z)}
              onPointerOver={() => onFloorHover?.(x, z)}
              onPointerOut={() => onFloorHoverEnd?.()}
            />
          );
        })}

        {wallTiles.map(({ side, along, height, key, tileId }) => {
          const resolved = resolveTile(tilesets, "wall", tileId);
          const { position, rotation } = getWallTransform(side, along, height);

          return (
            <Tile
              key={`wall-${key}`}
              textureUrl={resolved?.textureUrl}
              pixelWidth={resolved?.pixelWidth}
              pixelHeight={resolved?.pixelHeight}
              color={room.wallColor}
              position={position}
              rotation={rotation}
              onClick={() => wallClickHandler?.(side, along, height)}
            />
          );
        })}

        {overlayTiles.map(({ side, along, height, key, tileId, kind }) => {
          const resolved = resolveTile(tilesets, kind, tileId);
          const { position, rotation } = getWallTransform(side, along, height);
          const inset: [number, number, number] = [...position];
          if (side === "back") inset[2] -= 0.02;
          if (side === "front") inset[2] += 0.02;
          if (side === "left") inset[0] += 0.02;
          if (side === "right") inset[0] -= 0.02;

          return (
            <Tile
              key={`${kind}-${key}`}
              textureUrl={resolved?.textureUrl}
              pixelWidth={resolved?.pixelWidth}
              pixelHeight={resolved?.pixelHeight}
              color="#ffffff"
              position={inset}
              rotation={rotation}
              onClick={() => wallClickHandler?.(side, along, height)}
            />
          );
        })}

        {room.furniture.map((item) => (
          <FurnitureMesh key={item.id} item={item} tilesets={tilesets} />
        ))}

        {editorMode === "furniture" &&
          ghostPosition &&
          selectedFurnitureType && (
            <FurnitureGhost
              x={ghostPosition.x}
              z={ghostPosition.z}
              type={selectedFurnitureType}
              rotation={furnitureRotation}
              tilesets={tilesets}
              valid={ghostValid}
            />
          )}
      </group>
    </Suspense>
  );
}
