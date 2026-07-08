export type HeadSource = "photo" | "preset";
export type HeadGender = "male" | "female";
export type HeadgearId =
  | "none"
  | "cap_red"
  | "cap_blue"
  | "horns"
  | "crown";

export interface AvatarConfig {
  bodyColor: string;
  headgearId: string;
  /** Use X/profile photo or built-in preset head. */
  headSource?: HeadSource;
  headGender?: HeadGender;
  skinTone?: string;
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

export const SKIN_TONES = [
  { id: "fair", color: "#f5d0b5", label: "Fair" },
  { id: "light", color: "#e8b88a", label: "Light" },
  { id: "medium", color: "#c68642", label: "Medium" },
  { id: "tan", color: "#a67c52", label: "Tan" },
  { id: "brown", color: "#8d5524", label: "Brown" },
  { id: "deep", color: "#5c3a21", label: "Deep" },
] as const;

export const DEFAULT_SKIN_TONE = SKIN_TONES[2].color;

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  bodyColor: AVATAR_BODY_COLORS[0],
  headgearId: "none",
  headSource: "preset",
  headGender: "male",
  skinTone: DEFAULT_SKIN_TONE,
};

function isValidSkinTone(value: unknown): value is string {
  return (
    typeof value === "string" &&
    SKIN_TONES.some((tone) => tone.color === value)
  );
}

export function normalizeAvatarConfig(
  raw: Partial<AvatarConfig> | null | undefined,
): AvatarConfig {
  const bodyColor =
    raw?.bodyColor && AVATAR_BODY_COLORS.includes(raw.bodyColor as (typeof AVATAR_BODY_COLORS)[number])
      ? raw.bodyColor
      : DEFAULT_AVATAR_CONFIG.bodyColor;
  const headgearId = raw?.headgearId?.trim() || DEFAULT_AVATAR_CONFIG.headgearId;
  const spriteSheetUrl = raw?.spriteSheetUrl?.trim() || undefined;
  const headSource =
    raw?.headSource === "photo" || raw?.headSource === "preset"
      ? raw.headSource
      : DEFAULT_AVATAR_CONFIG.headSource;
  const headGender =
    raw?.headGender === "female" || raw?.headGender === "male"
      ? raw.headGender
      : DEFAULT_AVATAR_CONFIG.headGender;
  const skinTone = isValidSkinTone(raw?.skinTone)
    ? raw.skinTone
    : DEFAULT_AVATAR_CONFIG.skinTone;
  return {
    bodyColor,
    headgearId,
    headSource,
    headGender,
    skinTone,
    ...(spriteSheetUrl ? { spriteSheetUrl } : {}),
  };
}
