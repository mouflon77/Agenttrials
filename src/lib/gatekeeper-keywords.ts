const MAX_KEYWORDS_PER_FLOOR = 5;

/** Floor 1 → 1 keyword slot, floor 2 → 2, etc. (capped). */
export function keywordCountForFloor(floor: number): number {
  const f = Math.max(1, Math.floor(floor));
  return Math.min(MAX_KEYWORDS_PER_FLOOR, f);
}

export function keywordAppearsInMessage(message: string, keyword: string): boolean {
  const trimmed = keyword.trim().toLowerCase();
  if (!trimmed) return false;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`\\b${escaped}\\b`, "i").test(message)) return true;
  if (trimmed.length >= 4) {
    if (new RegExp(`\\b${escaped}\\w{0,5}\\b`, "i").test(message)) return true;
    const words = message.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
    const stem = trimmed.slice(0, Math.min(5, trimmed.length));
    for (const word of words) {
      if (word.startsWith(stem) || trimmed.startsWith(word.slice(0, Math.min(5, word.length)))) {
        if (Math.abs(word.length - trimmed.length) <= 4) return true;
      }
      if (trimmed.length >= 6 && word.length >= 5 && editDistance(word, trimmed) <= 2) {
        return true;
      }
    }
  }
  return false;
}

function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]!;
      dp[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[j]!, dp[j - 1]!);
      prev = tmp;
    }
  }
  return dp[n]!;
}

function userMessagesFromHistory(
  history: Array<{ role: "user" | "npc"; text: string }>,
  currentMessage?: string,
): string[] {
  const lines = history
    .filter((line) => line.role === "user")
    .map((line) => line.text.trim())
    .filter(Boolean);
  const current = currentMessage?.trim();
  if (current) lines.push(current);
  return lines;
}

export function evaluatePassKeywords(
  message: string,
  keywords: string[],
): { matched: string[]; missing: string[]; passes: boolean } {
  const normalized = keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
  if (normalized.length === 0) {
    return { matched: [], missing: [], passes: false };
  }
  const matched = normalized.filter((kw) => keywordAppearsInMessage(message, kw));
  const missing = normalized.filter((kw) => !matched.includes(kw));
  return { matched, missing, passes: missing.length === 0 };
}

export function evaluatePassKeywordsAcrossChat(
  history: Array<{ role: "user" | "npc"; text: string }>,
  currentMessage: string,
  keywords: string[],
): { matched: string[]; missing: string[]; passes: boolean } {
  const normalized = keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
  if (normalized.length === 0) {
    return { matched: [], missing: [], passes: false };
  }
  const userLines = userMessagesFromHistory(history, currentMessage);
  const matched = normalized.filter((kw) =>
    userLines.some((line) => keywordAppearsInMessage(line, kw)),
  );
  const missing = normalized.filter((kw) => !matched.includes(kw));
  return { matched, missing, passes: missing.length === 0 };
}

export function messagePassesKeywords(message: string, keywords: string[]): boolean {
  return evaluatePassKeywords(message, keywords).passes;
}

export type KeywordLightState = "found" | "hot" | "missing";

export interface KeywordProgress {
  total: number;
  found: number;
  missing: number;
  lights: KeywordLightState[];
}

export function buildKeywordProgress(input: {
  keywords: string[];
  floor: number;
  history: Array<{ role: "user" | "npc"; text: string }>;
  currentMessage?: string;
}): KeywordProgress {
  const keywords = input.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
  const floorSlots = keywordCountForFloor(input.floor);
  const total = keywords.length > 0 ? keywords.length : floorSlots;
  if (total <= 0) {
    return { total: 0, found: 0, missing: 0, lights: [] };
  }

  const across = evaluatePassKeywordsAcrossChat(
    input.history,
    input.currentMessage ?? "",
    keywords,
  );
  const currentOnly = input.currentMessage?.trim()
    ? evaluatePassKeywords(input.currentMessage, keywords)
    : { matched: [] as string[], missing: keywords, passes: false };

  const found = keywords.length > 0 ? across.matched.length : 0;
  const hasHot =
    keywords.length > 0 &&
    currentOnly.matched.length > 0 &&
    !across.passes &&
    found < total;

  const lights: KeywordLightState[] = [];
  for (let i = 0; i < total; i++) {
    if (i < found) lights.push("found");
    else if (i === found && hasHot) lights.push("hot");
    else lights.push("missing");
  }

  return {
    total,
    found,
    missing: Math.max(0, total - found),
    lights,
  };
}
