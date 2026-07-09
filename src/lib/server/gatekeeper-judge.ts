import type { GatekeeperStats } from "@/types/room";
import {
  evaluatePassKeywords,
  evaluatePassKeywordsAcrossChat,
  messagePassesKeywords,
} from "@/lib/gatekeeper-keywords";
import {
  DEFAULT_GATEKEEPER_QUIRKS,
  DEFAULT_GATEKEEPER_ROLE,
  DEFAULT_GATEKEEPER_STYLE,
  normalizeGatekeeperStats,
} from "@/types/room";

export type {
  KeywordLightState,
  KeywordProgress,
} from "@/lib/gatekeeper-keywords";
export {
  evaluatePassKeywords,
  evaluatePassKeywordsAcrossChat,
  keywordAppearsInMessage,
  keywordCountForFloor,
  messagePassesKeywords,
} from "@/lib/gatekeeper-keywords";

export interface GatekeeperJudgeContext {
  npcName: string;
  npcPrompt: string;
  npcRole?: string;
  npcConversationalStyle?: string;
  npcSignatureQuirks?: string;
  passKeywords?: string[];
  npcStats?: Partial<GatekeeperStats> | null;
  userTurnCount: number;
  paymentVerified: boolean;
  /** Current player message — used for keyword pass checks. */
  userMessage?: string;
  /** Recent NPC lines in this chat — used to avoid canned repetition. */
  recentNpcReplies?: string[];
  /** Full chat history for clue-tracking (avoid false "I already hinted" lines). */
  chatHistory?: Array<{ role: "user" | "npc"; text: string }>;
}

const HINT_REQUEST_PATTERN =
  /\b(hint|clue|help me out|give me a hint|need a hint|what should i say|what do i need to say|tell me what you want|what words|how do i get through|what will make you)\b/i;

export function userRequestsHint(message: string): boolean {
  return HINT_REQUEST_PATTERN.test(message.trim());
}

/** Room-configured keywords win over per-game generated ones. */
export function resolvePassKeywordsForNpc(input: {
  roomKeywords?: string[];
  puzzleKeywords?: string[];
  bodyKeywords?: string[];
}): string[] {
  if (input.roomKeywords && input.roomKeywords.length > 0) {
    return input.roomKeywords;
  }
  if (input.puzzleKeywords && input.puzzleKeywords.length > 0) {
    return input.puzzleKeywords;
  }
  return input.bodyKeywords ?? [];
}

export function findMatchedPassKeyword(
  message: string,
  keywords: string[],
): string | null {
  const { matched } = evaluatePassKeywords(message, keywords);
  return matched[0] ?? null;
}

export function npcHasGivenClues(
  history: Array<{ role: "user" | "npc"; text: string }>,
): boolean {
  if (history.some((line) => line.role === "user" && userRequestsHint(line.text))) {
    return true;
  }
  return history.filter((line) => line.role === "npc").length >= 2;
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
  const andRule =
    keywords.length === 1
      ? "If their message contains this word as a whole word, set passed=true immediately."
      : `If their message contains ALL of these words as whole words (every one), set passed=true immediately. Partial matches are not enough.`;
  return `## Forbidden words (hard rule — never break)
You must NEVER say, spell, quote, or paraphrase toward these exact pass words in any reply: ${keywords.join(", ")}.
Do not list them as hints. Guide the player without naming the answer.
${andRule}`;
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
  const base = 1;
  const fromThreshold = Math.floor(stats.thatsRightThreshold / 40);
  const fromEgo = Math.floor(stats.egoArmor / 55);
  const fromControl = Math.floor(stats.controlNeed / 60);
  return Math.min(4, base + fromThreshold + fromEgo + fromControl);
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
  const keywords = ctx.passKeywords ?? [];
  const history = ctx.chatHistory ?? [];
  if (keywords.length > 0 && ctx.userMessage) {
    if (evaluatePassKeywords(ctx.userMessage, keywords).passes) return true;
    if (evaluatePassKeywordsAcrossChat(history, ctx.userMessage, keywords).passes) {
      return true;
    }
  }
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
- This is a negotiable puzzle, not a brick wall. Lead the player toward what you need with real hints every turn.
- Every reply MUST: (1) react specifically to what the player just said, (2) add ONE new concrete clue, (3) use fresh wording.
- If they ask for a hint, clue, or what to say, give a direct useful hint. Do not dodge.
- Never claim you "already gave clues" or "dropped hints" unless you actually did earlier in this conversation.
- Keep replies to 2–4 sentences. Sound like a person in your role, not a system message.
- If their message already contains every pass keyword you need (you will not name those words), set passed=true immediately.
- Show progress when they get warmer even if passed is still false.
- passed=true when: verified bribe received, OR their message satisfies your disposition, OR they used all required pass keywords.
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

export function buildPartialKeywordReply(
  ctx: GatekeeperJudgeContext,
  matched: string[],
  missingCount: number,
): string {
  const recent = ctx.recentNpcReplies ?? [];
  if (missingCount === 1) {
    return polishGatekeeperReply(
      pickNonRepeating(
        [
          "Yes, that is one of the ideas I needed. You still have one more word to find before I let you through.",
          "Good, you nailed part of it. There is still another thing I need to hear from you.",
          "Right track. One down, one to go. Say the other thing I am looking for.",
        ],
        recent,
      ),
    );
  }
  return polishGatekeeperReply(
    pickNonRepeating(
      [
        `You found ${matched.length} of what I need. Keep going, there are more words to discover.`,
        `Nice, that helps. I am still waiting on ${missingCount} more ideas before the portal opens.`,
        `Part of the puzzle, yes. You have ${missingCount} more to figure out.`,
      ],
      recent,
    ),
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

const KEYWORD_HINT_THEMES: Record<string, string[]> = {
  respect: [
    "Show you value what I do here, not just what you want from me.",
    "Speak like you mean it. I need to hear that you take this seriously.",
  ],
  patience: [
    "Do not rush me. Show you can wait for a real answer.",
    "I want to see you are willing to take your time with this.",
  ],
  discipline: [
    "Show self-control in how you ask. Composed beats chaotic.",
    "Convince me you are steady, not scattered.",
  ],
  trust: [
    "Give me a reason to believe you are being straight with me.",
    "Talk like someone who keeps their word.",
  ],
  honesty: [
    "Skip the performance. Say what you actually think.",
    "I need plain truth, not a sales pitch.",
  ],
  humility: [
    "Drop the swagger. Show you know you need something from me.",
    "Approach me like you might be wrong, not like you own the place.",
  ],
  empathy: [
    "Show you get why I am standing in your way.",
    "React to my situation, not just yours.",
  ],
  courage: [
    "Say what you mean even if it is uncomfortable.",
    "I respect directness when it is earned.",
  ],
  understanding: [
    "Prove you grasp why this gate exists.",
    "Explain my side back to me, not just yours.",
  ],
};

function hintRequestCount(
  history: Array<{ role: "user" | "npc"; text: string }>,
  currentMessage?: string,
): number {
  let count = history.filter(
    (line) => line.role === "user" && userRequestsHint(line.text),
  ).length;
  if (currentMessage && userRequestsHint(currentMessage)) count += 1;
  return count;
}

function thematicHintsForKeywords(
  keywords: string[],
  missing: string[],
  round: number,
): string[] {
  const pool: string[] = [];
  const focus = missing.length > 0 ? missing : keywords;
  for (const kw of focus) {
    const themes = KEYWORD_HINT_THEMES[kw];
    if (themes?.length) pool.push(themes[round % themes.length]!);
  }
  if (pool.length === 0) {
    pool.push(
      "Work the attitude I keep asking for into your own words.",
      "Say plainly what you think I need to hear from you.",
      "Try naming the qualities you bring to this conversation.",
    );
  }
  return pool;
}

export function buildHintReply(ctx: GatekeeperJudgeContext): string {
  const recent = ctx.recentNpcReplies ?? [];
  const history = ctx.chatHistory ?? [];
  const keywords = ctx.passKeywords ?? [];
  const keywordEval = evaluatePassKeywordsAcrossChat(
    history,
    ctx.userMessage ?? "",
    keywords,
  );
  const round = hintRequestCount(history, ctx.userMessage);

  const thematic = thematicHintsForKeywords(
    keywords,
    keywordEval.missing,
    round,
  );
  const progressivePool: string[] = [...thematic];
  if (keywordEval.matched.length > 0 && keywordEval.missing.length > 0) {
    progressivePool.push(
      `You already hit on ${keywordEval.matched.length} of what I need. There ${keywordEval.missing.length === 1 ? "is" : "are"} still ${keywordEval.missing.length} more ${keywordEval.missing.length === 1 ? "idea" : "ideas"} to land.`,
    );
  }
  if (round >= 2 && keywordEval.missing.length > 0) {
    progressivePool.push(
      `You are hunting ${keywordEval.missing.length} more ${keywordEval.missing.length === 1 ? "word" : "words"}. Think about the themes I keep steering toward.`,
    );
  }

  const hintBody = pickNonRepeating(progressivePool, recent);

  const opener = pickNonRepeating(
    [
      "Fine, here's a hint.",
      "Alright, listen up.",
      "Yeah, okay, you want a clue.",
      "Look, I'll make this easier for you.",
      "Okay, I'll spell it out a bit more.",
      "Different angle this time.",
    ],
    recent,
  );

  return polishGatekeeperReply(`${opener} ${hintBody}`);
}

export function buildGateClosedReply(ctx: GatekeeperJudgeContext): string {
  const stats = normalizeGatekeeperStats(ctx.npcStats);
  const recent = ctx.recentNpcReplies ?? [];
  const history = ctx.chatHistory ?? [];
  const gaveClues = npcHasGivenClues(history);
  const remaining = Math.max(
    0,
    minimumPersuasionTurns(stats) - ctx.userTurnCount,
  );

  if (remaining > 0 || ctx.userTurnCount <= 2) {
    const early: string[] = [
      "We are just getting started. Tell me something specific about why you are here and I will point you in the right direction.",
      "Not yet. Ask me what it would take to change my mind. That beats demanding passage.",
      "I hear urgency, but I need more than that. What do you actually know about what I want?",
    ];
    if (stats.controlNeed >= 45) {
      early.push(
        "Do not rush me. Ask what I need to hear and I will give you a hint if you approach it right.",
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
  ];
  if (gaveClues) {
    late.push("Tie together what I have been hinting at in one honest sentence.");
  }
  if (stats.thatsRightThreshold >= 45) {
    late.push(
      "Stop pitching. Reflect my position back to me. Make me feel understood, then we will talk passage.",
    );
  }
  return polishGatekeeperReply(pickNonRepeating(late, recent));
}

export function buildFallbackDenialReply(ctx: GatekeeperJudgeContext): string {
  const keywords = ctx.passKeywords ?? [];
  const history = ctx.chatHistory ?? [];
  const current = ctx.userMessage ?? "";
  if (keywords.length > 0 && current) {
    const evalAcross = evaluatePassKeywordsAcrossChat(history, current, keywords);
    if (evalAcross.matched.length > 0 && evalAcross.missing.length > 0) {
      return buildPartialKeywordReply(
        ctx,
        evalAcross.matched,
        evalAcross.missing.length,
      );
    }
  }

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
