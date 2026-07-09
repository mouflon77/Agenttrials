import type { GeneratedNpcPuzzle, GameSaveDocument } from "@/types/game";
import type { NpcItem } from "@/types/room";
import { normalizeGatekeeperStats, parsePassKeywords } from "@/types/room";

/** Apply per-game generated puzzle overrides to a room NPC template. */
export function applyGamePuzzleToNpc(
  npc: NpcItem,
  game: Pick<GameSaveDocument, "npcPuzzles"> | null | undefined,
  roomId: string,
): NpcItem {
  const puzzle = game?.npcPuzzles?.[roomId]?.[npc.id];
  if (!puzzle) return npc;
  const roomKeywords = parsePassKeywords(npc.passKeywords);
  return {
    ...npc,
    prompt: puzzle.prompt,
    passKeywords:
      roomKeywords.length > 0 ? npc.passKeywords : puzzle.passKeywords,
    stats: normalizeGatekeeperStats(puzzle.stats),
  };
}

export function puzzleToNpcFields(puzzle: GeneratedNpcPuzzle) {
  return {
    prompt: puzzle.prompt,
    passKeywords: puzzle.passKeywords,
    passHint: puzzle.passHint,
    stats: normalizeGatekeeperStats(puzzle.stats),
  };
}
