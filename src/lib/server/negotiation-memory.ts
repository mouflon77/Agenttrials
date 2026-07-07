import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import {
  MAX_NEGOTIATION_MESSAGES,
  NEGOTIATION_HISTORY_FOR_MODEL,
  negotiationChatId,
  type NegotiationChatDocument,
  type NegotiationMessage,
} from "@/types/negotiation";

function chatCollection(uid: string, gameId: string) {
  return getFirebaseAdminDb()
    .collection("users")
    .doc(uid)
    .collection("games")
    .doc(gameId)
    .collection("negotiationChats");
}

function toIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

function normalizeMessage(raw: unknown): NegotiationMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const role = row.role;
  const text = typeof row.text === "string" ? row.text.trim() : "";
  if ((role !== "user" && role !== "npc") || !text) return null;
  return {
    role,
    text: text.slice(0, 2000),
    at: toIso(row.at),
  };
}

export function normalizeNegotiationChat(
  data: FirebaseFirestore.DocumentData | undefined,
): NegotiationChatDocument | null {
  if (!data) return null;
  const messages = Array.isArray(data.messages)
    ? data.messages
        .map(normalizeMessage)
        .filter((m): m is NegotiationMessage => m != null)
    : [];

  return {
    roomId: String(data.roomId ?? ""),
    npcId: String(data.npcId ?? ""),
    npcName: String(data.npcName ?? "Gatekeeper"),
    passed: Boolean(data.passed),
    messages,
    playerMemory:
      typeof data.playerMemory === "string" ? data.playerMemory.slice(0, 2000) : undefined,
    updatedAt: toIso(data.updatedAt),
    createdAt: toIso(data.createdAt),
  };
}

export async function loadNegotiationChat(
  uid: string,
  gameId: string,
  roomId: string,
  npcId: string,
): Promise<NegotiationChatDocument | null> {
  const snap = await chatCollection(uid, gameId)
    .doc(negotiationChatId(roomId, npcId))
    .get();
  if (!snap.exists) return null;
  return normalizeNegotiationChat(snap.data());
}

export function messagesForModel(
  chat: NegotiationChatDocument | null,
): Array<{ role: "user" | "npc"; text: string }> {
  if (!chat?.messages.length) return [];
  return chat.messages
    .slice(-NEGOTIATION_HISTORY_FOR_MODEL)
    .map(({ role, text }) => ({ role, text }));
}

export function buildPlayerMemoryBlock(chat: NegotiationChatDocument | null): string {
  if (!chat) return "";

  const parts: string[] = [];

  if (chat.playerMemory?.trim()) {
    parts.push(`What you remember about this player:\n${chat.playerMemory.trim()}`);
  }

  if (chat.messages.length > 0) {
    const prior = chat.messages
      .slice(-12)
      .map((m) => `${m.role === "user" ? "Player" : "You"}: ${m.text}`)
      .join("\n");
    parts.push(`Earlier exchanges with this same player:\n${prior}`);
  }

  if (chat.passed) {
    parts.push(
      "This player has already earned passage on a prior visit. You may acknowledge that, but still stay in character if they talk again.",
    );
  }

  return parts.length ? `\n\nPlayer memory:\n${parts.join("\n\n")}` : "";
}

function buildPlayerMemoryUpdate(
  existing: string | undefined,
  userMessage: string,
  npcReply: string,
): string {
  const snippet = `Player said "${userMessage.slice(0, 120)}"; you replied "${npcReply.slice(0, 120)}".`;
  const combined = [existing?.trim(), snippet].filter(Boolean).join(" ");
  return combined.slice(-1800);
}

export async function saveNegotiationTurn(
  uid: string,
  gameId: string,
  input: {
    roomId: string;
    npcId: string;
    npcName: string;
    userMessage: string;
    npcReply: string;
    passed: boolean;
  },
): Promise<NegotiationChatDocument> {
  const ref = chatCollection(uid, gameId).doc(
    negotiationChatId(input.roomId, input.npcId),
  );
  const snap = await ref.get();
  const existing = normalizeNegotiationChat(snap.data());
  const now = new Date().toISOString();

  const turnMessages: NegotiationMessage[] = [
    { role: "user", text: input.userMessage.trim(), at: now },
    { role: "npc", text: input.npcReply.trim(), at: now },
  ];
  const newMessages: NegotiationMessage[] = [
    ...(existing?.messages ?? []),
    ...turnMessages,
  ].slice(-MAX_NEGOTIATION_MESSAGES);

  const doc: NegotiationChatDocument = {
    roomId: input.roomId,
    npcId: input.npcId,
    npcName: input.npcName.trim() || existing?.npcName || "Gatekeeper",
    passed: Boolean(existing?.passed || input.passed),
    messages: newMessages,
    playerMemory: buildPlayerMemoryUpdate(
      existing?.playerMemory,
      input.userMessage,
      input.npcReply,
    ),
    updatedAt: now,
    createdAt: existing?.createdAt ?? now,
  };

  const payload: Record<string, unknown> = {
    roomId: doc.roomId,
    npcId: doc.npcId,
    npcName: doc.npcName,
    passed: doc.passed,
    messages: doc.messages,
    playerMemory: doc.playerMemory,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (!existing) {
    payload.createdAt = FieldValue.serverTimestamp();
  }

  await ref.set(payload, { merge: true });

  return doc;
}
