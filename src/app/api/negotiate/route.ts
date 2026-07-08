import { NextResponse } from "next/server";
import type { GatekeeperStats } from "@/types/room";
import { AdminAuthError, requireUserRequest } from "@/lib/server/admin-auth";
import { ensureRoomNpcPuzzles, getGame } from "@/lib/server/game-saves";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { normalizeRoom, parsePassKeywords } from "@/types/room";
import {
  buildFallbackDenialReply,
  buildGatekeeperSystemPrompt,
  buildHintReply,
  buildKeywordPassReply,
  countUserTurns,
  finalizeNpcReply,
  messagePassesKeywords,
  polishGatekeeperReply,
  recentNpcRepliesFromHistory,
  resolveGatekeeperPassed,
  userRequestsHint,
} from "@/lib/server/gatekeeper-judge";
import {
  buildPlayerMemoryBlock,
  loadNegotiationChat,
  messagesForModel,
  saveNegotiationTurn,
} from "@/lib/server/negotiation-memory";

export interface NegotiateRequest {
  gameId: string;
  roomId: string;
  npcId: string;
  npcName: string;
  npcPrompt: string;
  npcRole?: string;
  npcConversationalStyle?: string;
  npcSignatureQuirks?: string;
  passKeywords?: string;
  passHint?: string;
  npcStats?: Partial<GatekeeperStats>;
  message: string;
  history?: Array<{ role: "user" | "npc"; text: string }>;
  npcWalletAddress?: string;
  bribeAmountSol?: number;
  txSignature?: string;
  playerWallet?: string;
}

export interface NegotiateResponse {
  passed: boolean;
  reply: string;
  bribeVerified?: boolean;
  bribeAmountSol?: number;
}

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

interface ResolvedNegotiationNpc {
  npcPrompt: string;
  passKeywords: string[];
  passHint?: string;
  npcStats?: Partial<GatekeeperStats>;
}

async function resolveNegotiationNpc(
  uid: string,
  gameId: string,
  body: NegotiateRequest,
): Promise<ResolvedNegotiationNpc> {
  const roomSnap = await getFirebaseAdminDb()
    .collection("rooms")
    .doc(body.roomId)
    .get();
  const room = roomSnap.exists
    ? normalizeRoom(roomSnap.data() as Parameters<typeof normalizeRoom>[0])
    : null;

  let game = await getGame(uid, gameId);
  if (room && game) {
    game =
      (await ensureRoomNpcPuzzles(uid, gameId, body.roomId, room)) ?? game;
  }

  const puzzle = game?.npcPuzzles?.[body.roomId]?.[body.npcId];
  return {
    npcPrompt: puzzle?.prompt ?? body.npcPrompt ?? "",
    passKeywords: parsePassKeywords(puzzle?.passKeywords ?? body.passKeywords),
    passHint: puzzle?.passHint ?? body.passHint,
    npcStats: puzzle?.stats ?? body.npcStats,
  };
}

function npcHasBribe(npcWalletAddress?: string, bribeAmountSol?: number): boolean {
  return Boolean(
    npcWalletAddress?.trim() &&
      typeof bribeAmountSol === "number" &&
      bribeAmountSol > 0,
  );
}

function sanitizeHistory(
  history: NegotiateRequest["history"],
): Array<{ role: "user" | "npc"; text: string }> {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (line): line is { role: "user" | "npc"; text: string } =>
        (line.role === "user" || line.role === "npc") &&
        typeof line.text === "string" &&
        line.text.trim().length > 0,
    )
    .slice(-12);
}

function buildBribeInstructions(
  npcWalletAddress: string,
  bribeAmountSol: number,
  paymentVerified: boolean,
  verifiedAmountSol?: number,
): string {
  const lines = [
    `Accepts bribes: at least ${bribeAmountSol} SOL to wallet ${npcWalletAddress}.`,
    "May negotiate price down only if the player is exceptionally persuasive — never below half the listed amount.",
    "passed=true when verified payment meets terms OR persuasion fully satisfies disposition after required exchanges.",
  ];

  if (paymentVerified) {
    lines.push(
      `VERIFIED payment of ${verifiedAmountSol?.toFixed(4) ?? bribeAmountSol} SOL received. Acknowledge in character; passed may be true.`,
    );
  } else {
    lines.push(
      "If they offer to pay but have not paid, direct them to the Pay bribe button. Payment alone without verification does not pass.",
    );
  }

  return lines.join("\n");
}

function buildGeminiContents(
  body: NegotiateRequest,
  resolved: ResolvedNegotiationNpc,
  paymentVerified: boolean,
  verifiedAmountSol: number | undefined,
  storedHistory: Array<{ role: "user" | "npc"; text: string }>,
  memoryBlock: string,
) {
  const hasBribe = npcHasBribe(body.npcWalletAddress, body.bribeAmountSol);
  const bribeBlock =
    hasBribe && body.npcWalletAddress && body.bribeAmountSol
      ? buildBribeInstructions(
          body.npcWalletAddress,
          body.bribeAmountSol,
          paymentVerified,
          verifiedAmountSol,
        )
      : undefined;

  const system = buildGatekeeperSystemPrompt({
    npcName: body.npcName,
    npcPrompt: resolved.npcPrompt,
    npcRole: body.npcRole,
    npcConversationalStyle: body.npcConversationalStyle,
    npcSignatureQuirks: body.npcSignatureQuirks,
    passKeywords: resolved.passKeywords,
    passHint: resolved.passHint,
    npcStats: resolved.npcStats,
    userTurnCount: countUserTurns(storedHistory) + 1,
    paymentVerified,
    recentNpcReplies: recentNpcRepliesFromHistory(storedHistory),
    bribeBlock,
    memoryBlock,
  });

  const styleNote = body.npcConversationalStyle?.trim()
    ? ` My conversational style is: ${body.npcConversationalStyle.trim()}.`
    : "";
  const quirksNote = body.npcSignatureQuirks?.trim()
    ? ` My quirks: ${body.npcSignatureQuirks.trim()}.`
    : "";

  const contents: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }> = [
    { role: "user", parts: [{ text: system }] },
    {
      role: "model",
      parts: [
        {
          text: `Understood. I am ${body.npcName}. ${body.npcRole?.trim() || "I guard this portal."}${styleNote}${quirksNote} I'll stay fully in this voice every turn, give a fresh clue each time, and only pass when the player has earned it.`,
        },
      ],
    },
  ];

  const history =
    storedHistory.length > 0 ? storedHistory : sanitizeHistory(body.history);

  for (const line of history) {
    contents.push({
      role: line.role === "user" ? "user" : "model",
      parts: [{ text: line.text }],
    });
  }

  contents.push({ role: "user", parts: [{ text: body.message }] });
  return contents;
}

function parseGeminiReply(raw: string): NegotiateResponse | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as { reply?: string; passed?: boolean };
    const reply = parsed.reply?.trim();
    if (reply && reply.length > 2 && !/^here is the json/i.test(reply)) {
      return { passed: Boolean(parsed.passed), reply };
    }
  } catch {
    // fall through to text parsing
  }

  const passed = /\bPASSED\b/i.test(trimmed);
  const reply = trimmed.replace(/\b(PASSED|DENIED)\b/gi, "").trim();
  if (reply.length > 2) {
    return { passed, reply };
  }

  return null;
}

async function negotiateWithGemini(
  body: NegotiateRequest,
  resolved: ResolvedNegotiationNpc,
  paymentVerified: boolean,
  verifiedAmountSol: number | undefined,
  storedHistory: Array<{ role: "user" | "npc"; text: string }>,
  memoryBlock: string,
): Promise<NegotiateResponse | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: buildGeminiContents(
            body,
            resolved,
            paymentVerified,
            verifiedAmountSol,
            storedHistory,
            memoryBlock,
          ),
          generationConfig: {
            temperature: 0.74,
            frequencyPenalty: 0.75,
            maxOutputTokens: 320,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                reply: { type: "string" },
                passed: { type: "boolean" },
              },
              required: ["reply", "passed"],
            },
          },
        }),
      },
    );

    if (!res.ok) {
      if (process.env.NODE_ENV === "development") {
        const err = await res.text();
        console.warn(
          `[negotiate] Gemini ${model} failed (${res.status}):`,
          err.slice(0, 400),
        );
      }
      return null;
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!raw) return null;

    return parseGeminiReply(raw);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[negotiate] Gemini request error:", error);
    }
    return null;
  }
}

function finalizeResult(
  raw: NegotiateResponse,
  judgeCtx: Parameters<typeof resolveGatekeeperPassed>[1],
): NegotiateResponse {
  const keywords = judgeCtx.passKeywords ?? [];
  const reply = finalizeNpcReply(raw.reply, keywords);
  const passed = resolveGatekeeperPassed(raw.passed, judgeCtx);
  if (passed) {
    return {
      ...raw,
      reply,
      passed: true,
      bribeVerified: judgeCtx.paymentVerified || undefined,
    };
  }

  if (raw.passed && !passed) {
    return {
      passed: false,
      reply,
    };
  }

  return { ...raw, reply, passed: false };
}

export async function POST(request: Request) {
  let uid: string;
  try {
    ({ uid } = await requireUserRequest(request));
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: NegotiateRequest;
  try {
    body = (await request.json()) as NegotiateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.message?.trim() || !body.npcId || !body.roomId || !body.gameId?.trim()) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const gameId = body.gameId.trim();
  const userMessage = body.message.trim();
  const resolved = await resolveNegotiationNpc(uid, gameId, body);
  const passKeywords = resolved.passKeywords;
  const storedChat = await loadNegotiationChat(uid, gameId, body.roomId, body.npcId);
  const storedHistory = messagesForModel(storedChat);
  const memoryBlock = buildPlayerMemoryBlock(storedChat);
  const userTurnCount = countUserTurns(storedHistory) + 1;
  const recentNpcReplies = recentNpcRepliesFromHistory(storedHistory);

  let paymentVerified = false;
  let verifiedAmountSol: number | undefined;

  const hasBribe = npcHasBribe(body.npcWalletAddress, body.bribeAmountSol);
  if (
    hasBribe &&
    body.txSignature?.trim() &&
    body.playerWallet?.trim() &&
    body.npcWalletAddress &&
    body.bribeAmountSol
  ) {
    const { verifyBribeTransaction } = await import("@/lib/solana/verify-bribe");
    const verification = await verifyBribeTransaction(
      body.txSignature.trim(),
      body.playerWallet.trim(),
      body.npcWalletAddress.trim(),
      body.bribeAmountSol,
    );
    if (verification.verified) {
      paymentVerified = true;
      verifiedAmountSol = verification.amountSol;
    }
  }

  const judgeCtx = {
    npcName: body.npcName,
    npcPrompt: resolved.npcPrompt,
    npcRole: body.npcRole,
    npcConversationalStyle: body.npcConversationalStyle,
    npcSignatureQuirks: body.npcSignatureQuirks,
    passKeywords,
    passHint: resolved.passHint,
    npcStats: resolved.npcStats,
    userTurnCount,
    paymentVerified,
    recentNpcReplies,
  };

  const saveAndRespond = async (result: NegotiateResponse) => {
    try {
      await saveNegotiationTurn(uid, gameId, {
        roomId: body.roomId,
        npcId: body.npcId,
        npcName: body.npcName,
        userMessage,
        npcReply: result.reply,
        passed: result.passed,
      });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[negotiate] Failed to save chat memory:", error);
      }
    }
    return NextResponse.json(result satisfies NegotiateResponse);
  };

  if (paymentVerified) {
    return saveAndRespond({
      passed: true,
      reply: polishGatekeeperReply(
        "Payment received. The portal is unlocked. You may pass.",
      ),
      bribeVerified: true,
      bribeAmountSol: verifiedAmountSol,
    });
  }

  if (
    passKeywords.length > 0 &&
    messagePassesKeywords(userMessage, passKeywords)
  ) {
    return saveAndRespond({
      passed: true,
      reply: buildKeywordPassReply(judgeCtx),
    });
  }

  if (userRequestsHint(userMessage)) {
    return saveAndRespond({
      passed: false,
      reply: buildHintReply(judgeCtx),
    });
  }

  const gemini = await negotiateWithGemini(
    body,
    resolved,
    paymentVerified,
    verifiedAmountSol,
    storedHistory,
    memoryBlock,
  );

  const result = gemini
    ? finalizeResult(
        {
          passed: gemini.passed || paymentVerified,
          reply: gemini.reply,
          bribeVerified: paymentVerified || undefined,
          bribeAmountSol: paymentVerified ? verifiedAmountSol : undefined,
        },
        judgeCtx,
      )
    : {
        passed: paymentVerified,
        reply: paymentVerified
          ? polishGatekeeperReply(
              "Payment received. The portal is unlocked. You may pass.",
            )
          : finalizeNpcReply(buildFallbackDenialReply(judgeCtx), passKeywords),
        bribeVerified: paymentVerified || undefined,
        bribeAmountSol: paymentVerified ? verifiedAmountSol : undefined,
      };

  return saveAndRespond(result);
}
