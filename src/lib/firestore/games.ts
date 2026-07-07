import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
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

export function subscribeToGames(
  uid: string,
  onData: (games: GameSaveDocument[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(gamesCollection(uid), orderBy("updatedAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const games = snap.docs
        .map((d) => readGameDoc(d.id, d.data()))
        .filter((g): g is GameSaveDocument => g != null)
        .slice(0, MAX_SAVED_GAMES);
      onData(games);
    },
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
