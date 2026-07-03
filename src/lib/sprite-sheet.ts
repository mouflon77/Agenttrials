/** 8×8 walk sheet: rows = facing, columns = animation frame. */
export const SPRITE_SHEET_COLS = 8;
export const SPRITE_SHEET_ROWS = 8;
export const SPRITE_ANIM_FPS = 10;
export const DEFAULT_PLAYER_SPRITE_SHEET = "/avatars/player-walk-8x8.png";

/**
 * Row index for grid movement (dx, dz).
 * Row order matches the bundled sheet (top → bottom):
 * E, SE, S, SW, W, NW, N, NE
 */
export function spriteRowFromDelta(dx: number, dz: number): number {
  if (dx === 1 && dz === 0) return 0;
  if (dx === 1 && dz === 1) return 1;
  if (dx === 0 && dz === 1) return 2;
  if (dx === -1 && dz === 1) return 3;
  if (dx === -1 && dz === 0) return 4;
  if (dx === -1 && dz === -1) return 5;
  if (dx === 0 && dz === -1) return 6;
  if (dx === 1 && dz === -1) return 7;
  return 2;
}

export function spriteRowFromVisualDelta(dx: number, dz: number): number {
  if (Math.abs(dx) < 0.01 && Math.abs(dz) < 0.01) return -1;
  const angle = Math.atan2(dz, dx);
  const octant = Math.round(angle / (Math.PI / 4));
  const map: Record<number, number> = {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    [-4]: 4,
    [-3]: 5,
    [-2]: 6,
    [-1]: 7,
  };
  return map[octant] ?? 2;
}

export function spriteUvOffset(col: number, row: number): { x: number; y: number } {
  const x = col / SPRITE_SHEET_COLS;
  const y = 1 - (row + 1) / SPRITE_SHEET_ROWS;
  return { x, y };
}

export function spriteUvRepeat(): { x: number; y: number } {
  return {
    x: 1 / SPRITE_SHEET_COLS,
    y: 1 / SPRITE_SHEET_ROWS,
  };
}
