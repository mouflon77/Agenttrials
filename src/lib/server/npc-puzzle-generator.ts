import type { GeneratedNpcPuzzle } from "@/types/game";
import { parseRoomFloor } from "@/types/game";
import {
  DEFAULT_GATEKEEPER_QUIRKS,
  DEFAULT_GATEKEEPER_ROLE,
  DEFAULT_GATEKEEPER_STYLE,
  clampGatekeeperStat,
  normalizeGatekeeperStats,
  type GatekeeperStats,
  type NpcItem,
} from "@/types/room";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

const KEYWORD_POOLS = [
  "honesty",
  "patience",
  "respect",
  "trust",
  "clarity",
  "focus",
  "courage",
  "loyalty",
  "humility",
  "understanding",
  "empathy",
  "discipline",
  "curiosity",
  "gratitude",
  "integrity",
  "resolve",
  "listening",
  "sincerity",
  "dedication",
  "wisdom",
  "fairness",
  "commitment",
  "restraint",
  "compassion",
  "precision",
  "steadfast",
  "earnest",
  "vigilance",
  "reverence",
  "fortitude",
] as const;

export interface NpcPuzzleSeed {
  roomId: string;
  floor: number;
  npc: Pick<
    NpcItem,
    "id" | "name" | "role" | "conversationalStyle" | "signatureQuirks"
  >;
  gameSeed: string;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function uniqueKeywords(seed: string, count: number): string[] {
  const shuffled = [...KEYWORD_POOLS].sort(
    (a, b) =>
      hashString(`${seed}:kw:${a}`) - hashString(`${seed}:kw:${b}`),
  );
  return shuffled.slice(0, Math.max(2, Math.min(4, count)));
}

export function statRangeForFloor(floor: number): { min: number; max: number } {
  const f = Math.max(1, floor);
  return {
    min: Math.min(80, 10 + (f - 1) * 6),
    max: Math.min(95, 24 + (f - 1) * 8),
  };
}

function randomStat(seed: string, key: string, floor: number): number {
  const { min, max } = statRangeForFloor(floor);
  const span = Math.max(1, max - min);
  const h = hashString(`${seed}:stat:${key}`);
  return min + (h % (span + 1));
}

export function generateFallbackNpcPuzzle(
  input: NpcPuzzleSeed,
): GeneratedNpcPuzzle {
  const seed = `${input.gameSeed}:${input.roomId}:${input.npc.id}`;
  const role = input.npc.role?.trim() || DEFAULT_GATEKEEPER_ROLE;
  const style =
    input.npc.conversationalStyle?.trim() || DEFAULT_GATEKEEPER_STYLE;
  const keywords = uniqueKeywords(seed, 2 + (input.floor % 2));
  const keywordPhrase = keywords.join(" and ");

  const stats: GatekeeperStats = {
    egoArmor: randomStat(seed, "egoArmor", input.floor),
    volatility: randomStat(seed, "volatility", input.floor),
    controlNeed: randomStat(seed, "controlNeed", input.floor),
    informationLock: randomStat(seed, "informationLock", input.floor),
    thatsRightThreshold: randomStat(seed, "thatsRightThreshold", input.floor),
  };

  return {
    prompt: `You guard this floor as ${role}. Your style is ${style}. Before opening the portal, the player must convince you they genuinely embody ${keywordPhrase} in how they approach you. You are not cruel, but floor ${input.floor} has made you harder to sway.`,
    passKeywords: keywords.join(", "),
    passHint: `Talk to me in a way that shows real ${keywords[0]} and ${keywords[1] ?? "sincerity"}. Mean it in your own words. Do not flatter or rush me.`,
    stats: normalizeGatekeeperStats(stats),
  };
}

interface GeminiPuzzleRow {
  roomId?: string;
  npcId?: string;
  disposition?: string;
  passKeywords?: string[];
  passHint?: string;
  stats?: Partial<GatekeeperStats>;
}

function normalizeGeminiPuzzleRow(
  row: GeminiPuzzleRow,
  input: NpcPuzzleSeed,
): GeneratedNpcPuzzle | null {
  const disposition = row.disposition?.trim();
  const keywords = Array.isArray(row.passKeywords)
    ? [
        ...new Set(
          row.passKeywords
            .map((k) => String(k).trim().toLowerCase())
            .filter((k) => k.length >= 3 && k.length <= 24),
        ),
      ].slice(0, 4)
    : [];
  const passHint = row.passHint?.trim();
  if (!disposition || keywords.length < 2 || !passHint) return null;

  const { min, max } = statRangeForFloor(input.floor);
  const stats = normalizeGatekeeperStats({
    egoArmor: clampGatekeeperStat(
      row.stats?.egoArmor,
      randomStat(`${input.gameSeed}:g`, "egoArmor", input.floor),
    ),
    volatility: clampGatekeeperStat(
      row.stats?.volatility,
      randomStat(`${input.gameSeed}:g`, "volatility", input.floor),
    ),
    controlNeed: clampGatekeeperStat(
      row.stats?.controlNeed,
      randomStat(`${input.gameSeed}:g`, "controlNeed", input.floor),
    ),
    informationLock: clampGatekeeperStat(
      row.stats?.informationLock,
      randomStat(`${input.gameSeed}:g`, "informationLock", input.floor),
    ),
    thatsRightThreshold: clampGatekeeperStat(
      row.stats?.thatsRightThreshold,
      randomStat(`${input.gameSeed}:g`, "thatsRightThreshold", input.floor),
    ),
  });

  for (const key of Object.keys(stats) as Array<keyof GatekeeperStats>) {
    if (stats[key] < min) stats[key] = min;
    if (stats[key] > max) stats[key] = max;
  }

  return {
    prompt: disposition.slice(0, 1200),
    passKeywords: keywords.join(", "),
    passHint: passHint.slice(0, 600),
    stats,
  };
}

function buildBatchPrompt(entries: NpcPuzzleSeed[]): string {
  const npcBlocks = entries
    .map((entry) => {
      const npc = entry.npc;
      const { min, max } = statRangeForFloor(entry.floor);
      return `### ${entry.roomId} / ${npc.id}
- Floor: ${entry.floor} (higher = harder negotiation)
- Name: ${npc.name}
- Role: ${npc.role?.trim() || DEFAULT_GATEKEEPER_ROLE}
- Style: ${npc.conversationalStyle?.trim() || DEFAULT_GATEKEEPER_STYLE}
- Quirks: ${npc.signatureQuirks?.trim() || DEFAULT_GATEKEEPER_QUIRKS}
- Stat range for this floor: each stat ${min}-${max}`;
    })
    .join("\n\n");

  return `You design portal-gate puzzles for a narrative game. For each NPC below, create a UNIQUE puzzle for this new playthrough.

Rules:
- disposition: 2-4 sentences. What emotional/logical conditions must the player satisfy? Must fit the NPC's role, style, and quirks.
- passKeywords: exactly 2 or 3 lowercase single words (no phrases). Random and varied each run, but thematically tied to the character. Never generic filler like "please" or "help".
- passHint: 1-3 sentences telling the player what attitude/themes to show WITHOUT saying the passKeywords verbatim.
- stats: integers; use the listed range for each NPC's floor. Higher floors = tougher.

Return JSON only:
{
  "puzzles": [
    {
      "roomId": "...",
      "npcId": "...",
      "disposition": "...",
      "passKeywords": ["word1", "word2"],
      "passHint": "...",
      "stats": {
        "egoArmor": 0,
        "volatility": 0,
        "controlNeed": 0,
        "informationLock": 0,
        "thatsRightThreshold": 0
      }
    }
  ]
}

NPCs:
${npcBlocks}`;
}

async function generatePuzzlesWithGemini(
  entries: NpcPuzzleSeed[],
): Promise<Map<string, GeneratedNpcPuzzle>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || entries.length === 0) return new Map();

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: buildBatchPrompt(entries) }] },
          ],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                puzzles: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      roomId: { type: "string" },
                      npcId: { type: "string" },
                      disposition: { type: "string" },
                      passKeywords: {
                        type: "array",
                        items: { type: "string" },
                      },
                      passHint: { type: "string" },
                      stats: {
                        type: "object",
                        properties: {
                          egoArmor: { type: "number" },
                          volatility: { type: "number" },
                          controlNeed: { type: "number" },
                          informationLock: { type: "number" },
                          thatsRightThreshold: { type: "number" },
                        },
                      },
                    },
                    required: [
                      "roomId",
                      "npcId",
                      "disposition",
                      "passKeywords",
                      "passHint",
                      "stats",
                    ],
                  },
                },
              },
              required: ["puzzles"],
            },
          },
        }),
      },
    );

    if (!res.ok) return new Map();

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!raw) return new Map();

    const parsed = JSON.parse(raw) as { puzzles?: GeminiPuzzleRow[] };
    const byKey = new Map<string, GeneratedNpcPuzzle>();
    const entryByKey = new Map<string, NpcPuzzleSeed>(
      entries.map((e) => [`${e.roomId}:${e.npc.id}`, e]),
    );

    for (const row of parsed.puzzles ?? []) {
      const key = `${row.roomId}:${row.npcId}`;
      const entry = entryByKey.get(key);
      if (!entry) continue;
      const puzzle = normalizeGeminiPuzzleRow(row, entry);
      if (puzzle) byKey.set(key, puzzle);
    }
    return byKey;
  } catch {
    return new Map();
  }
}

export async function generateNpcPuzzles(
  entries: NpcPuzzleSeed[],
): Promise<Record<string, Record<string, GeneratedNpcPuzzle>>> {
  const geminiResults = await generatePuzzlesWithGemini(entries);
  const out: Record<string, Record<string, GeneratedNpcPuzzle>> = {};

  for (const entry of entries) {
    const key = `${entry.roomId}:${entry.npc.id}`;
    const puzzle =
      geminiResults.get(key) ?? generateFallbackNpcPuzzle(entry);
    if (!out[entry.roomId]) out[entry.roomId] = {};
    out[entry.roomId]![entry.npc.id] = puzzle;
  }

  return out;
}

export function puzzlesFromRooms(
  rooms: Map<string, { npcs: NpcItem[] }>,
  gameSeed: string,
): NpcPuzzleSeed[] {
  const entries: NpcPuzzleSeed[] = [];
  for (const [roomId, room] of rooms) {
    const floor = parseRoomFloor(roomId);
    for (const npc of room.npcs) {
      entries.push({
        roomId,
        floor,
        npc: {
          id: npc.id,
          name: npc.name,
          role: npc.role,
          conversationalStyle: npc.conversationalStyle,
          signatureQuirks: npc.signatureQuirks,
        },
        gameSeed,
      });
    }
  }
  return entries;
}
