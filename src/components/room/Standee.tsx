"use client";

import { Billboard } from "@react-three/drei";
import { useMemo } from "react";
import { getTile, type TilesetRegistry } from "@/lib/tileset-collections";
import { PIXELS_PER_TILE_UNIT, type NpcItem } from "@/types/room";
import { NameLabel } from "@/components/room/NameLabel";
import { StandeePlane } from "@/components/room/StandeePlane";

interface StandeeProps {
  npc: NpcItem;
  tilesets: TilesetRegistry;
  selected?: boolean;
  pickable?: boolean;
  onSelect?: (id: string) => void;
  /** Show name / role labels (play mode). */
  showLabel?: boolean;
}

export function StandeeMesh({
  npc,
  tilesets,
  selected = false,
  pickable = false,
  onSelect,
  showLabel = false,
}: StandeeProps) {
  const def = getTile(tilesets, "standee", npc.standeeType);
  const textureUrl = def?.textureUrl || undefined;
  const pixelWidth = def?.pixelWidth ?? 64;
  const pixelHeight = def?.pixelHeight ?? 128;
  const width = pixelWidth / PIXELS_PER_TILE_UNIT;
  const height = pixelHeight / PIXELS_PER_TILE_UNIT;

  const position = useMemo(
    (): [number, number, number] => [npc.x + 0.5, 0, npc.z + 0.5],
    [npc.x, npc.z],
  );

  const labelName = npc.name?.trim() || "Gatekeeper";
  const showRoleSubtitle =
    labelName.toLowerCase() !== "gatekeeper";

  return (
    <group position={position}>
      <Billboard follow lockY>
        <group
          onPointerDown={(event) => {
            if (!pickable || event.button !== 0) return;
            event.stopPropagation();
            onSelect?.(npc.id);
          }}
        >
          <StandeePlane
            textureUrl={textureUrl}
            width={width}
            height={height}
            color={textureUrl ? "#ffffff" : "#7c6a5a"}
            selected={selected}
          />
          {selected && (
            <mesh position={[0, -height * 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.35, 0.45, 32]} />
              <meshBasicMaterial color="#60a5fa" transparent opacity={0.6} />
            </mesh>
          )}
        </group>
      </Billboard>
      {showLabel && (
        <NameLabel
          name={labelName}
          subtitle={showRoleSubtitle ? "Gatekeeper" : undefined}
          y={height + 0.28}
          color="#fde68a"
        />
      )}
    </group>
  );
}
