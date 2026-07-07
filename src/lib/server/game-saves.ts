import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import {
  MAX_SAVED_GAMES,
  normalizeGameSave,
  type GameSaveDocument,
  type GameSavePatch,
} from "@/types/game";
import { normalizeRoom, resolvePlayerSpawn } from "@/types/room";

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

export async function createGame(
  uid: string,
  startRoomId: string,
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
  const spawn = resolvePlayerSpawn(room);

  const gameId = `game_${Date.now()}`;
  const label = defaultGameLabel(existing.length);
  const now = FieldValue.serverTimestamp();

  const payload = {
    label,
    roomId: startRoomId,
    playerX: spawn.x,
    playerZ: spawn.z,
    startRoomId,
    unlockedPortals: {},
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
