"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  canOccupyCell,
  gridToWorld,
  lerpPosition,
  type GridCell,
  type WorldPosition,
} from "@/lib/movement";
import { spriteRowFromDelta } from "@/lib/sprite-sheet";
import { isTypingTarget } from "@/lib/keyboard";
import type { RoomDocument } from "@/types/room";

const MOVE_KEYS = new Set([
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
]);

export function usePlayerMovement(
  initial: GridCell,
  blockedCells: Set<string>,
  room: RoomDocument,
  inputPaused = false,
) {
  const [gridPosition, setGridPosition] = useState<GridCell>(initial);
  const [visualPosition, setVisualPosition] = useState<WorldPosition>(() =>
    gridToWorld(initial),
  );
  const [isMoving, setIsMoving] = useState(false);
  const [facingRow, setFacingRow] = useState(2);

  const targetGridRef = useRef<GridCell | null>(null);
  const visualRef = useRef<WorldPosition>(gridToWorld(initial));
  const gridRef = useRef<GridCell>(initial);
  const movingRef = useRef(false);
  const blockedRef = useRef(blockedCells);
  const roomRef = useRef(room);
  const pausedRef = useRef(inputPaused);

  blockedRef.current = blockedCells;
  roomRef.current = room;
  pausedRef.current = inputPaused;

  const snapToGrid = useCallback(() => {
    targetGridRef.current = null;
    movingRef.current = false;
    setIsMoving(false);
    const world = gridToWorld(gridRef.current);
    visualRef.current = world;
    setVisualPosition(world);
  }, []);

  useEffect(() => {
    if (inputPaused) snapToGrid();
  }, [inputPaused, snapToGrid]);

  const beginMove = useCallback((dx: number, dz: number, nx: number, nz: number) => {
    setFacingRow(spriteRowFromDelta(dx, dz));
    targetGridRef.current = { x: nx, z: nz };
    movingRef.current = true;
    setIsMoving(true);
  }, []);

  const tryStartMove = useCallback((dx: number, dz: number) => {
    if (pausedRef.current || movingRef.current) return false;
    const nx = gridRef.current.x + dx;
    const nz = gridRef.current.z + dz;
    if (!canOccupyCell(nx, nz, roomRef.current, blockedRef.current)) return false;
    beginMove(dx, dz, nx, nz);
    return true;
  }, [beginMove]);

  const moveToGrid = useCallback(
    (x: number, z: number) => {
      if (pausedRef.current || movingRef.current) return false;
      if (!canOccupyCell(x, z, roomRef.current, blockedRef.current)) return false;

      const dx = x - gridRef.current.x;
      const dz = z - gridRef.current.z;
      if (dx !== 0 || dz !== 0) {
        setFacingRow(spriteRowFromDelta(dx, dz));
      }

      if (Math.abs(dx) + Math.abs(dz) === 1) {
        beginMove(dx, dz, x, z);
        return true;
      }

      gridRef.current = { x, z };
      setGridPosition({ x, z });
      const world = gridToWorld({ x, z });
      visualRef.current = world;
      setVisualPosition(world);
      targetGridRef.current = null;
      movingRef.current = false;
      setIsMoving(false);
      return true;
    },
    [beginMove],
  );

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;

      const target = targetGridRef.current;
      if (target && movingRef.current) {
        const goal = gridToWorld(target);
        const { position, arrived } = lerpPosition(visualRef.current, goal, delta);
        visualRef.current = position;
        setVisualPosition({ ...position });

        if (arrived) {
          gridRef.current = target;
          setGridPosition(target);
          targetGridRef.current = null;
          movingRef.current = false;
          setIsMoving(false);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (pausedRef.current || isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (!MOVE_KEYS.has(key)) return;
      event.preventDefault();
      if (key === "w" || key === "arrowup") tryStartMove(0, -1);
      if (key === "s" || key === "arrowdown") tryStartMove(0, 1);
      if (key === "a" || key === "arrowleft") tryStartMove(-1, 0);
      if (key === "d" || key === "arrowright") tryStartMove(1, 0);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tryStartMove]);

  const applyJoystick = useCallback(
    (normX: number, normZ: number) => {
      if (pausedRef.current) return;
      const threshold = 0.45;
      if (Math.abs(normX) < threshold && Math.abs(normZ) < threshold) return;
      if (Math.abs(normX) > Math.abs(normZ)) {
        tryStartMove(normX > 0 ? 1 : -1, 0);
      } else {
        tryStartMove(0, normZ > 0 ? 1 : -1);
      }
    },
    [tryStartMove],
  );

  return {
    gridPosition,
    visualPosition,
    isMoving,
    facingRow,
    tryStartMove,
    moveToGrid,
    applyJoystick,
  };
}
