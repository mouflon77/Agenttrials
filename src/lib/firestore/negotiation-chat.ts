import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";

import { getFirebaseDb } from "@/lib/firebase";
import { negotiationChatId, type NegotiationChatDocument } from "@/types/negotiation";

function chatRef(uid: string, roomId: string, npcId: string) {
  return doc(
    getFirebaseDb(),
    "users",
    uid,
    "negotiationChats",
    negotiationChatId(roomId, npcId),
  );
}

function normalizeClientChat(
  data: Record<string, unknown> | undefined,
): NegotiationChatDocument | null {
  if (!data) return null;
  const messages = Array.isArray(data.messages)
    ? data.messages
        .filter(
          (m): m is { role: "user" | "npc"; text: string; at?: string } =>
            Boolean(
              m &&
                typeof m === "object" &&
                (m.role === "user" || m.role === "npc") &&
                typeof (m as { text?: unknown }).text === "string",
            ),
        )
        .map((m) => ({
          role: m.role,
          text: m.text,
          at: typeof m.at === "string" ? m.at : new Date().toISOString(),
        }))
    : [];

  return {
    roomId: String(data.roomId ?? ""),
    npcId: String(data.npcId ?? ""),
    npcName: String(data.npcName ?? "Gatekeeper"),
    passed: Boolean(data.passed),
    messages,
    playerMemory:
      typeof data.playerMemory === "string" ? data.playerMemory : undefined,
    updatedAt:
      typeof data.updatedAt === "string"
        ? data.updatedAt
        : new Date().toISOString(),
    createdAt:
      typeof data.createdAt === "string"
        ? data.createdAt
        : new Date().toISOString(),
  };
}

export function subscribeToNegotiationChat(
  uid: string,
  roomId: string,
  npcId: string,
  onData: (chat: NegotiationChatDocument | null) => void,
): Unsubscribe {
  return onSnapshot(
    chatRef(uid, roomId, npcId),
    (snap) => {
      onData(snap.exists() ? normalizeClientChat(snap.data()) : null);
    },
    () => onData(null),
  );
}
