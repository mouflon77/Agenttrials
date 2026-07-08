export const GRID_SIZE = 12;
export const FLOOR_TILE_COUNT = GRID_SIZE * GRID_SIZE;
export const WALL_HEIGHT = 3;
export const MAX_TEXTURE_PX = 256;
export const PIXELS_PER_TILE_UNIT = 64;

export const WALL_SIDES = ["back", "left", "front", "right"] as const;
export type WallSide = (typeof WALL_SIDES)[number];

import type { TileCategory } from "@/lib/tileset-collections";

export type { TileCategory };
export type EditorMode = TileCategory | "npc" | "portal" | "spawn";

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

export const DEFAULT_GATEKEEPER_ROLE =
  "A weary portal guard who has heard every excuse and shortcut.";

export const DEFAULT_GATEKEEPER_STYLE =
  "Blunt but fair, dry humor, conversational. Not corporate or robotic.";

export const DEFAULT_GATEKEEPER_QUIRKS =
  "Yeah, Got it, Look, Alright. Use natural openers like these instead of filler like \"I'd be happy to help\" or \"Certainly!\"";

export const DEFAULT_PASS_KEYWORDS = "respect, patience";

export const DEFAULT_PASS_HINT =
  "Work the ideas of respect and patience into what you say. Tell me you respect my time and you are not rushing me. Mean it in your own words.";

/** Parse comma-separated pass keywords from editor or Firestore. */
export function parsePassKeywords(raw?: string | null): string[] {
  if (!raw?.trim()) return [];
  return [
    ...new Set(
      raw
        .split(/[,;]+/)
        .map((part) => part.trim().toLowerCase())
        .filter((part) => part.length > 0),
    ),
  ];
}

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
   * Who they are — role and perspective for the AI voice.
   * e.g. "A snarky, tech-savvy startup co-founder guarding the floor."
   */
  role?: string;
  /** How they talk: casual, blunt, warm, direct, etc. */
  conversationalStyle?: string;
  /**
   * Signature phrases and verbal tics to use instead of robotic filler.
   * e.g. "Yeah, Got it, Look — avoid corporate jargon."
   */
  signatureQuirks?: string;
  /**
   * Comma-separated words/phrases. If the player's message contains any of
   * these (case-insensitive), the portal opens immediately.
   */
  passKeywords?: string;
  /**
   * Shown when the player asks for a hint. Should point toward passKeywords
   * without necessarily quoting them verbatim.
   */
  passHint?: string;
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
  /** Grid tile where the player appears when entering this room (no portal). */
  playerSpawnX: number;
  playerSpawnZ: number;
  furniture: FurnitureItem[];
  npcs: NpcItem[];
  portals: PortalItem[];
}

/** Lightweight listing entry for floor pickers. */
export interface RoomListItem {
  id: string;
  title?: string;
  playerSpawnX?: number;
  playerSpawnZ?: number;
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
  /**
   * Grid footprint: floor tiles for furniture; for doors/windows on walls,
   * `width` = tiles along the wall, `depth` = tiles tall on the wall.
   */
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

export function isActiveOverlay(tileId: string | undefined): boolean {
  return Boolean(tileId && tileId !== "none" && tileId !== "");
}

export function formatWallKeyLabel(key: string): string {
  const [side, along, height] = key.split("_");
  if (!side || along === undefined || height === undefined) return key;
  return `${side} · ${along}, h${height}`;
}

export function parseWallKey(
  key: string,
): { side: WallSide; along: number; height: number } | null {
  const [sideRaw, alongRaw, heightRaw] = key.split("_");
  if (!sideRaw || alongRaw === undefined || heightRaw === undefined) return null;
  if (!WALL_SIDES.includes(sideRaw as WallSide)) return null;
  const along = Number(alongRaw);
  const height = Number(heightRaw);
  if (!Number.isFinite(along) || !Number.isFinite(height)) return null;
  return { side: sideRaw as WallSide, along, height };
}

/** Wall overlay span from tileset width/depth (along-wall × vertical). */
export function getOverlayFootprint(
  tile: Pick<TilesetDocument, "width" | "depth"> | null | undefined,
): { along: number; height: number } {
  return {
    along: Math.max(1, Math.round(tile?.width ?? 1)),
    height: Math.max(1, Math.round(tile?.depth ?? 1)),
  };
}

export function formatOverlayFootprint(
  tile: Pick<TilesetDocument, "width" | "depth"> | null | undefined,
): string {
  const { along, height } = getOverlayFootprint(tile);
  return `${along}×${height}`;
}

export interface WallOverlayPlacement {
  key: string;
  tileId: string;
  side: WallSide;
  along: number;
  height: number;
  alongSpan: number;
  heightSpan: number;
}

export function isCellInOverlayFootprint(
  along: number,
  height: number,
  originAlong: number,
  originHeight: number,
  alongSpan: number,
  heightSpan: number,
): boolean {
  return (
    along >= originAlong &&
    along < originAlong + alongSpan &&
    height >= originHeight &&
    height < originHeight + heightSpan
  );
}

export function findWallOverlayAtCell(
  grid: Record<string, string>,
  getFootprint: (tileId: string) => { along: number; height: number },
  side: WallSide,
  along: number,
  height: number,
): WallOverlayPlacement | null {
  let best: WallOverlayPlacement | null = null;

  for (const [key, tileId] of Object.entries(grid)) {
    if (!isActiveOverlay(tileId)) continue;
    const parsed = parseWallKey(key);
    if (!parsed || parsed.side !== side) continue;

    const span = getFootprint(tileId);
    if (
      !isCellInOverlayFootprint(
        along,
        height,
        parsed.along,
        parsed.height,
        span.along,
        span.height,
      )
    ) {
      continue;
    }

    const candidate: WallOverlayPlacement = {
      key,
      tileId,
      side: parsed.side,
      along: parsed.along,
      height: parsed.height,
      alongSpan: span.along,
      heightSpan: span.height,
    };

    if (
      !best ||
      parsed.along < best.along ||
      (parsed.along === best.along && parsed.height < best.height)
    ) {
      best = candidate;
    }
  }

  return best;
}

export function listWallOverlayPlacements(
  grid: Record<string, string>,
  getFootprint: (tileId: string) => { along: number; height: number },
): WallOverlayPlacement[] {
  const placements: WallOverlayPlacement[] = [];
  const seen = new Set<string>();

  for (const [key, tileId] of Object.entries(grid)) {
    if (!isActiveOverlay(tileId)) continue;
    const parsed = parseWallKey(key);
    if (!parsed) continue;

    const placement = findWallOverlayAtCell(
      grid,
      getFootprint,
      parsed.side,
      parsed.along,
      parsed.height,
    );
    if (!placement || placement.key !== key || seen.has(key)) continue;
    seen.add(key);
    placements.push(placement);
  }

  return placements.sort((a, b) => {
    if (a.side !== b.side) return a.side.localeCompare(b.side);
    if (a.along !== b.along) return a.along - b.along;
    return a.height - b.height;
  });
}

export function canPlaceWallOverlay(
  side: WallSide,
  along: number,
  height: number,
  alongSpan: number,
  heightSpan: number,
): boolean {
  return (
    along >= 0 &&
    height >= 0 &&
    along + alongSpan <= GRID_SIZE &&
    height + heightSpan <= WALL_HEIGHT
  );
}

export function listActiveOverlayEntries(
  grid: Record<string, string>,
): Array<{ key: string; tileId: string }> {
  return Object.entries(grid)
    .filter(([, tileId]) => isActiveOverlay(tileId))
    .map(([key, tileId]) => ({ key, tileId }));
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

/** Centered transform for a multi-tile door/window anchored at bottom-left wall cell. */
export function getWallOverlayTransform(
  side: WallSide,
  originAlong: number,
  originHeight: number,
  alongSpan: number,
  heightSpan: number,
): {
  position: [number, number, number];
  rotation: [number, number, number];
} {
  const centerAlong = originAlong + alongSpan / 2;
  const centerHeight = originHeight + heightSpan / 2;
  return getWallTransform(side, centerAlong - 0.5, centerHeight - 0.5);
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
    const normalized: NpcItem = {
      id: npcItemId(item, index),
      standeeType: item.standeeType ?? "default_standee",
      x: item.x,
      z: item.z,
      name: item.name ?? "NPC",
      prompt: item.prompt ?? "",
      stats: normalizeGatekeeperStats(item.stats),
    };

    const walletAddress = item.walletAddress?.trim();
    if (walletAddress) {
      normalized.walletAddress = walletAddress;
    }

    const bribeAmountSol =
      typeof item.bribeAmountSol === "number" && item.bribeAmountSol > 0
        ? item.bribeAmountSol
        : null;
    if (bribeAmountSol != null) {
      normalized.bribeAmountSol = bribeAmountSol;
    }

    const role = item.role?.trim();
    if (role) normalized.role = role.slice(0, 500);

    const conversationalStyle = item.conversationalStyle?.trim();
    if (conversationalStyle) {
      normalized.conversationalStyle = conversationalStyle.slice(0, 300);
    }

    const signatureQuirks = item.signatureQuirks?.trim();
    if (signatureQuirks) {
      normalized.signatureQuirks = signatureQuirks.slice(0, 500);
    }

    const passKeywords = item.passKeywords?.trim();
    if (passKeywords) {
      normalized.passKeywords = passKeywords.slice(0, 300);
    }

    const passHint = item.passHint?.trim();
    if (passHint) {
      normalized.passHint = passHint.slice(0, 500);
    }

    return normalized;
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
    playerSpawnX: DEFAULT_PLAYER_SPAWN.x,
    playerSpawnZ: DEFAULT_PLAYER_SPAWN.z,
    furniture: [],
    npcs: [],
    portals: [],
  };
}

export const DEFAULT_PLAYER_SPAWN = { x: 6, z: 6 };

function clampSpawnCoord(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(GRID_SIZE - 1, Math.max(0, Math.round(n)));
}

export function resolvePlayerSpawn(
  room: Pick<RoomDocument, "playerSpawnX" | "playerSpawnZ"> | null | undefined,
  urlSpawn?: { x: number; z: number } | null,
): { x: number; z: number } {
  if (
    urlSpawn &&
    urlSpawn.x >= 0 &&
    urlSpawn.z >= 0 &&
    urlSpawn.x < GRID_SIZE &&
    urlSpawn.z < GRID_SIZE
  ) {
    return urlSpawn;
  }
  return {
    x: clampSpawnCoord(room?.playerSpawnX, DEFAULT_PLAYER_SPAWN.x),
    z: clampSpawnCoord(room?.playerSpawnZ, DEFAULT_PLAYER_SPAWN.z),
  };
}

/** True when a saved (0,0) is almost certainly an uninitialized spawn. */
export function isUnsetSavedSpawn(
  saved: { x: number; z: number },
  roomSpawn: { x: number; z: number },
): boolean {
  return (
    saved.x === 0 &&
    saved.z === 0 &&
    (roomSpawn.x !== 0 || roomSpawn.z !== 0)
  );
}

/** Pick spawn for play mode: URL > saved game > room editor spawn. */
export function resolvePlaySpawn(
  room: Pick<RoomDocument, "playerSpawnX" | "playerSpawnZ"> | null | undefined,
  game:
    | {
        roomId: string;
        startRoomId: string;
        playerX: number;
        playerZ: number;
      }
    | null
    | undefined,
  roomId: string,
  urlSpawn?: { x: number; z: number } | null,
): { x: number; z: number } {
  if (urlSpawn) return urlSpawn;

  const roomSpawn = resolvePlayerSpawn(room, null);

  if (!game || game.roomId !== roomId) {
    return roomSpawn;
  }

  const saved = { x: game.playerX, z: game.playerZ };

  if (isUnsetSavedSpawn(saved, roomSpawn)) {
    return roomSpawn;
  }

  return saved;
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
    playerSpawnX: clampSpawnCoord(data.playerSpawnX, defaults.playerSpawnX),
    playerSpawnZ: clampSpawnCoord(data.playerSpawnZ, defaults.playerSpawnZ),
    furniture: normalizeFurniture(data.furniture ?? defaults.furniture),
    npcs: normalizeNpcs(data.npcs ?? defaults.npcs),
    portals: normalizePortals(data.portals ?? defaults.portals),
  };
}

