import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import {
  createDefaultRoom,
  DEFAULT_FURNITURE_COLOR,
  FLOOR_TILE_COUNT,
  normalizeRoom,
  normalizeFurniture,
  normalizeNpcs,
  normalizePortals,
  type FurnitureItem,
  type NpcItem,
  type PortalItem,
  type RoomDocument,
} from "@/types/room";

export function subscribeToRoom(
  roomId: string,
  onData: (room: RoomDocument | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const ref = doc(getFirebaseDb(), "rooms", roomId);
  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      onData(normalizeRoom(snapshot.data() as Partial<RoomDocument>));
    },
    (error) => onError?.(error),
  );
}

export async function ensureRoom(roomId: string): Promise<void> {
  const ref = doc(getFirebaseDb(), "rooms", roomId);
  await setDoc(ref, createDefaultRoom(), { merge: true });
}

export async function saveRoom(
  roomId: string,
  room: RoomDocument,
): Promise<void> {
  const ref = doc(getFirebaseDb(), "rooms", roomId);
  await setDoc(ref, room, { merge: true });
}

export async function resetRoom(roomId: string): Promise<void> {
  const ref = doc(getFirebaseDb(), "rooms", roomId);
  await setDoc(ref, createDefaultRoom());
}

/** Persist stable ids for furniture saved before ids were required. */
export async function migrateFurnitureIds(roomId: string): Promise<void> {
  const ref = doc(getFirebaseDb(), "rooms", roomId);
  const { getDoc } = await import("firebase/firestore");
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const raw = snap.data() as Partial<RoomDocument>;
  const items = raw.furniture ?? [];
  if (!items.some((item) => !item.id)) return;

  await updateDoc(ref, { furniture: normalizeFurniture(items) });
}

export async function fillFloorTiles(
  roomId: string,
  tileId: string,
): Promise<void> {
  const floorGrid: Record<string, string> = {};
  for (let i = 0; i < FLOOR_TILE_COUNT; i++) {
    floorGrid[String(i)] = tileId;
  }
  const ref = doc(getFirebaseDb(), "rooms", roomId);
  await updateDoc(ref, { floorGrid });
}

export async function updateFloorTile(
  roomId: string,
  index: string,
  tileId: string,
): Promise<void> {
  const ref = doc(getFirebaseDb(), "rooms", roomId);
  await updateDoc(ref, { [`floorGrid.${index}`]: tileId });
}

export async function updateWallTile(
  roomId: string,
  key: string,
  tileId: string,
): Promise<void> {
  const ref = doc(getFirebaseDb(), "rooms", roomId);
  await updateDoc(ref, { [`wallGrid.${key}`]: tileId });
}

export async function updateDoorTile(
  roomId: string,
  key: string,
  tileId: string,
): Promise<void> {
  const ref = doc(getFirebaseDb(), "rooms", roomId);
  await updateDoc(ref, { [`doorGrid.${key}`]: tileId });
}

export async function updateWindowTile(
  roomId: string,
  key: string,
  tileId: string,
): Promise<void> {
  const ref = doc(getFirebaseDb(), "rooms", roomId);
  await updateDoc(ref, { [`windowGrid.${key}`]: tileId });
}

export async function updateRoomColors(
  roomId: string,
  colors: Partial<Pick<RoomDocument, "floorColor" | "wallColor">>,
): Promise<void> {
  const ref = doc(getFirebaseDb(), "rooms", roomId);
  await updateDoc(ref, colors);
}

export async function addFurnitureItem(
  roomId: string,
  item: FurnitureItem,
): Promise<void> {
  const ref = doc(getFirebaseDb(), "rooms", roomId);
  const { getDoc } = await import("firebase/firestore");
  const snap = await getDoc(ref);
  const current = snap.exists()
    ? normalizeRoom(snap.data() as Partial<RoomDocument>).furniture
    : [];
  await updateDoc(ref, {
    furniture: [
      ...current,
      { ...item, color: item.color ?? DEFAULT_FURNITURE_COLOR },
    ],
  });
}

export async function updateFurnitureItem(
  roomId: string,
  itemId: string,
  patch: Partial<Pick<FurnitureItem, "x" | "z" | "rotation" | "color" | "type">>,
): Promise<void> {
  const ref = doc(getFirebaseDb(), "rooms", roomId);
  const { getDoc } = await import("firebase/firestore");
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const room = normalizeRoom(snap.data() as Partial<RoomDocument>);
  const furniture = room.furniture.map((item) =>
    item.id === itemId ? { ...item, ...patch } : item,
  );
  await updateDoc(ref, { furniture: normalizeFurniture(furniture) });
}

export async function removeFurnitureItem(
  roomId: string,
  itemId: string,
): Promise<void> {
  const ref = doc(getFirebaseDb(), "rooms", roomId);
  const { getDoc } = await import("firebase/firestore");
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const room = normalizeRoom(snap.data() as Partial<RoomDocument>);
  await updateDoc(ref, {
    furniture: normalizeFurniture(
      room.furniture.filter((item) => item.id !== itemId),
    ),
  });
}

async function readRoom(roomId: string): Promise<RoomDocument | null> {
  const ref = doc(getFirebaseDb(), "rooms", roomId);
  const { getDoc } = await import("firebase/firestore");
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return normalizeRoom(snap.data() as Partial<RoomDocument>);
}

export async function addNpcItem(roomId: string, item: NpcItem): Promise<void> {
  const room = await readRoom(roomId);
  const current = room?.npcs ?? [];
  const ref = doc(getFirebaseDb(), "rooms", roomId);
  await updateDoc(ref, { npcs: [...current, item] });
}

export async function updateNpcItem(
  roomId: string,
  itemId: string,
  patch: Partial<
    Pick<
      NpcItem,
      | "x"
      | "z"
      | "standeeType"
      | "name"
      | "prompt"
      | "walletAddress"
      | "bribeAmountSol"
    >
  >,
): Promise<void> {
  const room = await readRoom(roomId);
  if (!room) return;
  const ref = doc(getFirebaseDb(), "rooms", roomId);
  const npcs = room.npcs.map((item) =>
    item.id === itemId ? { ...item, ...patch } : item,
  );
  await updateDoc(ref, { npcs: normalizeNpcs(npcs) });
}

export async function removeNpcItem(
  roomId: string,
  itemId: string,
): Promise<void> {
  const room = await readRoom(roomId);
  if (!room) return;
  const ref = doc(getFirebaseDb(), "rooms", roomId);
  await updateDoc(ref, {
    npcs: normalizeNpcs(room.npcs.filter((item) => item.id !== itemId)),
  });
}

export async function addPortalItem(
  roomId: string,
  item: PortalItem,
): Promise<void> {
  const room = await readRoom(roomId);
  const current = room?.portals ?? [];
  const ref = doc(getFirebaseDb(), "rooms", roomId);
  await updateDoc(ref, { portals: [...current, item] });
}

export async function updatePortalItem(
  roomId: string,
  itemId: string,
  patch: Partial<
    Pick<PortalItem, "x" | "z" | "targetRoomId" | "spawnX" | "spawnZ">
  >,
): Promise<void> {
  const room = await readRoom(roomId);
  if (!room) return;
  const ref = doc(getFirebaseDb(), "rooms", roomId);
  const portals = room.portals.map((item) =>
    item.id === itemId ? { ...item, ...patch } : item,
  );
  await updateDoc(ref, { portals: normalizePortals(portals) });
}

export async function removePortalItem(
  roomId: string,
  itemId: string,
): Promise<void> {
  const room = await readRoom(roomId);
  if (!room) return;
  const ref = doc(getFirebaseDb(), "rooms", roomId);
  await updateDoc(ref, {
    portals: normalizePortals(
      room.portals.filter((item) => item.id !== itemId),
    ),
  });
}
