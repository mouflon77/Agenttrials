import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import {
  createDefaultRoom,
  normalizeRoom,
  type RoomDocument,
} from "@/types/room";

/** BFS from start room through portal targets. */
export async function discoverGameRooms(
  startRoomId: string,
): Promise<Map<string, RoomDocument>> {
  const db = getFirebaseAdminDb();
  const visited = new Set<string>();
  const queue = [startRoomId];
  const rooms = new Map<string, RoomDocument>();

  while (queue.length > 0) {
    const roomId = queue.shift()!;
    if (visited.has(roomId)) continue;
    visited.add(roomId);

    const snap = await db.collection("rooms").doc(roomId).get();
    const room = snap.exists
      ? normalizeRoom(snap.data() as Parameters<typeof normalizeRoom>[0])
      : createDefaultRoom();

    rooms.set(roomId, room);

    for (const portal of room.portals) {
      const target = portal.targetRoomId?.trim();
      if (target && !visited.has(target)) {
        queue.push(target);
      }
    }
  }

  return rooms;
}
