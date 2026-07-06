import type { TileCategory } from "@/lib/tileset-collections";
import type { EditorMode } from "@/types/room";

export const ENTITY_EDITOR_TABS = [
  { mode: "spawn" as const, label: "Spawn" },
  { mode: "npc" as const, label: "NPCs" },
  { mode: "portal" as const, label: "Portals" },
];

export function isTilesetEditorMode(mode: EditorMode): mode is TileCategory {
  return mode !== "npc" && mode !== "portal" && mode !== "spawn";
}

export function paletteCategoryForMode(mode: EditorMode): TileCategory | null {
  if (mode === "npc") return "standee";
  if (mode === "spawn" || mode === "portal") return null;
  if (isTilesetEditorMode(mode)) return mode;
  return null;
}
