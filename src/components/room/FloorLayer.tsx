"use client";

import { useEffect, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { Tile } from "@/components/room/Tile";
import {
  applyGridRepeat,
  getCachedPixelTexture,
  loadPixelTexture,
} from "@/lib/tile-textures";
import { GRID_SIZE } from "@/types/room";

const FLOOR_Y = 0.015;

export interface FloorCell {
  x: number;
  z: number;
  index: string;
  tileId: string;
}

export interface UniformFloor {
  tileId: string;
  textureUrl?: string;
  color: string;
}

interface FloorLayerProps {
  cells: FloorCell[];
  floorColor: string;
  uniform: UniformFloor | null;
  cellTextures: Map<
    string,
    { textureUrl?: string; pixelWidth: number; pixelHeight: number }
  >;
  interactive: boolean;
  highlightedCell?: { x: number; z: number } | null;
  highlightTextureUrl?: string;
  onPaint?: (x: number, z: number) => void;
  onPointerOver?: (x: number, z: number) => void;
  onPointerOut?: () => void;
}

function stopEvent(event: ThreeEvent<PointerEvent>) {
  event.stopPropagation();
}

function UnifiedTexturedFloor({ textureUrl }: { textureUrl: string }) {
  const [texture, setTexture] = useState(() => getCachedPixelTexture(textureUrl) ?? null);

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedPixelTexture(textureUrl);
    if (cached) {
      applyGridRepeat(cached, GRID_SIZE, GRID_SIZE);
      setTexture(cached);
      return;
    }

    void loadPixelTexture(textureUrl).then((loaded) => {
      if (cancelled) return;
      applyGridRepeat(loaded, GRID_SIZE, GRID_SIZE);
      setTexture(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, [textureUrl]);

  if (!texture) return null;

  return (
    <mesh
      position={[GRID_SIZE / 2, FLOOR_Y, GRID_SIZE / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
      <meshBasicMaterial map={texture} color="#ffffff" />
    </mesh>
  );
}

function UnifiedColoredFloor({ color }: { color: string }) {
  return (
    <mesh
      position={[GRID_SIZE / 2, FLOOR_Y, GRID_SIZE / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function FloorPickGrid({
  cells,
  onPaint,
  onPointerOver,
  onPointerOut,
}: {
  cells: FloorCell[];
  onPaint?: (x: number, z: number) => void;
  onPointerOver?: (x: number, z: number) => void;
  onPointerOut?: () => void;
}) {
  return (
    <>
      {cells.map(({ x, z }) => (
        <mesh
          key={`pick-${x}-${z}`}
          position={[x + 0.5, FLOOR_Y + 0.01, z + 0.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            stopEvent(event);
            onPaint?.(x, z);
          }}
          onPointerOver={(event) => {
            stopEvent(event);
            onPointerOver?.(x, z);
          }}
          onPointerOut={(event) => {
            stopEvent(event);
            onPointerOut?.();
          }}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

export function FloorLayer({
  cells,
  floorColor,
  uniform,
  cellTextures,
  interactive,
  highlightedCell,
  highlightTextureUrl,
  onPaint,
  onPointerOver,
  onPointerOut,
}: FloorLayerProps) {
  const useUnified = uniform !== null;

  return (
    <group>
      {useUnified && uniform.textureUrl && (
        <UnifiedTexturedFloor textureUrl={uniform.textureUrl} />
      )}
      {useUnified && !uniform.textureUrl && (
        <UnifiedColoredFloor color={uniform.color} />
      )}

      {interactive && useUnified && (
        <FloorPickGrid
          cells={cells}
          onPaint={onPaint}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
        />
      )}

      {useUnified && highlightedCell && highlightTextureUrl && (
        <Tile
          textureUrl={highlightTextureUrl}
          color={floorColor}
          planeWidth={1}
          planeHeight={1}
          position={[
            highlightedCell.x + 0.5,
            FLOOR_Y + 0.002,
            highlightedCell.z + 0.5,
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
          pickable={false}
          opacity={0.75}
        />
      )}

      {!useUnified &&
        cells.map(({ x, z, index, tileId }) => {
          const resolved = cellTextures.get(tileId);
          const highlighted =
            highlightedCell?.x === x && highlightedCell?.z === z;
          return (
            <Tile
              key={`floor-${index}`}
              textureUrl={resolved?.textureUrl}
              pixelWidth={resolved?.pixelWidth}
              pixelHeight={resolved?.pixelHeight}
              planeWidth={1.004}
              planeHeight={1.004}
              highlighted={highlighted}
              previewTextureUrl={highlightTextureUrl}
              color={floorColor}
              position={[
                x + 0.5,
                FLOOR_Y + Number(index) * 0.00002,
                z + 0.5,
              ]}
              rotation={[-Math.PI / 2, 0, 0]}
              pickable={interactive}
              onPaint={() => onPaint?.(x, z)}
              onPointerOver={() => onPointerOver?.(x, z)}
              onPointerOut={() => onPointerOut?.()}
            />
          );
        })}
    </group>
  );
}

export function getUniformFloor(
  cells: FloorCell[],
  cellTextures: Map<string, { textureUrl?: string; color: string }>,
  floorColor: string,
): UniformFloor | null {
  const ids = new Set(cells.map((cell) => cell.tileId));
  if (ids.size !== 1) return null;

  const tileId = cells[0].tileId;
  const resolved = cellTextures.get(tileId);
  return {
    tileId,
    textureUrl: resolved?.textureUrl,
    color: resolved?.textureUrl ? "#ffffff" : floorColor,
  };
}
