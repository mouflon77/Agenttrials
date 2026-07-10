import {
  collection,
  doc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase";
import {
  MAX_SAVED_GAMES,
  normalizeGameSave,
  type GameSaveDocument,
} from "@/types/game";

function toIso(value: unknown): string {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

function readGameDoc(
  id: string,
  data: Record<string, unknown> | undefined,
): GameSaveDocument | null {
  if (!data) return null;
  return normalizeGameSave(id, {
    ...data,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  });
}

function gamesCollection(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "games");
}

function mapGames(
  docs: Array<{ id: string; data: () => Record<string, unknown> }>,
): GameSaveDocument[] {
  return docs
    .map((d) => readGameDoc(d.id, d.data()))
    .filter((g): g is GameSaveDocument => g != null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_SAVED_GAMES);
}

export function subscribeToGames(
  uid: string,
  onData: (games: GameSaveDocument[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  // No orderBy — avoids depending on single-field DESC indexes that
  // fieldOverrides can accidentally disable. Sort client-side instead.
  return onSnapshot(
    gamesCollection(uid),
    (snap) => onData(mapGames(snap.docs)),
    (err) => onError?.(err),
  );
}

export function subscribeToGame(
  uid: string,
  gameId: string,
  onData: (game: GameSaveDocument | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), "users", uid, "games", gameId),
    (snap) => {
      onData(
        snap.exists() ? readGameDoc(snap.id, snap.data()) : null,
      );
    },
    (err) => onError?.(err),
  );
}
