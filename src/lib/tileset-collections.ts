import type { TilesetDocument } from "@/types/room";

/**
 * Maps editor category → Firestore collection name.
 * To add a category (e.g. lighting): add an entry here, a tab label in
 * EDITOR_TAB_LABELS, a security-rules match block, and re-deploy rules.
 */
export const TILESET_COLLECTIONS = {
  floor: "floors",
  wall: "walls",
  door: "doors",
  window: "windows",
  furniture: "furniture",
  standee: "standees",
} as const;

export type TileCategory = keyof typeof TILESET_COLLECTIONS;
export type TilesetCollectionName =
  (typeof TILESET_COLLECTIONS)[TileCategory];

export const TILESET_CATEGORIES = Object.keys(
  TILESET_COLLECTIONS,
) as TileCategory[];

export const EDITOR_TAB_LABELS: Record<TileCategory, string> = {
  floor: "Floor",
  wall: "Walls",
  door: "Doors",
  window: "Windows",
  furniture: "Furniture",
  standee: "Standees",
};

export const EDITOR_TABS = TILESET_CATEGORIES.map((mode) => ({
  mode,
  label: EDITOR_TAB_LABELS[mode],
}));

export type TilesetRegistry = Record<
  TileCategory,
  Record<string, TilesetDocument>
>;

export function getTilesetCollection(category: TileCategory): string {
  return TILESET_COLLECTIONS[category];
}

export function createEmptyTilesetRegistry(): TilesetRegistry {
  return {
    floor: {},
    wall: {},
    door: {},
    window: {},
    furniture: {},
    standee: {},
  };
}

export function getTile(
  registry: TilesetRegistry,
  category: TileCategory,
  id: string | undefined,
): TilesetDocument | undefined {
  if (!id) return undefined;
  return registry[category][id];
}

export function isTilesetRegistryEmpty(registry: TilesetRegistry): boolean {
  return TILESET_CATEGORIES.every(
    (category) => Object.keys(registry[category]).length === 0,
  );
}

export function sortedTileEntries(
  tiles: Record<string, TilesetDocument>,
): Array<[string, TilesetDocument]> {
  return Object.entries(tiles).sort(([, a], [, b]) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

/** Built-in tiles that cannot be removed from the tileset. */
export const PROTECTED_TILE_IDS = new Set([
  "default_floor",
  "default_wall",
  "default_door",
  "default_door_double",
  "default_window",
  "default_window_2w",
  "default_window_2h",
  "default_window_2x2",
  "sofa_2x1",
  "desk_2x2",
  "default_standee",
]);

export function isProtectedTileId(tileId: string): boolean {
  return PROTECTED_TILE_IDS.has(tileId);
}
