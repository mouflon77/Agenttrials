"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Room } from "@/components/room/Room";
import { RoomCanvas } from "@/components/room/RoomCanvas";
import { NpcChatBar } from "@/components/play/NpcChatBar";
import { NpcSpeechBubble } from "@/components/play/NpcSpeechBubble";
import { NpcScreenProjector } from "@/components/play/NpcScreenProjector";
import { PlayHud } from "@/components/play/PlayHud";
import { VirtualDpad } from "@/components/play/VirtualDpad";
import { useTouchPlayControls } from "@/hooks/useTouchPlayControls";
import { useAuth } from "@/contexts/AuthContext";
import { useGameSave } from "@/hooks/useGameSave";
import { useNpcChat } from "@/hooks/useNpcChat";
import { usePlayerMovement } from "@/hooks/usePlayerMovement";
import { getFootprintCells } from "@/components/room/Furniture";
import { worldToGrid } from "@/lib/movement";
import { getTile, type TilesetRegistry } from "@/lib/tileset-collections";
import {
  GRID_SIZE,
  isUnsetSavedSpawn,
  isWithinTiles,
  resolvePlayerSpawn,
  type NpcItem,
  type PortalItem,
  type RoomDocument,
} from "@/types/room";
import { DEFAULT_AVATAR_CONFIG, normalizeAvatarConfig } from "@/types/avatar";

interface PlaySceneProps {
  room: RoomDocument;
  tilesets: TilesetRegistry;
  roomId: string;
  gameId: string;
  initialSpawn?: { x: number; z: number };
  initialUnlockedByRoom?: Record<string, string[]>;
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
  gameId,
  initialSpawn = { x: 6, z: 6 },
  initialUnlockedByRoom = {},
}: PlaySceneProps) {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const touchControls = useTouchPlayControls();

  const blockedCells = useMemo(
    () => buildBlockedCells(room, tilesets),
    [room, tilesets],
  );

  const [chatNpc, setChatNpc] = useState<NpcItem | null>(null);
  const inputPaused = Boolean(chatNpc);
  const speechBubbleRef = useRef<HTMLDivElement>(null);
  const enteringPortalRef = useRef(false);

  const [unlockedByRoom, setUnlockedByRoom] = useState<Record<string, string[]>>(
    () => ({ ...initialUnlockedByRoom }),
  );

  const unlockedPortalIds = useMemo(
    () => new Set(unlockedByRoom[roomId] ?? []),
    [unlockedByRoom, roomId],
  );

  const handleNpcPassed = useCallback(
    (_npcId: string) => {
      setUnlockedByRoom((prev) => ({
        ...prev,
        [roomId]: room.portals.map((portal) => portal.id),
      }));
    },
    [room.portals, roomId],
  );

  const {
    input: chatInput,
    setInput: setChatInput,
    lines: chatLines,
    npcLines,
    keywordProgress,
    sending: chatSending,
    send: sendChat,
    registerBribePayment,
  } = useNpcChat(gameId, roomId, chatNpc, user?.uid, handleNpcPassed);

  const {
    gridPosition,
    visualPosition,
    facingRow,
    tryStartMove,
  } = usePlayerMovement(initialSpawn, blockedCells, room, inputPaused);

  const roomSpawn = useMemo(() => resolvePlayerSpawn(room), [room]);
  const skipPositionAutosave = isUnsetSavedSpawn(gridPosition, roomSpawn);

  const { saveNow } = useGameSave(
    gameId,
    {
      roomId,
      playerX: gridPosition.x,
      playerZ: gridPosition.z,
      unlockedPortals: unlockedByRoom,
    },
    { skipPositionAutosave },
  );

  useEffect(() => {
    if (isUnsetSavedSpawn(initialSpawn, roomSpawn)) return;
    void saveNow({
      playerX: initialSpawn.x,
      playerZ: initialSpawn.z,
    });
  }, [gameId, roomId, initialSpawn.x, initialSpawn.z, roomSpawn, saveNow]);

  const avatarConfig = normalizeAvatarConfig(
    userProfile?.avatarConfig ?? DEFAULT_AVATAR_CONFIG,
  );
  const photoURL = userProfile?.photoURL ?? user?.photoURL ?? null;
  const displayName =
    userProfile?.twitterHandle?.replace(/^@/, "") ||
    userProfile?.displayName ||
    user?.displayName ||
    "Player";

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
      if (enteringPortalRef.current) return;
      const portal = room.portals.find((p) => p.id === portalId);
      if (!portal || !unlockedPortalIds.has(portalId)) return;
      enteringPortalRef.current = true;
      const sx = Math.min(GRID_SIZE - 1, Math.max(0, portal.spawnX));
      const sz = Math.min(GRID_SIZE - 1, Math.max(0, portal.spawnZ));
      void saveNow({
        roomId: portal.targetRoomId,
        playerX: sx,
        playerZ: sz,
      });
      const params = new URLSearchParams({
        gameId,
        spawnX: String(sx),
        spawnZ: String(sz),
      });
      router.push(`/play/${portal.targetRoomId}?${params.toString()}`);
    },
    [room.portals, unlockedPortalIds, router, gameId, saveNow],
  );

  const tryWarpAtTile = useCallback(
    (x: number, z: number) => {
      if (inputPaused || enteringPortalRef.current) return;
      const portal = room.portals.find((p) => p.x === x && p.z === z);
      if (portal && unlockedPortalIds.has(portal.id)) {
        enterPortal(portal.id);
      }
    },
    [room.portals, unlockedPortalIds, enterPortal, inputPaused],
  );

  useEffect(() => {
    enteringPortalRef.current = false;
  }, [roomId]);

  useEffect(() => {
    if (inputPaused) return;
    tryWarpAtTile(gridPosition.x, gridPosition.z);
    const visualCell = worldToGrid(visualPosition);
    tryWarpAtTile(visualCell.x, visualCell.z);
  }, [
    gridPosition.x,
    gridPosition.z,
    visualPosition.x,
    visualPosition.z,
    tryWarpAtTile,
    inputPaused,
  ]);

  const handlePortalEnter = useCallback(
    (portalId: string) => {
      const portal = room.portals.find((p) => p.id === portalId);
      if (!portal) return;
      tryWarpAtTile(portal.x, portal.z);
    },
    [tryWarpAtTile, room.portals],
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
          playerDisplayName={displayName}
          playerFacingRow={facingRow}
          unlockedPortalIds={unlockedPortalIds}
          onPortalEnter={handlePortalEnter}
        />
        {chatNpc && !touchControls && (
          <NpcScreenProjector
            npc={chatNpc}
            tilesets={tilesets}
            anchorRef={speechBubbleRef}
          />
        )}
      </RoomCanvas>

      {chatNpc && !touchControls && (
        <NpcSpeechBubble
          ref={speechBubbleRef}
          npc={chatNpc}
          lines={npcLines}
        />
      )}

      {touchControls && !inputPaused && (
        <VirtualDpad
          className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] z-30"
          onMove={tryStartMove}
        />
      )}

      <PlayHud
        touchControls={touchControls}
        chatOpen={inputPaused}
        nearbyNpc={nearbyNpc}
        portalLocked={portalLocked}
        portalNearby={Boolean(nearbyPortal)}
        onTalk={() => nearbyNpc && setChatNpc(nearbyNpc)}
        onEnterPortal={() => nearbyPortal && enterPortal(nearbyPortal.id)}
      />

      {chatNpc && (
        <>
          {touchControls && (
            <button
              type="button"
              aria-label="Close conversation"
              className="absolute inset-0 z-20 bg-black/40"
              onClick={() => setChatNpc(null)}
            />
          )}
          <NpcChatBar
            npc={chatNpc}
            roomId={roomId}
            lines={chatLines}
            isMobile={touchControls}
            keywordProgress={keywordProgress}
            input={chatInput}
            sending={chatSending}
            onInputChange={setChatInput}
            onSend={() => void sendChat()}
            onClose={() => setChatNpc(null)}
            onBribeVerified={registerBribePayment}
          />
        </>
      )}
    </div>
  );
}
