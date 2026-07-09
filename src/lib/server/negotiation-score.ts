import {
  evaluatePassKeywordsAcrossChat,
  minimumPersuasionTurns,
  resolvePassKeywordsForNpc,
  userRequestsHint,
} from "@/lib/server/gatekeeper-judge";
import { normalizeNegotiationChat } from "@/lib/server/negotiation-memory";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { parseRoomFloor } from "@/types/game";
import type { GameSaveDocument, GeneratedNpcPuzzle } from "@/types/game";
import type { NegotiationChatDocument } from "@/types/negotiation";
import { normalizeRoom, parsePassKeywords, DEFAULT_GATEKEEPER_STATS, type GatekeeperStats } from "@/types/room";

const DEFAULT_STATS: GatekeeperStats = DEFAULT_GATEKEEPER_STATS;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

function chatHistory(
  chat: NegotiationChatDocument,
): Array<{ role: "user" | "npc"; text: string }> {
  return chat.messages.map((line) => ({ role: line.role, text: line.text }));
}

/** At least one pass keyword guessed (whole conversation). */
export function chatHasKeywordGuess(
  chat: NegotiationChatDocument,
  keywords: string[],
): boolean {
  if (keywords.length === 0) return false;
  const { matched } = evaluatePassKeywordsAcrossChat(
    chatHistory(chat),
    "",
    keywords,
  );
  return matched.length > 0;
}

export function scoreNegotiationChat(
  chat: NegotiationChatDocument,
  puzzle?: GeneratedNpcPuzzle,
): number {
  let score = 100;
  const userMessages = chat.messages.filter((line) => line.role === "user");
  const turns = userMessages.length;
  const stats = puzzle?.stats ?? DEFAULT_STATS;
  const minTurns = minimumPersuasionTurns(stats);

  score -= Math.max(0, turns - minTurns) * 5;

  for (const message of userMessages) {
    const text = message.text.trim();
    if (userRequestsHint(text)) score -= 4;
    if (text.length < 15) score -= 6;
    else if (text.length >= 60) score += 2;
  }

  if (chat.passed && turns > 0 && turns <= minTurns) score += 3;
  if (!chat.passed && turns >= 6) score -= 10;

  return clamp(Math.round(score), 0, 100);
}

export function computeNegotiationScoreFromChats(
  chats: NegotiationChatDocument[],
  game: Pick<GameSaveDocument, "npcPuzzles">,
  keywordsByChatKey: Map<string, string[]>,
): number | null {
  if (chats.length === 0) return null;

  const scoresByFloor = new Map<number, number[]>();

  for (const chat of chats) {
    const key = `${chat.roomId}:${chat.npcId}`;
    const keywords = keywordsByChatKey.get(key) ?? [];
    if (!chatHasKeywordGuess(chat, keywords)) continue;

    const floor = parseRoomFloor(chat.roomId);
    const puzzle = game.npcPuzzles?.[chat.roomId]?.[chat.npcId];
    const npcScore = scoreNegotiationChat(chat, puzzle);
    const bucket = scoresByFloor.get(floor) ?? [];
    bucket.push(npcScore);
    scoresByFloor.set(floor, bucket);
  }

  const levelMedians = [...scoresByFloor.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, scores]) => median(scores))
    .filter((value): value is number => value != null);

  if (levelMedians.length === 0) return null;

  const overall = median(levelMedians);
  return overall == null ? null : Math.round(overall);
}

async function resolveKeywordsForChats(
  chats: NegotiationChatDocument[],
  game: Pick<GameSaveDocument, "npcPuzzles">,
): Promise<Map<string, string[]>> {
  const byKey = new Map<string, string[]>();
  const roomCache = new Map<string, ReturnType<typeof normalizeRoom> | null>();

  for (const chat of chats) {
    const key = `${chat.roomId}:${chat.npcId}`;
    if (byKey.has(key)) continue;

    let room = roomCache.get(chat.roomId);
    if (!room) {
      const snap = await getFirebaseAdminDb()
        .collection("rooms")
        .doc(chat.roomId)
        .get();
      room = snap.exists
        ? normalizeRoom(snap.data() as Parameters<typeof normalizeRoom>[0])
        : null;
      roomCache.set(chat.roomId, room);
    }

    const roomNpc = room?.npcs.find((npc) => npc.id === chat.npcId);
    const puzzle = game.npcPuzzles?.[chat.roomId]?.[chat.npcId];
    const keywords = resolvePassKeywordsForNpc({
      roomKeywords: parsePassKeywords(roomNpc?.passKeywords),
      puzzleKeywords: parsePassKeywords(puzzle?.passKeywords),
    });
    byKey.set(key, keywords);
  }

  return byKey;
}

export async function loadNegotiationChatsForGame(
  uid: string,
  gameId: string,
): Promise<NegotiationChatDocument[]> {
  const snap = await getFirebaseAdminDb()
    .collection("users")
    .doc(uid)
    .collection("games")
    .doc(gameId)
    .collection("negotiationChats")
    .get();

  return snap.docs
    .map((doc) => normalizeNegotiationChat(doc.data()))
    .filter((chat): chat is NegotiationChatDocument => chat != null);
}

export async function computeGameNegotiationScore(
  uid: string,
  game: GameSaveDocument,
): Promise<number | null> {
  const chats = await loadNegotiationChatsForGame(uid, game.id);
  const keywordsByChatKey = await resolveKeywordsForChats(chats, game);
  return computeNegotiationScoreFromChats(chats, game, keywordsByChatKey);
}
