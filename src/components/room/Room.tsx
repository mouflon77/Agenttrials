"use client";

import { Suspense, useMemo } from "react";
import { getTile, type TilesetRegistry } from "@/lib/tileset-collections";
import {
  GRID_SIZE,
  WALL_HEIGHT,
  WALL_SIDES,
  floorIndex,
  getOverlayFootprint,
  getWallOverlayTransform,
  getWallTransform,
  listWallOverlayPlacements,
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
  onWallErase?: (side: WallSide, along: number, height: number) => void;
  wallEraserActive?: boolean;
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
  playerDisplayName?: string | null;
  playerFacingRow?: number;
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
  playerSpawn?: { x: number; z: number } | null;
  spawnGhostPosition?: { x: number; z: number } | null;
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
    width: entry.width ?? 1,
    depth: entry.depth ?? 1,
  };
}

function isWallCellHighlighted(
  brushPreview: RoomProps["brushPreview"],
  category: "wall" | "door" | "window",
  tilesets: TilesetRegistry,
  side: WallSide,
  along: number,
  height: number,
): boolean {
  if (brushPreview?.category !== category) return false;
  const cell = brushPreview.wallCell;
  if (!cell || cell.side !== side) return false;
  if (category === "wall") {
    return cell.along === along && cell.height === height;
  }
  const hoverSpan = getOverlayFootprint(
    getTile(tilesets, category, brushPreview.tileId),
  );
  return (
    along >= cell.along &&
    along < cell.along + hoverSpan.along &&
    height >= cell.height &&
    height < cell.height + hoverSpan.height
  );
}

function isOverlayPlacementHighlighted(
  brushPreview: RoomProps["brushPreview"],
  kind: "door" | "window",
  tilesets: TilesetRegistry,
  side: WallSide,
  along: number,
  height: number,
  alongSpan: number,
  heightSpan: number,
): boolean {
  if (brushPreview?.category !== kind) return false;
  const cell = brushPreview.wallCell;
  if (!cell || cell.side !== side) return false;
  const hoverSpan = getOverlayFootprint(
    getTile(tilesets, kind, brushPreview.tileId),
  );
  return !(
    cell.along + hoverSpan.along <= along ||
    along + alongSpan <= cell.along ||
    cell.height + hoverSpan.height <= height ||
    height + heightSpan <= cell.height
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
  onWallErase,
  wallEraserActive = false,
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
  playerDisplayName = null,
  playerFacingRow = 2,
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
  playerSpawn = null,
  spawnGhostPosition = null,
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
    const doorFootprint = (tileId: string) =>
      getOverlayFootprint(getTile(tilesets, "door", tileId));
    const windowFootprint = (tileId: string) =>
      getOverlayFootprint(getTile(tilesets, "window", tileId));

    const doors = listWallOverlayPlacements(room.doorGrid, doorFootprint).map(
      (placement) => ({ ...placement, kind: "door" as const }),
    );
    const windows = listWallOverlayPlacements(
      room.windowGrid,
      windowFootprint,
    ).map((placement) => ({ ...placement, kind: "window" as const }));

    return [...doors, ...windows];
  }, [room.doorGrid, room.windowGrid, tilesets]);

  const wallClickHandler =
    editorMode === "wall" || editorMode === "door" || editorMode === "window"
      ? onWallClick
      : undefined;

  const wallEraseHandler =
    editorMode === "door" || editorMode === "window" ? onWallErase : undefined;

  const brushResolved =
    brushPreview && !wallEraserActive
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
          const highlighted = isWallCellHighlighted(
            brushPreview,
            "wall",
            tilesets,
            side,
            along,
            height,
          );
          const wallCellHandlers = {
            onPaint: () => wallClickHandler?.(side, along, height),
            onErase: () => wallEraseHandler?.(side, along, height),
          };

          return (
            <Tile
              key={`wall-${key}`}
              textureUrl={resolved?.textureUrl}
              pixelWidth={resolved?.pixelWidth}
              pixelHeight={resolved?.pixelHeight}
              planeWidth={1}
              planeHeight={1}
              highlighted={highlighted}
              highlightEraser={wallEraserActive && highlighted}
              previewTextureUrl={brushResolved?.textureUrl}
              color={room.wallColor}
              position={position}
              rotation={rotation}
              onPaint={wallCellHandlers.onPaint}
              onErase={wallCellHandlers.onErase}
              onPointerOver={() => onWallHover?.(side, along, height)}
              onPointerOut={() => onWallHoverEnd?.()}
            />
          );
        })}

        {overlayTiles.map(
          ({
            side,
            along,
            height,
            key,
            tileId,
            kind,
            alongSpan,
            heightSpan,
          }) => {
          const resolved = resolveTile(tilesets, kind, tileId);
          const { position, rotation } = getWallOverlayTransform(
            side,
            along,
            height,
            alongSpan,
            heightSpan,
          );
          const inset: [number, number, number] = [...position];
          if (side === "back") inset[2] -= 0.02;
          if (side === "front") inset[2] += 0.02;
          if (side === "left") inset[0] += 0.02;
          if (side === "right") inset[0] -= 0.02;

          const highlighted = isOverlayPlacementHighlighted(
            brushPreview,
            kind,
            tilesets,
            side,
            along,
            height,
            alongSpan,
            heightSpan,
          );
          const overlayPickable =
            (kind === "door" && editorMode === "door") ||
            (kind === "window" && editorMode === "window");

          return (
            <Tile
              key={`${kind}-${key}`}
              textureUrl={resolved?.textureUrl}
              pixelWidth={resolved?.pixelWidth}
              pixelHeight={resolved?.pixelHeight}
              planeWidth={alongSpan}
              planeHeight={heightSpan}
              highlighted={highlighted}
              highlightEraser={wallEraserActive && highlighted}
              previewTextureUrl={brushResolved?.textureUrl}
              color="#ffffff"
              position={inset}
              rotation={rotation}
              pickable={overlayPickable}
              onPaint={() => wallClickHandler?.(side, along, height)}
              onErase={() => wallEraseHandler?.(side, along, height)}
            />
          );
        },
        )}

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
            displayName={playerDisplayName}
            facingRow={playerFacingRow}
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

        {!playMode && playerSpawn && (
          <group position={[playerSpawn.x + 0.5, 0, playerSpawn.z + 0.5]}>
            <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.18, 0.32, 24]} />
              <meshStandardMaterial
                color="#38bdf8"
                transparent
                opacity={editorMode === "spawn" ? 0.95 : 0.65}
              />
            </mesh>
            <mesh position={[0, 0.22, 0]}>
              <coneGeometry args={[0.12, 0.28, 4]} />
              <meshStandardMaterial color="#38bdf8" />
            </mesh>
          </group>
        )}

        {editorMode === "spawn" && spawnGhostPosition && (
          <group position={[spawnGhostPosition.x + 0.5, 0, spawnGhostPosition.z + 0.5]}>
            <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.18, 0.32, 24]} />
              <meshStandardMaterial color="#4ade80" transparent opacity={0.75} />
            </mesh>
            <mesh position={[0, 0.22, 0]}>
              <coneGeometry args={[0.12, 0.28, 4]} />
              <meshStandardMaterial color="#4ade80" transparent opacity={0.75} />
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
