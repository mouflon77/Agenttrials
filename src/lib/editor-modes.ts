import type { TileCategory } from "@/lib/tileset-collections";
import type { EditorMode } from "@/types/room";

export const ENTITY_EDITOR_TABS = [
  { mode: "npc" as const, label: "NPCs" },
  { mode: "portal" as const, label: "Portals" },
];

export function isTilesetEditorMode(mode: EditorMode): mode is TileCategory {
  return mode !== "npc" && mode !== "portal";
}

export function paletteCategoryForMode(mode: EditorMode): TileCategory | null {
  if (mode === "npc") return "standee";
  if (isTilesetEditorMode(mode)) return mode;
  return null;
}
