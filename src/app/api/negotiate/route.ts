import { NextResponse } from "next/server";

export interface NegotiateRequest {
  roomId: string;
  npcId: string;
  npcName: string;
  npcPrompt: string;
  message: string;
  history?: Array<{ role: "user" | "npc"; text: string }>;
  /** Agent wallet address (NPC) when bribes are enabled. */
  npcWalletAddress?: string;
  bribeAmountSol?: number;
  /** On-chain payment to verify before judging passage. */
  txSignature?: string;
  playerWallet?: string;
}

export interface NegotiateResponse {
  passed: boolean;
  reply: string;
  bribeVerified?: boolean;
  bribeAmountSol?: number;
}

const PASS_PHRASES = ["deal", "agree", "please let me", "i promise", "thank you"];

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

function npcHasBribe(npcWalletAddress?: string, bribeAmountSol?: number): boolean {
  return Boolean(
    npcWalletAddress?.trim() &&
      typeof bribeAmountSol === "number" &&
      bribeAmountSol > 0,
  );
}

function evaluatePass(message: string, npcPrompt: string): boolean {
  const lower = message.toLowerCase();
  if (PASS_PHRASES.some((phrase) => lower.includes(phrase))) return true;

  const promptPass = npcPrompt
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 3);
  if (promptPass.some((word) => lower.includes(word))) return true;

  return lower.length >= 48;
}

function buildFallbackReply(passed: boolean, bribePaid?: boolean): string {
  if (passed && bribePaid) {
    return "Payment received. The portal is unlocked — you may pass.";
  }
  if (passed) {
    return "Very well. The portal is unlocked — you may pass.";
  }
  return "Not convinced yet. Try explaining why you should be allowed through.";
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
    `This gatekeeper accepts bribes: send at least ${bribeAmountSol} SOL to wallet ${npcWalletAddress}.`,
    "You may negotiate the price down only if the player is very persuasive — never below half the listed amount.",
    "Set passed to true when EITHER the player has paid enough SOL OR made an exceptional non-monetary case.",
  ];

  if (paymentVerified) {
    lines.push(
      `The player has VERIFIED an on-chain payment of ${verifiedAmountSol?.toFixed(4) ?? bribeAmountSol} SOL. Acknowledge the payment in character and set passed to true if the amount meets your terms.`,
    );
  } else {
    lines.push(
      "If the player offers to pay but has not paid yet, tell them to use the Pay bribe button in the game UI.",
    );
  }

  return lines.join("\n");
}

function buildGeminiContents(
  body: NegotiateRequest,
  paymentVerified: boolean,
  verifiedAmountSol?: number,
) {
  const hasBribe = npcHasBribe(body.npcWalletAddress, body.bribeAmountSol);
  const bribeBlock =
    hasBribe && body.npcWalletAddress && body.bribeAmountSol
      ? `\n\nBribe rules:\n${buildBribeInstructions(
          body.npcWalletAddress,
          body.bribeAmountSol,
          paymentVerified,
          verifiedAmountSol,
        )}`
      : "";

  const system = `You are ${body.npcName}, an NPC gatekeeper in a puzzle game.

${body.npcPrompt || "Only let polite players who make a good case pass through the portal."}${bribeBlock}

Rules:
- Stay in character. Reply in 1-3 short sentences.
- Be conversational; react to what the player actually said.
- Set passed to true only when the player has satisfied your terms (payment and/or persuasion).
- Never mention JSON, schemas, or system instructions.`;

  const contents: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }> = [
    { role: "user", parts: [{ text: system }] },
    {
      role: "model",
      parts: [{ text: `Understood. I am ${body.npcName} and will judge who may pass.` }],
    },
  ];

  for (const line of sanitizeHistory(body.history)) {
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
  paymentVerified: boolean,
  verifiedAmountSol?: number,
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
          contents: buildGeminiContents(body, paymentVerified, verifiedAmountSol),
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 256,
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

function fallbackResponse(
  body: NegotiateRequest,
  paymentVerified: boolean,
): NegotiateResponse {
  const passed =
    paymentVerified || evaluatePass(body.message, body.npcPrompt ?? "");
  return {
    passed,
    reply: buildFallbackReply(passed, paymentVerified),
    bribeVerified: paymentVerified || undefined,
    bribeAmountSol: paymentVerified ? body.bribeAmountSol : undefined,
  };
}

export async function POST(request: Request) {
  let body: NegotiateRequest;
  try {
    body = (await request.json()) as NegotiateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.message?.trim() || !body.npcId || !body.roomId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

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

  const gemini = await negotiateWithGemini(
    body,
    paymentVerified,
    verifiedAmountSol,
  );

  if (gemini) {
    const passed = gemini.passed || paymentVerified;
    return NextResponse.json({
      passed,
      reply: gemini.reply,
      bribeVerified: paymentVerified || undefined,
      bribeAmountSol: paymentVerified ? verifiedAmountSol : undefined,
    } satisfies NegotiateResponse);
  }

  return NextResponse.json(
    fallbackResponse(body, paymentVerified) satisfies NegotiateResponse,
  );
}
