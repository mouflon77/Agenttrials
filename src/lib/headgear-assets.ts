/** Built-in headgear textures (local mockups). */
export const LOCAL_HEADGEAR_TEXTURES: Record<string, string> = {
  cap_red: "/headgear/cap_red.svg",
  cap_blue: "/headgear/cap_blue.svg",
  horns: "/headgear/horns.svg",
  crown: "/headgear/crown.svg",
};

export function resolveHeadgearTextureUrl(
  headgearId: string,
  textureUrl?: string,
): string | undefined {
  if (headgearId === "none") return undefined;
  const trimmed = textureUrl?.trim();
  if (trimmed) return trimmed;
  return LOCAL_HEADGEAR_TEXTURES[headgearId];
}

/** Y rotation (radians) so headgear faces the movement direction row. */
export function headgearYawForFacingRow(facingRow: number): number {
  const YAW_BY_ROW = [
    -Math.PI / 2, // E
    -Math.PI / 4, // SE
    0, // S
    Math.PI / 4, // SW
    Math.PI / 2, // W
    (3 * Math.PI) / 4, // NW
    Math.PI, // N
    (-3 * Math.PI) / 4, // NE
  ];
  return YAW_BY_ROW[facingRow] ?? 0;
}
