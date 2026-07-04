"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Room } from "@/components/room/Room";
import { RoomCanvas } from "@/components/room/RoomCanvas";
import { NpcChatBar } from "@/components/play/NpcChatBar";
import { NpcSpeechBubble } from "@/components/play/NpcSpeechBubble";
import { NpcScreenProjector } from "@/components/play/NpcScreenProjector";
import { PlayHud } from "@/components/play/PlayHud";
import { VirtualJoystick } from "@/components/play/VirtualJoystick";
import { useAuth } from "@/contexts/AuthContext";
import { useHeadgear } from "@/hooks/useHeadgear";
import { useNpcChat } from "@/hooks/useNpcChat";
import { usePlayerMovement } from "@/hooks/usePlayerMovement";
import { getHeadgearTexture } from "@/lib/firestore/headgear";
import { getFootprintCells } from "@/components/room/Furniture";
import { getTile, type TilesetRegistry } from "@/lib/tileset-collections";
import { canOccupyCell } from "@/lib/movement";
import {
  GRID_SIZE,
  isWithinTiles,
  type NpcItem,
  type PortalItem,
  type RoomDocument,
} from "@/types/room";
import { DEFAULT_AVATAR_CONFIG, normalizeAvatarConfig } from "@/types/avatar";

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

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

export function PlayScene({
  room,
  tilesets,
  roomId,
  initialSpawn = { x: 6, z: 6 },
}: PlaySceneProps) {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { items: headgearItems } = useHeadgear();
  const isMobile = useIsMobile();

  const blockedCells = useMemo(
    () => buildBlockedCells(room, tilesets),
    [room, tilesets],
  );

  const [chatNpc, setChatNpc] = useState<NpcItem | null>(null);
  const inputPaused = Boolean(chatNpc);
  const speechBubbleRef = useRef<HTMLDivElement>(null);

  const [unlockedPortalIds, setUnlockedPortalIds] = useState<Set<string>>(
    () => new Set(),
  );

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

  const {
    input: chatInput,
    setInput: setChatInput,
    npcLines,
    userLines,
    sending: chatSending,
    send: sendChat,
    registerBribePayment,
  } = useNpcChat(roomId, chatNpc, handleNpcPassed);

  const {
    gridPosition,
    visualPosition,
    moveToGrid,
    applyJoystick,
  } = usePlayerMovement(initialSpawn, blockedCells, room, inputPaused);

  const avatarConfig = normalizeAvatarConfig(
    userProfile?.avatarConfig ?? DEFAULT_AVATAR_CONFIG,
  );
  const photoURL = userProfile?.photoURL ?? user?.photoURL ?? null;
  const displayName =
    userProfile?.twitterHandle?.replace(/^@/, "") ||
    userProfile?.displayName ||
    user?.displayName ||
    "Player";
  const headgearTextureUrl = getHeadgearTexture(
    headgearItems,
    avatarConfig.headgearId,
  );

  const nearbyNpc = useMemo(
    () => findNearbyNpc(gridPosition, room.npcs),
    [gridPosition, room.npcs],
  );
  const nearbyPortal = useMemo(
    () => findNearbyPortal(gridPosition, room.portals),
    [gridPosition, room.portals],
  );

  const portalLocked = useMemo(() => {
    if (!nearbyPortal) return true;
    return !unlockedPortalIds.has(nearbyPortal.id);
  }, [nearbyPortal, unlockedPortalIds]);

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
      const portal = room.portals.find((p) => p.id === portalId);
      if (
        portal &&
        gridPosition.x === portal.x &&
        gridPosition.z === portal.z
      ) {
        enterPortal(portalId);
      }
    },
    [enterPortal, gridPosition, room.portals],
  );

  const handleFloorStep = useCallback(
    (x: number, z: number) => {
      if (inputPaused) return;
      if (!canOccupyCell(x, z, room, blockedCells)) return;
      moveToGrid(x, z);
      const portal = room.portals.find((p) => p.x === x && p.z === z);
      if (portal && unlockedPortalIds.has(portal.id)) {
        enterPortal(portal.id);
      }
    },
    [moveToGrid, room, blockedCells, unlockedPortalIds, enterPortal, inputPaused],
  );

  return (
    <div className="relative h-full w-full">
      <RoomCanvas followPosition={visualPosition}>
        <Room
          room={room}
          tilesets={tilesets}
          playMode
          playerGridPosition={gridPosition}
          playerVisualPosition={visualPosition}
          playerAvatarConfig={avatarConfig}
          playerPhotoURL={photoURL}
          playerHeadgearTextureUrl={headgearTextureUrl}
          playerDisplayName={displayName}
          unlockedPortalIds={unlockedPortalIds}
          onPortalEnter={handlePortalEnter}
          onFloorStep={handleFloorStep}
        />
        {chatNpc && (
          <NpcScreenProjector
            npc={chatNpc}
            tilesets={tilesets}
            anchorRef={speechBubbleRef}
          />
        )}
      </RoomCanvas>

      {chatNpc && (
        <NpcSpeechBubble
          ref={speechBubbleRef}
          npc={chatNpc}
          lines={npcLines}
        />
      )}

      {isMobile && !inputPaused && (
        <VirtualJoystick
          className="absolute bottom-6 left-4 z-20 md:hidden"
          onMove={applyJoystick}
        />
      )}

      <PlayHud
        isMobile={isMobile}
        chatOpen={inputPaused}
        nearbyNpc={nearbyNpc}
        portalLocked={portalLocked}
        portalNearby={Boolean(nearbyPortal)}
        onTalk={() => nearbyNpc && setChatNpc(nearbyNpc)}
        onEnterPortal={() => nearbyPortal && enterPortal(nearbyPortal.id)}
      />

      {chatNpc && (
        <NpcChatBar
          npc={chatNpc}
          roomId={roomId}
          userLines={userLines}
          input={chatInput}
          sending={chatSending}
          onInputChange={setChatInput}
          onSend={() => void sendChat()}
          onClose={() => setChatNpc(null)}
          onBribeVerified={registerBribePayment}
        />
      )}
    </div>
  );
}
