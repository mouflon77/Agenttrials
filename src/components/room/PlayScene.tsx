"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Room } from "@/components/room/Room";
import { RoomCanvas } from "@/components/room/RoomCanvas";
import { NpcChatOverlay } from "@/components/play/NpcChatOverlay";
import { PlayHud } from "@/components/play/PlayHud";
import { usePlayerMovement } from "@/hooks/usePlayerMovement";
import { getFootprintCells } from "@/components/room/Furniture";
import { getTile, type TilesetRegistry } from "@/lib/tileset-collections";
import {
  GRID_SIZE,
  isWithinTiles,
  type NpcItem,
  type PortalItem,
  type RoomDocument,
} from "@/types/room";

interface PlaySceneProps {
  room: RoomDocument;
  tilesets: TilesetRegistry;
  roomId: string;
  initialSpawn?: { x: number; z: number };
}

function buildBlockedCells(room: RoomDocument, tilesets: TilesetRegistry): Set<string> {
  const blocked = new Set<string>();
  for (const item of room.furniture) {
    const def = getTile(tilesets, "furniture", item.type);
    const cells = getFootprintCells(
      item.x,
      item.z,
      def?.width ?? 1,
      def?.depth ?? 1,
      item.rotation,
    );
    cells.forEach((c) => blocked.add(`${c.x},${c.z}`));
  }
  for (const npc of room.npcs) {
    blocked.add(`${npc.x},${npc.z}`);
  }
  return blocked;
}

function findNearbyNpc(
  player: { x: number; z: number },
  npcs: NpcItem[],
): NpcItem | null {
  for (const npc of npcs) {
    if (isWithinTiles(player.x, player.z, npc.x, npc.z, 1)) return npc;
  }
  return null;
}

function findNearbyPortal(
  player: { x: number; z: number },
  portals: PortalItem[],
): PortalItem | null {
  for (const portal of portals) {
    if (isWithinTiles(player.x, player.z, portal.x, portal.z, 1)) return portal;
  }
  return null;
}

export function PlayScene({
  room,
  tilesets,
  roomId,
  initialSpawn = { x: 6, z: 6 },
}: PlaySceneProps) {
  const router = useRouter();
  const blockedCells = useMemo(
    () => buildBlockedCells(room, tilesets),
    [room, tilesets],
  );
  const { position, moveTo } = usePlayerMovement(initialSpawn, blockedCells);
  const [unlockedPortalIds, setUnlockedPortalIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [chatNpc, setChatNpc] = useState<NpcItem | null>(null);

  const nearbyNpc = useMemo(
    () => findNearbyNpc(position, room.npcs),
    [position, room.npcs],
  );
  const nearbyPortal = useMemo(
    () => findNearbyPortal(position, room.portals),
    [position, room.portals],
  );

  const portalLocked = useMemo(() => {
    if (!nearbyPortal) return true;
    return !unlockedPortalIds.has(nearbyPortal.id);
  }, [nearbyPortal, unlockedPortalIds]);

  const handleNpcPassed = useCallback((npcId: string) => {
    setUnlockedPortalIds((prev) => {
      const next = new Set(prev);
      for (const portal of room.portals) {
        next.add(portal.id);
      }
      void npcId;
      return next;
    });
  }, [room.portals]);

  const enterPortal = useCallback(
    (portalId: string) => {
      const portal = room.portals.find((p) => p.id === portalId);
      if (!portal || !unlockedPortalIds.has(portalId)) return;
      const sx = Math.min(GRID_SIZE - 1, Math.max(0, portal.spawnX));
      const sz = Math.min(GRID_SIZE - 1, Math.max(0, portal.spawnZ));
      const params = new URLSearchParams({ spawnX: String(sx), spawnZ: String(sz) });
      router.push(`/play/${portal.targetRoomId}?${params.toString()}`);
    },
    [room.portals, unlockedPortalIds, router],
  );

  const handlePortalEnter = useCallback(
    (portalId: string) => {
      if (position.x === room.portals.find((p) => p.id === portalId)?.x &&
          position.z === room.portals.find((p) => p.id === portalId)?.z) {
        enterPortal(portalId);
      }
    },
    [enterPortal, position, room.portals],
  );

  const handleFloorStep = useCallback(
    (x: number, z: number) => {
      moveTo(x, z);
      const portal = room.portals.find((p) => p.x === x && p.z === z);
      if (portal && unlockedPortalIds.has(portal.id)) {
        enterPortal(portal.id);
      }
    },
    [moveTo, room.portals, unlockedPortalIds, enterPortal],
  );

  return (
    <div className="relative h-full w-full">
      <RoomCanvas>
        <Room
          room={room}
          tilesets={tilesets}
          playMode
          playerPosition={position}
          unlockedPortalIds={unlockedPortalIds}
          onPortalEnter={handlePortalEnter}
          onFloorStep={handleFloorStep}
        />
      </RoomCanvas>

      <PlayHud
        nearbyNpc={nearbyNpc}
        portalLocked={portalLocked}
        portalNearby={Boolean(nearbyPortal)}
        onTalk={() => nearbyNpc && setChatNpc(nearbyNpc)}
        onEnterPortal={() => nearbyPortal && enterPortal(nearbyPortal.id)}
      />

      {chatNpc && (
        <NpcChatOverlay
          npc={chatNpc}
          roomId={roomId}
          onClose={() => setChatNpc(null)}
          onPassed={handleNpcPassed}
        />
      )}
    </div>
  );
}
