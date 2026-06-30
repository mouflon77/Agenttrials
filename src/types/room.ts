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

export interface NpcItem {
  id: string;
  /** Standee tileset id */
  standeeType: string;
  x: number;
  z: number;
  name: string;
  /** System prompt / negotiation context for the AI gatekeeper */
  prompt: string;
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

export interface TilesetDocument {
  name: string;
  textureUrl: string;
  /** Grid footprint (furniture) */
  width: number;
  depth: number;
  /** PNG pixel dimensions for texture scaling (max 256) */
  pixelWidth: number;
  pixelHeight: number;
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

export function normalizeNpcs(items: NpcItem[]): NpcItem[] {
  return items.map((item, index) => ({
    ...item,
    id: npcItemId(item, index),
    name: item.name ?? "NPC",
    prompt: item.prompt ?? "",
    standeeType: item.standeeType ?? "default_standee",
  }));
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

export function createDefaultRoom(): RoomDocument {
  return {
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
  return {
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

