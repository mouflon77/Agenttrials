"use client";

import { useMemo } from "react";
import { getTile, type TilesetRegistry } from "@/lib/tileset-collections";
import { Tile } from "@/components/room/Tile";
import { DEFAULT_FURNITURE_COLOR, type FurnitureItem } from "@/types/room";

const FURNITURE_FLOOR_Y = 0.015;
const FURNITURE_LIFT = 0.002;
const FURNITURE_BOX_HEIGHT = 0.3;

interface FurnitureProps {
  item: FurnitureItem;
  tilesets: TilesetRegistry;
  pickable?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export function FurnitureMesh({
  item,
  tilesets,
  pickable = true,
  selected = false,
  onSelect,
}: FurnitureProps) {
  const def = getTile(tilesets, "furniture", item.type);
  const width = def?.width ?? 1;
  const depth = def?.depth ?? 1;
  const textureUrl = def?.textureUrl || undefined;
  const color = item.color ?? DEFAULT_FURNITURE_COLOR;

  const rotationY = useMemo(() => (item.rotation * Math.PI) / 180, [item.rotation]);

  const centerX = item.x + width / 2;
  const centerZ = item.z + depth / 2;

  const handleSelect = () => onSelect?.(item.id);

  return (
    <group position={[centerX, FURNITURE_FLOOR_Y, centerZ]} rotation={[0, rotationY, 0]}>
      {textureUrl && (
        <Tile
          textureUrl={textureUrl}
          color="#ffffff"
          pixelWidth={def?.pixelWidth ?? 64}
          pixelHeight={def?.pixelHeight ?? 64}
          planeWidth={width}
          planeHeight={depth}
          position={[0, FURNITURE_LIFT, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          pickable={pickable}
          onPaint={handleSelect}
        />
      )}
      <mesh
        position={[0, FURNITURE_BOX_HEIGHT / 2, 0]}
        raycast={pickable ? undefined : () => null}
        onPointerDown={(event) => {
          if (!pickable || event.button !== 0) return;
          event.stopPropagation();
          handleSelect();
        }}
      >
        <boxGeometry args={[width * 0.92, FURNITURE_BOX_HEIGHT, depth * 0.92]} />
        <meshStandardMaterial
          color={color}
          transparent={Boolean(textureUrl)}
          opacity={textureUrl ? 0.35 : 1}
          emissive={selected ? "#4488ff" : "#000000"}
          emissiveIntensity={selected ? 0.45 : 0}
          flatShading
        />
      </mesh>
      {selected && (
        <mesh position={[0, FURNITURE_LIFT + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width * 1.04, depth * 1.04]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.35} />
        </mesh>
      )}
    </group>
  );
}

interface FurnitureGhostProps {
  x: number;
  z: number;
  type: string;
  rotation: number;
  tilesets: TilesetRegistry;
  valid: boolean;
  color?: string;
}

export function FurnitureGhost({
  x,
  z,
  type,
  rotation,
  tilesets,
  valid,
  color = DEFAULT_FURNITURE_COLOR,
}: FurnitureGhostProps) {
  const def = getTile(tilesets, "furniture", type);
  const width = def?.width ?? 1;
  const depth = def?.depth ?? 1;
  const textureUrl = def?.textureUrl || undefined;
  const rotationY = (rotation * Math.PI) / 180;
  const centerX = x + width / 2;
  const centerZ = z + depth / 2;
  const tint = valid ? "#4ade80" : "#f87171";

  return (
    <group position={[centerX, FURNITURE_FLOOR_Y, centerZ]} rotation={[0, rotationY, 0]}>
      {textureUrl && (
        <Tile
          textureUrl={textureUrl}
          color="#ffffff"
          pixelWidth={def?.pixelWidth ?? 64}
          pixelHeight={def?.pixelHeight ?? 64}
          planeWidth={width}
          planeHeight={depth}
          position={[0, FURNITURE_LIFT, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          pickable={false}
          opacity={0.55}
        />
      )}
      <mesh position={[0, FURNITURE_BOX_HEIGHT / 2, 0]} raycast={() => null}>
        <boxGeometry args={[width * 0.92, FURNITURE_BOX_HEIGHT, depth * 0.92]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={textureUrl ? 0.25 : 0.45}
        />
      </mesh>
      <mesh position={[0, FURNITURE_LIFT + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 1.02, depth * 1.02]} />
        <meshBasicMaterial color={tint} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

export function getFootprintCells(
  x: number,
  z: number,
  width: number,
  depth: number,
  rotation: number,
): Array<{ x: number; z: number }> {
  const w = rotation % 180 === 0 ? width : depth;
  const d = rotation % 180 === 0 ? depth : width;
  const cells: Array<{ x: number; z: number }> = [];
  for (let dx = 0; dx < w; dx++) {
    for (let dz = 0; dz < d; dz++) {
      cells.push({ x: x + dx, z: z + dz });
    }
  }
  return cells;
}

export function isFootprintValid(
  x: number,
  z: number,
  width: number,
  depth: number,
  rotation: number,
  gridSize: number,
  occupied: Set<string>,
): boolean {
  const cells = getFootprintCells(x, z, width, depth, rotation);
  return cells.every(
    (c) =>
      c.x >= 0 &&
      c.z >= 0 &&
      c.x < gridSize &&
      c.z < gridSize &&
      !occupied.has(`${c.x},${c.z}`),
  );
}
