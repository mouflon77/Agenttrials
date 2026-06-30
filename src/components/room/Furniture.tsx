"use client";

import { useMemo } from "react";
import { getTile, type TilesetRegistry } from "@/lib/tileset-collections";
import { Tile } from "@/components/room/Tile";
import type { FurnitureItem } from "@/types/room";

interface FurnitureProps {
  item: FurnitureItem;
  tilesets: TilesetRegistry;
}

export function FurnitureMesh({ item, tilesets }: FurnitureProps) {
  const def = getTile(tilesets, "furniture", item.type);
  const width = def?.width ?? 1;
  const depth = def?.depth ?? 1;
  const textureUrl = def?.textureUrl || undefined;

  const rotationY = useMemo(() => (item.rotation * Math.PI) / 180, [item.rotation]);

  const centerX = item.x + width / 2;
  const centerZ = item.z + depth / 2;

  return (
    <group position={[centerX, 0.02, centerZ]} rotation={[0, rotationY, 0]}>
      <Tile
        textureUrl={textureUrl}
        color="#ffffff"
        pixelWidth={def?.pixelWidth ?? 64}
        pixelHeight={def?.pixelHeight ?? 64}
        position={[0, 0.5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <mesh position={[0, width * 0.35, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[width * 0.9, 0.7, depth * 0.9]} />
        <meshStandardMaterial color="#6b5b4f" transparent opacity={textureUrl ? 0 : 1} />
      </mesh>
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
}

export function FurnitureGhost({
  x,
  z,
  type,
  rotation,
  tilesets,
  valid,
}: FurnitureGhostProps) {
  const def = getTile(tilesets, "furniture", type);
  const width = def?.width ?? 1;
  const depth = def?.depth ?? 1;
  const rotationY = (rotation * Math.PI) / 180;
  const centerX = x + width / 2;
  const centerZ = z + depth / 2;
  const color = valid ? "#4ade80" : "#f87171";

  return (
    <group position={[centerX, 0.03, centerZ]} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[width * 0.95, 0.3, depth * 0.95]} />
        <meshStandardMaterial color={color} transparent opacity={0.45} />
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
