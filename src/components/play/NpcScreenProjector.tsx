"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { getTile, type TilesetRegistry } from "@/lib/tileset-collections";
import { PIXELS_PER_TILE_UNIT, type NpcItem } from "@/types/room";

interface NpcScreenProjectorProps {
  npc: NpcItem;
  tilesets: TilesetRegistry;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}

export function NpcScreenProjector({
  npc,
  tilesets,
  anchorRef,
}: NpcScreenProjectorProps) {
  const { camera, size } = useThree();
  const world = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector3(), []);

  const bubbleY = useMemo(() => {
    const def = getTile(tilesets, "standee", npc.standeeType);
    const standeeHeight = (def?.pixelHeight ?? 128) / PIXELS_PER_TILE_UNIT;
    return standeeHeight + 0.45;
  }, [npc.standeeType, tilesets]);

  useEffect(() => {
    const el = anchorRef.current;
    if (el) el.style.visibility = "visible";
    return () => {
      if (el) el.style.visibility = "hidden";
    };
  }, [anchorRef]);

  useFrame(() => {
    const el = anchorRef.current;
    if (!el) return;

    world.set(npc.x + 0.5, bubbleY, npc.z + 0.5);
    ndc.copy(world).project(camera);

    if (ndc.z < -1 || ndc.z > 1) {
      el.style.visibility = "hidden";
      return;
    }

    const x = (ndc.x * 0.5 + 0.5) * size.width;
    const y = (-ndc.y * 0.5 + 0.5) * size.height;

    el.style.visibility = "visible";
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, calc(-100% - 8px))`;
  });

  return null;
}
