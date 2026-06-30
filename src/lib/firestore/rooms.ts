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
  type FurnitureItem,
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
  await updateDoc(ref, { furniture });
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
    furniture: room.furniture.filter((item) => item.id !== itemId),
  });
}
