import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { discoverGameRooms } from "@/lib/server/discover-game-rooms";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import {
  generateNpcPuzzles,
  puzzlesFromRooms,
} from "@/lib/server/npc-puzzle-generator";
import {
  MAX_SAVED_GAMES,
  normalizeGameSave,
  type GameSaveDocument,
  type GameSavePatch,
  type GeneratedNpcPuzzle,
} from "@/types/game";
import { normalizeRoom, resolvePlayerSpawn, type RoomDocument } from "@/types/room";

function gamesCollection(uid: string) {
  return getFirebaseAdminDb().collection("users").doc(uid).collection("games");
}

function gameRef(uid: string, gameId: string) {
  return gamesCollection(uid).doc(gameId);
}

function toIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

export async function listGames(uid: string): Promise<GameSaveDocument[]> {
  const snap = await gamesCollection(uid).orderBy("updatedAt", "desc").get();
  return snap.docs
    .map((d) => normalizeGameSave(d.id, d.data()))
    .filter((g): g is GameSaveDocument => g != null);
}

export async function getGame(
  uid: string,
  gameId: string,
): Promise<GameSaveDocument | null> {
  const snap = await gameRef(uid, gameId).get();
  if (!snap.exists) return null;
  return normalizeGameSave(snap.id, snap.data());
}

function defaultGameLabel(existingCount: number): string {
  const date = new Date().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `Game ${existingCount + 1} · ${date}`;
}

function mergeNpcPuzzles(
  existing: Record<string, Record<string, GeneratedNpcPuzzle>>,
  generated: Record<string, Record<string, GeneratedNpcPuzzle>>,
): Record<string, Record<string, GeneratedNpcPuzzle>> {
  const merged = { ...existing };
  for (const [roomId, byNpc] of Object.entries(generated)) {
    merged[roomId] = { ...(merged[roomId] ?? {}), ...byNpc };
  }
  return merged;
}

async function generatePuzzlesForRooms(
  gameId: string,
  rooms: Map<string, RoomDocument>,
): Promise<Record<string, Record<string, GeneratedNpcPuzzle>>> {
  const seeds = puzzlesFromRooms(rooms, gameId);
  if (seeds.length === 0) return {};
  return generateNpcPuzzles(seeds);
}

export async function ensureRoomNpcPuzzles(
  uid: string,
  gameId: string,
  roomId: string,
  room: RoomDocument,
): Promise<GameSaveDocument | null> {
  const game = await getGame(uid, gameId);
  if (!game) return null;

  const missing = room.npcs.filter(
    (npc) => !game.npcPuzzles[roomId]?.[npc.id],
  );
  if (missing.length === 0) return game;

  const roomMap = new Map([[roomId, room]]);
  const generated = await generatePuzzlesForRooms(gameId, roomMap);
  const npcPuzzles = mergeNpcPuzzles(game.npcPuzzles, generated);

  await gameRef(uid, gameId).set(
    { npcPuzzles, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );

  return getGame(uid, gameId);
}

export async function createGame(
  uid: string,
  startRoomId: string,
  spawnOverride?: { x: number; z: number },
): Promise<GameSaveDocument> {
  const existing = await listGames(uid);
  if (existing.length >= MAX_SAVED_GAMES) {
    throw new Error(
      `You can only keep ${MAX_SAVED_GAMES} saved games. Delete one to start a new game.`,
    );
  }

  const roomSnap = await getFirebaseAdminDb()
    .collection("rooms")
    .doc(startRoomId)
    .get();
  const room = roomSnap.exists
    ? normalizeRoom(roomSnap.data() as Parameters<typeof normalizeRoom>[0])
    : null;
  const spawn = spawnOverride
    ? resolvePlayerSpawn({
        playerSpawnX: spawnOverride.x,
        playerSpawnZ: spawnOverride.z,
      })
    : resolvePlayerSpawn(room);

  const gameId = `game_${Date.now()}`;
  const label = defaultGameLabel(existing.length);
  const now = FieldValue.serverTimestamp();

  const rooms = await discoverGameRooms(startRoomId);
  const npcPuzzles = await generatePuzzlesForRooms(gameId, rooms);

  const payload = {
    label,
    roomId: startRoomId,
    playerX: spawn.x,
    playerZ: spawn.z,
    startRoomId,
    unlockedPortals: {},
    npcPuzzles,
    createdAt: now,
    updatedAt: now,
  };

  await gameRef(uid, gameId).set(payload);

  return {
    id: gameId,
    label,
    roomId: startRoomId,
    playerX: spawn.x,
    playerZ: spawn.z,
    startRoomId,
    unlockedPortals: {},
    npcPuzzles,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function updateGame(
  uid: string,
  gameId: string,
  patch: GameSavePatch,
): Promise<GameSaveDocument> {
  const ref = gameRef(uid, gameId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("Game not found.");
  }

  const payload: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (patch.roomId != null) payload.roomId = patch.roomId;
  if (patch.playerX != null) payload.playerX = patch.playerX;
  if (patch.playerZ != null) payload.playerZ = patch.playerZ;
  if (patch.unlockedPortals != null) {
    payload.unlockedPortals = patch.unlockedPortals;
  }
  if (patch.label?.trim()) payload.label = patch.label.trim().slice(0, 80);

  await ref.set(payload, { merge: true });

  const updated = await ref.get();
  const game = normalizeGameSave(updated.id, updated.data());
  if (!game) throw new Error("Could not read saved game.");

  try {
    const { syncLeaderboardForGame } = await import("@/lib/server/leagues");
    await syncLeaderboardForGame(uid, game);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[game-saves] Leaderboard sync failed:", error);
    }
  }

  return game;
}

export async function deleteGame(uid: string, gameId: string): Promise<void> {
  const ref = gameRef(uid, gameId);
  const snap = await ref.get();
  if (!snap.exists) return;

  const chatRefs = await ref.collection("negotiationChats").listDocuments();
  const db = getFirebaseAdminDb();
  const batch = db.batch();
  for (const chatRef of chatRefs) {
    batch.delete(chatRef);
  }
  batch.delete(ref);
  await batch.commit();
}

export function gameTimestamps(data: Record<string, unknown> | undefined) {
  return {
    createdAt: toIso(data?.createdAt),
    updatedAt: toIso(data?.updatedAt),
  };
}
