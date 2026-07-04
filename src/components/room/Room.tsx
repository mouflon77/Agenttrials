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
import type { AvatarConfig } from "@/types/avatar";
import type { WorldPosition } from "@/lib/movement";
import type { EditorMode, NpcItem, PlayerPosition, PortalItem, RoomDocument, WallSide } from "@/types/room";
import { DEFAULT_GATEKEEPER_STATS } from "@/types/room";
import { Tile } from "@/components/room/Tile";
import { FloorLayer, getUniformFloor } from "@/components/room/FloorLayer";
import { FurnitureGhost, FurnitureMesh } from "@/components/room/Furniture";
import { StandeeMesh } from "@/components/room/Standee";
import { PortalMesh } from "@/components/room/Portal";
import { PlayerAvatar } from "@/components/room/PlayerAvatar";

interface RoomProps {
  room: RoomDocument;
  tilesets: TilesetRegistry;
  editorMode?: EditorMode;
  selectedTileId?: string;
  selectedFurnitureType?: string;
  selectedFurnitureId?: string | null;
  furnitureRotation?: number;
  ghostPosition?: { x: number; z: number } | null;
  ghostValid?: boolean;
  brushPreview?: {
    category: "floor" | "wall" | "door" | "window";
    tileId: string;
    floorCell?: { x: number; z: number };
    wallCell?: { side: WallSide; along: number; height: number };
  } | null;
  onFloorClick?: (x: number, z: number) => void;
  onWallClick?: (side: WallSide, along: number, height: number) => void;
  onFloorHover?: (x: number, z: number) => void;
  onFloorHoverEnd?: () => void;
  onWallHover?: (side: WallSide, along: number, height: number) => void;
  onWallHoverEnd?: () => void;
  onFurnitureSelect?: (id: string) => void;
  playMode?: boolean;
  playerGridPosition?: PlayerPosition | null;
  playerVisualPosition?: WorldPosition | null;
  playerAvatarConfig?: AvatarConfig | null;
  playerPhotoURL?: string | null;
  playerHeadgearTextureUrl?: string;
  playerDisplayName?: string | null;
  unlockedPortalIds?: Set<string>;
  onPortalEnter?: (portalId: string) => void;
  onFloorStep?: (x: number, z: number) => void;
  selectedNpcId?: string | null;
  onNpcSelect?: (id: string) => void;
  selectedPortalId?: string | null;
  onPortalSelect?: (id: string) => void;
  npcGhostPosition?: { x: number; z: number } | null;
  portalGhostPosition?: { x: number; z: number } | null;
  portalGhostValid?: boolean;
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

function isWallHighlighted(
  brushPreview: RoomProps["brushPreview"],
  category: "wall" | "door" | "window",
  side: WallSide,
  along: number,
  height: number,
): boolean {
  return (
    brushPreview?.category === category &&
    brushPreview.wallCell?.side === side &&
    brushPreview.wallCell?.along === along &&
    brushPreview.wallCell?.height === height
  );
}

export function Room({
  room,
  tilesets,
  editorMode,
  selectedTileId,
  selectedFurnitureType,
  selectedFurnitureId = null,
  furnitureRotation = 0,
  ghostPosition,
  ghostValid = false,
  brushPreview,
  onFloorClick,
  onWallClick,
  onFloorHover,
  onFloorHoverEnd,
  onWallHover,
  onWallHoverEnd,
  onFurnitureSelect,
  playMode = false,
  playerGridPosition = null,
  playerVisualPosition = null,
  playerAvatarConfig = null,
  playerPhotoURL = null,
  playerHeadgearTextureUrl,
  playerDisplayName = null,
  unlockedPortalIds,
  onPortalEnter,
  onFloorStep,
  selectedNpcId = null,
  onNpcSelect,
  selectedPortalId = null,
  onPortalSelect,
  npcGhostPosition = null,
  portalGhostPosition = null,
  portalGhostValid = false,
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

  const brushResolved = brushPreview
    ? resolveTile(tilesets, brushPreview.category, brushPreview.tileId)
    : null;

  const floorCellTextures = useMemo(() => {
    const map = new Map<
      string,
      { textureUrl?: string; pixelWidth: number; pixelHeight: number }
    >();
    for (const { tileId } of floorTiles) {
      if (map.has(tileId)) continue;
      const resolved = resolveTile(tilesets, "floor", tileId);
      map.set(tileId, {
        textureUrl: resolved?.textureUrl,
        pixelWidth: resolved?.pixelWidth ?? 64,
        pixelHeight: resolved?.pixelHeight ?? 64,
      });
    }
    return map;
  }, [floorTiles, tilesets]);

  const uniformFloor = useMemo(() => {
    const textureMap = new Map(
      [...floorCellTextures.entries()].map(([id, value]) => [
        id,
        { textureUrl: value.textureUrl, color: room.floorColor },
      ]),
    );
    return getUniformFloor(floorTiles, textureMap, room.floorColor);
  }, [floorTiles, floorCellTextures, room.floorColor]);

  const floorInteractive = Boolean(onFloorClick) || Boolean(playMode && onFloorStep);
  const floorPaintHandler = onFloorClick
    ? onFloorClick
    : playMode && onFloorStep
      ? onFloorStep
      : undefined;
  const highlightedFloorCell =
    brushPreview?.category === "floor" ? brushPreview.floorCell : null;

  const furniturePickable = editorMode === "furniture";
  const npcPickable = editorMode === "npc";
  const portalPickable = editorMode === "portal";

  return (
    <Suspense fallback={null}>
      <group>
        <FloorLayer
          cells={floorTiles}
          floorColor={room.floorColor}
          uniform={uniformFloor}
          cellTextures={floorCellTextures}
          interactive={floorInteractive}
          highlightedCell={highlightedFloorCell}
          highlightTextureUrl={brushResolved?.textureUrl}
          onPaint={floorPaintHandler}
          onPointerOver={onFloorHover}
          onPointerOut={onFloorHoverEnd}
        />

        {wallTiles.map(({ side, along, height, key, tileId }) => {
          const resolved = resolveTile(tilesets, "wall", tileId);
          const { position, rotation } = getWallTransform(side, along, height);
          const highlighted = isWallHighlighted(
            brushPreview,
            "wall",
            side,
            along,
            height,
          );

          return (
            <Tile
              key={`wall-${key}`}
              textureUrl={resolved?.textureUrl}
              pixelWidth={resolved?.pixelWidth}
              pixelHeight={resolved?.pixelHeight}
              planeWidth={1}
              planeHeight={1}
              highlighted={highlighted}
              previewTextureUrl={brushResolved?.textureUrl}
              color={room.wallColor}
              position={position}
              rotation={rotation}
              onPaint={() => wallClickHandler?.(side, along, height)}
              onPointerOver={() => onWallHover?.(side, along, height)}
              onPointerOut={() => onWallHoverEnd?.()}
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

          const highlighted = isWallHighlighted(
            brushPreview,
            kind,
            side,
            along,
            height,
          );

          return (
            <Tile
              key={`${kind}-${key}`}
              textureUrl={resolved?.textureUrl}
              pixelWidth={resolved?.pixelWidth}
              pixelHeight={resolved?.pixelHeight}
              planeWidth={1}
              planeHeight={1}
              highlighted={highlighted}
              previewTextureUrl={brushResolved?.textureUrl}
              color="#ffffff"
              position={inset}
              rotation={rotation}
              pickable={false}
            />
          );
        })}

        {room.furniture.map((item) => (
          <FurnitureMesh
            key={item.id}
            item={item}
            tilesets={tilesets}
            pickable={furniturePickable}
            selected={furniturePickable && selectedFurnitureId === item.id}
            onSelect={onFurnitureSelect}
          />
        ))}

        {room.npcs.map((npc) => (
          <StandeeMesh
            key={npc.id}
            npc={npc}
            tilesets={tilesets}
            pickable={npcPickable}
            selected={npcPickable && selectedNpcId === npc.id}
            onSelect={onNpcSelect}
            showLabel={playMode}
          />
        ))}

        {room.portals.map((portal) => (
          <PortalMesh
            key={portal.id}
            portal={portal}
            unlocked={unlockedPortalIds?.has(portal.id) ?? false}
            pickable={portalPickable}
            selected={portalPickable && selectedPortalId === portal.id}
            onSelect={onPortalSelect}
            playerOnTile={
              playerGridPosition?.x === portal.x &&
              playerGridPosition?.z === portal.z
            }
            onEnter={onPortalEnter}
          />
        ))}

        {playMode && playerVisualPosition && playerAvatarConfig && (
          <PlayerAvatar
            visualPosition={playerVisualPosition}
            avatarConfig={playerAvatarConfig}
            photoURL={playerPhotoURL}
            headgearTextureUrl={playerHeadgearTextureUrl}
            displayName={playerDisplayName}
          />
        )}

        {editorMode === "npc" && npcGhostPosition && (
          <StandeeMesh
            npc={{
              id: "ghost",
              standeeType: selectedTileId ?? "default_standee",
              x: npcGhostPosition.x,
              z: npcGhostPosition.z,
              name: "NPC",
              prompt: "",
              stats: DEFAULT_GATEKEEPER_STATS,
            }}
            tilesets={tilesets}
          />
        )}

        {editorMode === "portal" && portalGhostPosition && (
          <group position={[portalGhostPosition.x + 0.5, 0, portalGhostPosition.z + 0.5]}>
            <mesh position={[0, 0.55, 0]}>
              <cylinderGeometry args={[0.42, 0.42, 0.12, 6]} />
              <meshStandardMaterial
                color={portalGhostValid ? "#4ade80" : "#f87171"}
                transparent
                opacity={0.55}
              />
            </mesh>
          </group>
        )}

        {editorMode === "furniture" && ghostPosition && (
          <FurnitureGhost
            x={ghostPosition.x}
            z={ghostPosition.z}
            type={
              selectedFurnitureId
                ? (room.furniture.find((f) => f.id === selectedFurnitureId)
                    ?.type ?? selectedFurnitureType ?? "sofa_2x1")
                : (selectedFurnitureType ?? "sofa_2x1")
            }
            rotation={
              selectedFurnitureId
                ? (room.furniture.find((f) => f.id === selectedFurnitureId)
                    ?.rotation ?? furnitureRotation)
                : furnitureRotation
            }
            color={
              selectedFurnitureId
                ? room.furniture.find((f) => f.id === selectedFurnitureId)?.color
                : undefined
            }
            tilesets={tilesets}
            valid={ghostValid}
          />
        )}
      </group>
    </Suspense>
  );
}
