export interface AvatarConfig {
  bodyColor: string;
  headgearId: string;
  /** Optional walk sprite sheet (8×8 grid). Defaults to /avatars/player-walk-8x8.png */
  spriteSheetUrl?: string;
}

export interface HeadgearItem {
  id: string;
  name: string;
  textureUrl: string;
}

export const AVATAR_BODY_COLORS = [
  "#38bdf8",
  "#f472b6",
  "#a3e635",
  "#fbbf24",
  "#c084fc",
] as const;

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  bodyColor: AVATAR_BODY_COLORS[0],
  headgearId: "none",
};

export function normalizeAvatarConfig(
  raw: Partial<AvatarConfig> | null | undefined,
): AvatarConfig {
  const bodyColor =
    raw?.bodyColor && AVATAR_BODY_COLORS.includes(raw.bodyColor as (typeof AVATAR_BODY_COLORS)[number])
      ? raw.bodyColor
      : DEFAULT_AVATAR_CONFIG.bodyColor;
  const headgearId = raw?.headgearId?.trim() || DEFAULT_AVATAR_CONFIG.headgearId;
  const spriteSheetUrl = raw?.spriteSheetUrl?.trim() || undefined;
  return { bodyColor, headgearId, ...(spriteSheetUrl ? { spriteSheetUrl } : {}) };
}
