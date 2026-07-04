export const GRID_SIZE = 12;
export const FLOOR_TILE_COUNT = GRID_SIZE * GRID_SIZE;
export const WALL_HEIGHT = 2;
export const MAX_TEXTURE_PX = 256;
export const PIXELS_PER_TILE_UNIT = 64;

export const WALL_SIDES = ["back", "left", "front", "right"] as const;
export type WallSide = (typeof WALL_SIDES)[number];

import type { TileCategory } from "@/lib/tileset-collections";

export type { TileCategory };
export type EditorMode = TileCategory | "npc" | "portal";

export interface PlayerPosition {
  x: number;
  z: number;
}

export interface FurnitureItem {
  id: string;
  type: string;
  x: number;
  z: number;
  rotation: number;
  color?: string;
}

/**
 * Negotiation profile for a floor gatekeeper (0–100 scales).
 * Fed into the AI judge; not shown directly to the player.
 */
export interface GatekeeperStats {
  /** Resistance to flattery / ego appeals. Higher = harder to sway with praise. */
  egoArmor: number;
  /** Mood instability. Higher = quicker to escalate, snap, or flip. */
  volatility: number;
  /** Need to feel in charge. Higher = must lead / not be told what to do. */
  controlNeed: number;
  /** Reluctance to reveal what they want. Higher = more cryptic / withholding. */
  informationLock: number;
  /**
   * How much "that's right" / felt understanding the player must earn to pass
   * (Chris Voss–style). Higher = longer, deeper rapport required.
   */
  thatsRightThreshold: number;
}

/** Sensible floor-1 defaults (Administrative Assistant profile). */
export const DEFAULT_GATEKEEPER_STATS: GatekeeperStats = {
  egoArmor: 15,
  volatility: 20,
  controlNeed: 40,
  informationLock: 10,
  thatsRightThreshold: 25,
};

export const GATEKEEPER_STAT_META: Array<{
  key: keyof GatekeeperStats;
  label: string;
  hint: string;
}> = [
  {
    key: "egoArmor",
    label: "Ego Armor",
    hint: "Resistance to flattery / ego appeals",
  },
  {
    key: "volatility",
    label: "Volatility",
    hint: "How quickly mood escalates or flips",
  },
  {
    key: "controlNeed",
    label: "Control Need",
    hint: "Need to feel in charge of the exchange",
  },
  {
    key: "informationLock",
    label: "Information Lock",
    hint: "Reluctance to reveal what they want",
  },
  {
    key: "thatsRightThreshold",
    label: '"That\'s Right" Threshold',
    hint: "Depth of understanding required to pass",
  },
];

export function clampGatekeeperStat(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function normalizeGatekeeperStats(
  raw?: Partial<GatekeeperStats> | null,
): GatekeeperStats {
  return {
    egoArmor: clampGatekeeperStat(
      raw?.egoArmor,
      DEFAULT_GATEKEEPER_STATS.egoArmor,
    ),
    volatility: clampGatekeeperStat(
      raw?.volatility,
      DEFAULT_GATEKEEPER_STATS.volatility,
    ),
    controlNeed: clampGatekeeperStat(
      raw?.controlNeed,
      DEFAULT_GATEKEEPER_STATS.controlNeed,
    ),
    informationLock: clampGatekeeperStat(
      raw?.informationLock,
      DEFAULT_GATEKEEPER_STATS.informationLock,
    ),
    thatsRightThreshold: clampGatekeeperStat(
      raw?.thatsRightThreshold,
      DEFAULT_GATEKEEPER_STATS.thatsRightThreshold,
    ),
  };
}

export interface NpcItem {
  id: string;
  /** Standee tileset id */
  standeeType: string;
  x: number;
  z: number;
  name: string;
  /**
   * Disposition / conditions for this floor's gatekeeper (AI-only).
   * e.g. "bored, protective of their time, and expects you to be demanding."
   */
  prompt: string;
  /** Negotiation stats that shape how hard this gatekeeper is to pass. */
  stats: GatekeeperStats;
  /**
   * Agent wallet public key (from AgentWallets `npm run setup`).
   * Receives bribes during negotiation.
   */
  walletAddress?: string;
  /** Minimum SOL bribe to unlock the portal (devnet/mainnet per SOLANA_RPC_URL). */
  bribeAmountSol?: number;
}

export interface PortalItem {
  id: string;
  x: number;
  z: number;
  targetRoomId: string;
  spawnX: number;
  spawnZ: number;
}

export const DEFAULT_FURNITURE_COLOR = "#6b5b4f";

export interface RoomDocument {
  /** Optional display name, e.g. "Floor 1 — Lobby". */
  title?: string;
  floorColor: string;
  wallColor: string;
  floorGrid: Record<string, string>;
  wallGrid: Record<string, string>;
  doorGrid: Record<string, string>;
  windowGrid: Record<string, string>;
  furniture: FurnitureItem[];
  npcs: NpcItem[];
  portals: PortalItem[];
}

/** Lightweight listing entry for floor pickers. */
export interface RoomListItem {
  id: string;
  title?: string;
}

export function formatRoomLabel(room: RoomListItem): string {
  const title = room.title?.trim();
  return title ? `${room.id} · ${title}` : room.id;
}

/** Normalize a user-entered room id to a safe Firestore doc id. */
export function sanitizeRoomId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/^[_\-]+/, "")
    .slice(0, 64);
}

export function suggestNextRoomId(existingIds: string[]): string {
  let max = 0;
  for (const id of existingIds) {
    const match = /^room_(\d+)$/i.exec(id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `room_${String(max + 1).padStart(2, "0")}`;
}

export interface TilesetDocument {
  name: string;
  textureUrl: string;
  /** Grid footprint (furniture) */
  width: number;
  depth: number;
  /** Display size for texture scaling (max 256; 64 = 1 tile unit) */
  pixelWidth: number;
  pixelHeight: number;
  /** Texture format; omit or "png" for pixel art, "svg" for vectors. */
  format?: "png" | "svg";
}

export function floorIndex(x: number, z: number): string {
  return String(z * GRID_SIZE + x);
}

export function parseFloorIndex(index: string): { x: number; z: number } {
  const i = Number(index);
  return { x: i % GRID_SIZE, z: Math.floor(i / GRID_SIZE) };
}

export function wallKey(side: WallSide, along: number, height: number): string {
  return `${side}_${along}_${height}`;
}

export function planeSizeFromPixels(
  pixelWidth: number,
  pixelHeight: number,
): { width: number; height: number } {
  return {
    width: pixelWidth / PIXELS_PER_TILE_UNIT,
    height: pixelHeight / PIXELS_PER_TILE_UNIT,
  };
}

export function getWallTransform(
  side: WallSide,
  along: number,
  height: number,
): {
  position: [number, number, number];
  rotation: [number, number, number];
} {
  switch (side) {
    case "back":
      return {
        position: [along + 0.5, height + 0.5, GRID_SIZE - 0.01],
        rotation: [0, Math.PI, 0],
      };
    case "front":
      return {
        position: [along + 0.5, height + 0.5, 0.01],
        rotation: [0, 0, 0],
      };
    case "left":
      return {
        position: [0.01, height + 0.5, along + 0.5],
        rotation: [0, Math.PI / 2, 0],
      };
    case "right":
      return {
        position: [GRID_SIZE - 0.01, height + 0.5, along + 0.5],
        rotation: [0, -Math.PI / 2, 0],
      };
  }
}

export function createDefaultFloorGrid(
  defaultTileId = "default_floor",
): Record<string, string> {
  const grid: Record<string, string> = {};
  for (let i = 0; i < FLOOR_TILE_COUNT; i++) {
    grid[String(i)] = defaultTileId;
  }
  return grid;
}

export function createDefaultWallGrid(
  defaultTileId = "default_wall",
): Record<string, string> {
  const grid: Record<string, string> = {};
  for (const side of WALL_SIDES) {
    for (let along = 0; along < GRID_SIZE; along++) {
      for (let height = 0; height < WALL_HEIGHT; height++) {
        grid[wallKey(side, along, height)] = defaultTileId;
      }
    }
  }
  return grid;
}

export function createEmptyOverlayGrid(): Record<string, string> {
  return {};
}

export function furnitureItemId(item: FurnitureItem, index: number): string {
  if (item.id) return item.id;
  return `legacy-${index}-${item.x}-${item.z}-${item.type}`;
}

export function normalizeFurniture(items: FurnitureItem[]): FurnitureItem[] {
  return items.map((item, index) => ({
    ...item,
    id: furnitureItemId(item, index),
    rotation: item.rotation ?? 0,
  }));
}

export function npcItemId(item: NpcItem, index: number): string {
  if (item.id) return item.id;
  return `npc-legacy-${index}-${item.x}-${item.z}`;
}

export function npcAcceptsBribes(npc: NpcItem): boolean {
  return Boolean(
    npc.walletAddress?.trim() &&
      typeof npc.bribeAmountSol === "number" &&
      npc.bribeAmountSol > 0,
  );
}

export function normalizeNpcs(items: NpcItem[]): NpcItem[] {
  return items.map((item, index) => {
    const walletAddress = item.walletAddress?.trim() || undefined;
    const bribeAmountSol =
      typeof item.bribeAmountSol === "number" && item.bribeAmountSol > 0
        ? item.bribeAmountSol
        : undefined;

    return {
      ...item,
      id: npcItemId(item, index),
      name: item.name ?? "NPC",
      prompt: item.prompt ?? "",
      stats: normalizeGatekeeperStats(item.stats),
      standeeType: item.standeeType ?? "default_standee",
      walletAddress,
      bribeAmountSol,
    };
  });
}

export function portalItemId(item: PortalItem, index: number): string {
  if (item.id) return item.id;
  return `portal-legacy-${index}-${item.x}-${item.z}`;
}

export function normalizePortals(items: PortalItem[]): PortalItem[] {
  return items.map((item, index) => ({
    ...item,
    id: portalItemId(item, index),
    targetRoomId: item.targetRoomId ?? "room_02",
    spawnX: item.spawnX ?? 6,
    spawnZ: item.spawnZ ?? 6,
  }));
}

export function isGridEdge(x: number, z: number): boolean {
  return x === 0 || z === 0 || x === GRID_SIZE - 1 || z === GRID_SIZE - 1;
}

export function tileDistance(
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  return Math.max(Math.abs(ax - bx), Math.abs(az - bz));
}

export function isWithinTiles(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  radius: number,
): boolean {
  return tileDistance(ax, az, bx, bz) <= radius;
}

export function createDefaultRoom(title?: string): RoomDocument {
  return {
    ...(title?.trim() ? { title: title.trim() } : {}),
    floorColor: "#c8b89a",
    wallColor: "#8b7355",
    floorGrid: createDefaultFloorGrid(),
    wallGrid: createDefaultWallGrid(),
    doorGrid: createEmptyOverlayGrid(),
    windowGrid: createEmptyOverlayGrid(),
    furniture: [],
    npcs: [],
    portals: [],
  };
}

export function normalizeRoom(data: Partial<RoomDocument>): RoomDocument {
  const defaults = createDefaultRoom();
  const title = data.title?.trim() || undefined;
  return {
    ...(title ? { title } : {}),
    floorColor: data.floorColor ?? defaults.floorColor,
    wallColor: data.wallColor ?? defaults.wallColor,
    floorGrid: { ...defaults.floorGrid, ...data.floorGrid },
    wallGrid: { ...defaults.wallGrid, ...data.wallGrid },
    doorGrid: { ...defaults.doorGrid, ...data.doorGrid },
    windowGrid: { ...defaults.windowGrid, ...data.windowGrid },
    furniture: normalizeFurniture(data.furniture ?? defaults.furniture),
    npcs: normalizeNpcs(data.npcs ?? defaults.npcs),
    portals: normalizePortals(data.portals ?? defaults.portals),
  };
}

