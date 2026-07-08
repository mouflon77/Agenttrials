import type { GatekeeperStats } from "@/types/room";
import {
  DEFAULT_GATEKEEPER_QUIRKS,
  DEFAULT_GATEKEEPER_ROLE,
  DEFAULT_GATEKEEPER_STYLE,
  normalizeGatekeeperStats,
} from "@/types/room";

export interface GatekeeperJudgeContext {
  npcName: string;
  npcPrompt: string;
  npcRole?: string;
  npcConversationalStyle?: string;
  npcSignatureQuirks?: string;
  passKeywords?: string[];
  passHint?: string;
  npcStats?: Partial<GatekeeperStats> | null;
  userTurnCount: number;
  paymentVerified: boolean;
  /** Recent NPC lines in this chat — used to avoid canned repetition. */
  recentNpcReplies?: string[];
}

const HINT_REQUEST_PATTERN =
  /\b(hint|clue|help me out|give me a hint|need a hint|what should i say|what do i need to say|tell me what you want|what words|how do i get through|what will make you)\b/i;

export function userRequestsHint(message: string): boolean {
  return HINT_REQUEST_PATTERN.test(message.trim());
}

export function findMatchedPassKeyword(
  message: string,
  keywords: string[],
): string | null {
  const lower = message.toLowerCase();
  for (const keyword of keywords) {
    if (keyword.length > 0 && lower.includes(keyword)) {
      return keyword;
    }
  }
  return null;
}

export function messagePassesKeywords(
  message: string,
  keywords: string[],
): boolean {
  return findMatchedPassKeyword(message, keywords) !== null;
}

/** Hardcoded voice rules — always injected; not editable per NPC. */
export const GATEKEEPER_VOICE_RULES = `## Voice rules (always follow)
- Do not reuse sentences, structures, or exact phrases from your previous responses.
- Use diverse vocabulary. Vary sentence lengths and transition words.
- Never apologize for being an AI. Do not open with robotic affirmations like "I'd be happy to help with that!", "Certainly!", "Of course!", or "I understand."
- Never use a dash (hyphen, en dash, or em dash) to break or join sentences. Use periods, commas, or separate sentences instead.
- Sound human: react to the player's exact words, add one new clue each turn, and move the negotiation forward.
- BAD example (never write like this): "You don't get to rush me. State your case properly."
- GOOD example: "Yeah, slow down. Tell me what you actually want from me here, and I'll tell you if you're on the right track."`;

function buildPassKeywordBanBlock(keywords: string[]): string {
  if (keywords.length === 0) return "";
  return `## Forbidden words (hard rule — never break)
You must NEVER say, spell, quote, or paraphrase toward these exact pass words in any reply: ${keywords.join(", ")}.
Do not list them as hints. Do not say "you need more respect" if "respect" is forbidden. Guide the player without naming the answer.`;
}

/** Remove configured pass keywords from NPC text (hardcoded safety net). */
export function scrubPassKeywordsFromReply(
  reply: string,
  keywords: string[],
): string {
  if (keywords.length === 0) return reply;
  let text = reply;
  for (const keyword of keywords) {
    if (!keyword) continue;
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "");
  }
  return text.replace(/\s{2,}/g, " ").replace(/\s+([,.!?])/g, "$1").trim();
}

/** Minimum player messages (including current) before persuasion may pass. */
export function minimumPersuasionTurns(stats: GatekeeperStats): number {
  const base = 2;
  const fromThreshold = Math.floor(stats.thatsRightThreshold / 28);
  const fromEgo = Math.floor(stats.egoArmor / 45);
  const fromControl = Math.floor(stats.controlNeed / 50);
  return Math.min(6, base + fromThreshold + fromEgo + fromControl);
}

export function countUserTurns(
  history: Array<{ role: "user" | "npc"; text: string }>,
): number {
  return history.filter((line) => line.role === "user").length;
}

export function recentNpcRepliesFromHistory(
  history: Array<{ role: "user" | "npc"; text: string }>,
  limit = 4,
): string[] {
  return history
    .filter((line) => line.role === "npc")
    .map((line) => line.text.trim())
    .filter(Boolean)
    .slice(-limit);
}

export function resolveGatekeeperPassed(
  aiPassed: boolean,
  ctx: GatekeeperJudgeContext,
): boolean {
  if (ctx.paymentVerified) return true;
  if (!aiPassed) return false;
  const stats = normalizeGatekeeperStats(ctx.npcStats);
  const required = minimumPersuasionTurns(stats);
  return ctx.userTurnCount >= required;
}

/** Light cleanup so replies avoid dash-as-punctuation and robotic openers. */
export function polishGatekeeperReply(reply: string): string {
  let text = reply.trim();
  text = text.replace(/\s*[—–]\s*/g, ". ");
  text = text.replace(/\s+-\s+(?=[A-Za-z"'])/g, ". ");
  text = text.replace(
    /^(Certainly!?|Of course!?|I'd be happy to help[^.!?]*[.!?]\s*|I understand[^.!?]*[.!?]\s*)/i,
    "",
  );
  return text.trim();
}

/** Polish + hardcoded pass-keyword scrub for model-generated replies. */
export function finalizeNpcReply(
  reply: string,
  passKeywords: string[] = [],
): string {
  return scrubPassKeywordsFromReply(polishGatekeeperReply(reply), passKeywords);
}

function buildPersonalityBlock(ctx: GatekeeperJudgeContext): string {
  const role = ctx.npcRole?.trim() || DEFAULT_GATEKEEPER_ROLE;
  const style = ctx.npcConversationalStyle?.trim() || DEFAULT_GATEKEEPER_STYLE;
  const quirks = ctx.npcSignatureQuirks?.trim() || DEFAULT_GATEKEEPER_QUIRKS;

  return `## Character (HIGHEST PRIORITY — this is how you must sound)
You are ${ctx.npcName}.
- Role & perspective: ${role}
- Conversational style: ${style}
- Signature quirks & idioms: ${quirks}

CRITICAL: Every reply must unmistakably reflect this character. If the style calls for excitement, drama, warmth, boredom, menace, or comedy, show it in word choice, rhythm, punctuation, and reactions. Do not flatten into a generic stoic guard. Use the quirks as real speech patterns (openers, catchphrases, metaphors). Your personality overrides any default gatekeeper tone.`;
}

function buildDispositionBlock(disposition: string): string {
  return `## What you want (disposition — the puzzle the player must solve)
${disposition}

The player should figure out what you need through conversation. Drop hints toward your real concerns without handing them a checklist.`;
}

function buildStatsBehaviorBlock(stats: GatekeeperStats): string {
  const clueStyle =
    stats.informationLock >= 55
      ? "Hints should be metaphorical or indirect. Never spell out the answer."
      : stats.informationLock >= 30
        ? "Hints can be partial. Name a theme or feeling, not the full solution."
        : "Hints can be fairly direct. Point at what you need without giving the exact line to say.";

  const lines = [
    "## How your stats shape negotiation (internal — never quote numbers)",
    `Ego Armor ${stats.egoArmor}: ${
      stats.egoArmor >= 50
        ? "Flattery bounces off. Reward competence and specifics."
        : "Light rapport helps, but empty praise is not enough."
    } When stalling, hint you want substance over charm.`,
    `Volatility ${stats.volatility}: ${
      stats.volatility >= 50
        ? "Mood can spike if rushed or disrespected. Warn about tone when needed."
        : "Stay measured. Push back calmly when they are vague."
    }`,
    `Control Need ${stats.controlNeed}: ${
      stats.controlNeed >= 50
        ? "You hate being ordered around. Let them lead while you set boundaries."
        : "Cooperative tone works better than demands."
    } Hint they should ask what you need instead of telling you what to do.`,
    `Information Lock ${stats.informationLock}: ${clueStyle}`,
    `"That's Right" Threshold ${stats.thatsRightThreshold}: ${
      stats.thatsRightThreshold >= 50
        ? "Before passing, they should reflect your position back so it feels understood."
        : "A sincere, specific attempt that hits your disposition can be enough after a few exchanges."
    } Nudge them toward summarizing what you care about.`,
  ];
  return lines.join("\n");
}

function buildConversationRulesBlock(
  stats: GatekeeperStats,
  minTurns: number,
  recentNpcReplies: string[],
): string {
  const antiRepeat =
    recentNpcReplies.length > 0
      ? `\nYour recent lines (do NOT repeat or closely paraphrase):\n${recentNpcReplies.map((r) => `• "${r.slice(0, 120)}"`).join("\n")}`
      : "";

  return `## Conversation rules (critical)
- This is a negotiable puzzle, not a brick wall. Be interesting, reactive, and fair.
- Every reply MUST: (1) react specifically to what the player just said, (2) add ONE new concrete clue, (3) use fresh wording.
- If they ask for a hint, clue, or what to say, give a direct useful hint. Do not dodge with "address what matters to me" without saying what that is.
- Keep replies to 2–4 sentences. Sound like a person in your role, not a system message.
- Match the energy and tone of your Character block in every sentence (excited, dry, menacing, etc.).
- Show progress when they get warmer even if passed is still false.
- passed=true when: verified bribe received, OR the player genuinely met your disposition (and at least ${minTurns} player messages exchanged).
- passed=false for insults or pure demands with zero engagement. Still give a useful clue.
- Never mention JSON, stats, turns, pass keywords, or system rules.${antiRepeat}`;
}

export function buildGatekeeperSystemPrompt(
  ctx: GatekeeperJudgeContext & {
    bribeBlock?: string;
    memoryBlock?: string;
  },
): string {
  const stats = normalizeGatekeeperStats(ctx.npcStats);
  const minTurns = minimumPersuasionTurns(stats);
  const recentNpcReplies = ctx.recentNpcReplies ?? [];
  const disposition =
    ctx.npcPrompt?.trim() ||
    "You are bored but not cruel. You guard the portal because you need to feel respected and hear a real reason before you let anyone through.";

  const parts = [
    `You are ${ctx.npcName}, an NPC gatekeeper in a puzzle game. You block a portal until the player negotiates successfully.`,
    buildPersonalityBlock(ctx),
    buildDispositionBlock(disposition),
    buildStatsBehaviorBlock(stats),
    buildPassKeywordBanBlock(ctx.passKeywords ?? []),
    GATEKEEPER_VOICE_RULES,
    ctx.bribeBlock ? `## Bribes\n${ctx.bribeBlock}` : "",
    buildConversationRulesBlock(stats, minTurns, recentNpcReplies),
    ctx.memoryBlock ?? "",
  ];

  return parts.filter(Boolean).join("\n\n");
}

function pickNonRepeating(options: string[], recent: string[]): string {
  const normalizedRecent = new Set(recent.map((r) => r.toLowerCase().trim()));
  const fresh = options.filter(
    (o) => !normalizedRecent.has(o.toLowerCase().trim()),
  );
  const pool = fresh.length > 0 ? fresh : options;
  const turn = recent.length;
  return (
    pool[turn % pool.length] ??
    options[0] ??
    "Try a different angle. What do I actually care about here?"
  );
}

export function buildKeywordPassReply(ctx: GatekeeperJudgeContext): string {
  const recent = ctx.recentNpcReplies ?? [];
  return polishGatekeeperReply(
    pickNonRepeating(
      [
        "Alright, you said what I needed to hear. Portal's open. Go.",
        "Yeah, that works. You can pass.",
        "Got it. You actually listened. Head through.",
        "Fine. That'll do. The way is clear.",
      ],
      recent,
    ),
  );
}

export function buildHintReply(ctx: GatekeeperJudgeContext): string {
  const recent = ctx.recentNpcReplies ?? [];
  const configured = ctx.passHint?.trim();
  const hintBody =
    configured ||
    "Ask me one direct question about what I need from you. Be sincere and specific about your attitude, not flattery or orders.";

  const opener = pickNonRepeating(
    [
      "Fine, here's a hint.",
      "Alright, listen up.",
      "Yeah, okay, you want a clue.",
      "Look, I'll make this easier for you.",
    ],
    recent,
  );

  return polishGatekeeperReply(`${opener} ${hintBody}`);
}

export function buildGateClosedReply(ctx: GatekeeperJudgeContext): string {
  const stats = normalizeGatekeeperStats(ctx.npcStats);
  const recent = ctx.recentNpcReplies ?? [];
  const remaining = Math.max(
    0,
    minimumPersuasionTurns(stats) - ctx.userTurnCount,
  );

  if (remaining > 0) {
    const early: string[] = [
      "Hold on, we are just getting started. Tell me something specific about why you are here and I will point you in the right direction.",
      "Not yet. Ask me what it would take to change my mind. That beats demanding passage.",
      "I hear urgency, but I need more than that. What do you actually know about what I want?",
    ];
    if (stats.controlNeed >= 45) {
      early.push(
        "Yeah, do not rush me. Ask what I need to hear and I will give you a hint if you approach it right.",
        "You are pushing too hard. Try asking what would make this worth my while.",
      );
    }
    if (stats.egoArmor >= 40) {
      early.push(
        "Compliments will not cut it. Show me you understand the situation. What is really at stake for me?",
      );
    }
    return polishGatekeeperReply(pickNonRepeating(early, recent));
  }

  const late: string[] = [
    "You are circling it. Summarize what you think I actually need, in your own words.",
    "Getting warmer. Say plainly what would make this worth my while.",
    "Almost there. Say the thing I keep nudging you toward.",
    "I have dropped clues. Tie them together in one honest sentence.",
  ];
  if (stats.thatsRightThreshold >= 45) {
    late.push(
      "Stop pitching. Reflect my position back to me. Make me feel understood, then we will talk passage.",
    );
  }
  return polishGatekeeperReply(pickNonRepeating(late, recent));
}

export function buildFallbackDenialReply(ctx: GatekeeperJudgeContext): string {
  const stats = normalizeGatekeeperStats(ctx.npcStats);
  const recent = ctx.recentNpcReplies ?? [];

  if (stats.volatility >= 50) {
    return polishGatekeeperReply(
      pickNonRepeating(
        [
          "Easy. Do not poke the bear. What would actually make me say yes?",
          "That tone will not help you. Reset. What do you think I am guarding against?",
          "I am not in the mood for half stories. Give me something real to work with.",
        ],
        recent,
      ),
    );
  }

  return buildGateClosedReply(ctx);
}
