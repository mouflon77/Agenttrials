import { floorIndex, GRID_SIZE, type RoomDocument } from "@/types/room";

export interface GridCell {
  x: number;
  z: number;
}

export interface WorldPosition {
  /** Center of tile in world X */
  x: number;
  /** Center of tile in world Z */
  z: number;
}

export function gridToWorld(cell: GridCell): WorldPosition {
  return { x: cell.x + 0.5, z: cell.z + 0.5 };
}

/** Grid cell containing a world position (tile spans [n, n+1)). */
export function worldToGrid(world: WorldPosition): GridCell {
  return {
    x: Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(world.x))),
    z: Math.min(GRID_SIZE - 1, Math.max(0, Math.floor(world.z))),
  };
}

export function isInBounds(x: number, z: number): boolean {
  return x >= 0 && z >= 0 && x < GRID_SIZE && z < GRID_SIZE;
}

export function isFloorWalkable(x: number, z: number, room: RoomDocument): boolean {
  if (!isInBounds(x, z)) return false;
  return floorIndex(x, z) in room.floorGrid;
}

export function canOccupyCell(
  x: number,
  z: number,
  room: RoomDocument,
  blocked: Set<string>,
): boolean {
  if (!isFloorWalkable(x, z, room)) return false;
  return !blocked.has(`${x},${z}`);
}

export const MOVE_LERP_SPEED = 9;

export function lerpPosition(
  current: WorldPosition,
  target: WorldPosition,
  delta: number,
): { position: WorldPosition; arrived: boolean } {
  const dx = target.x - current.x;
  const dz = target.z - current.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.02) {
    return { position: { ...target }, arrived: true };
  }
  const step = Math.min(dist, MOVE_LERP_SPEED * delta);
  return {
    position: {
      x: current.x + (dx / dist) * step,
      z: current.z + (dz / dist) * step,
    },
    arrived: false,
  };
}
