import { NextResponse } from "next/server";

export interface NegotiateRequest {
  roomId: string;
  npcId: string;
  npcName: string;
  npcPrompt: string;
  message: string;
  history?: Array<{ role: "user" | "npc"; text: string }>;
}

export interface NegotiateResponse {
  passed: boolean;
  reply: string;
}

const PASS_PHRASES = ["deal", "agree", "please let me", "i promise", "thank you"];

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

function buildReply(message: string, passed: boolean, npcName: string): string {
  if (passed) {
    return `${npcName}: Very well. The portal is unlocked — you may pass.`;
  }
  return `${npcName}: Not convinced yet. Try explaining why you should be allowed through.`;
}

async function negotiateWithGemini(
  body: NegotiateRequest,
): Promise<NegotiateResponse | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `${body.npcPrompt}

You are ${body.npcName}, an NPC gatekeeper in a room puzzle game.
The player says: "${body.message}"

Respond in character in 1-3 sentences.
At the very end of your response on its own line write exactly either PASSED or DENIED based on whether you would let them through.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );

  if (!res.ok) return null;
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) return null;

  const passed = /\bPASSED\b/i.test(text);
  const reply = text.replace(/\b(PASSED|DENIED)\b/gi, "").trim();
  return { passed, reply };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NegotiateRequest;
    if (!body.message?.trim() || !body.npcId || !body.roomId) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const gemini = await negotiateWithGemini(body);
    if (gemini) {
      return NextResponse.json(gemini satisfies NegotiateResponse);
    }

    const passed = evaluatePass(body.message, body.npcPrompt ?? "");
    const reply = buildReply(body.message, passed, body.npcName || "NPC");
    return NextResponse.json({ passed, reply } satisfies NegotiateResponse);
  } catch {
    return NextResponse.json({ error: "Negotiation failed" }, { status: 500 });
  }
}
