"use client";

import { useCallback, useRef } from "react";

interface VirtualDpadProps {
  onMove: (dx: number, dz: number) => void;
  className?: string;
}

const REPEAT_MS = 170;

const BTN =
  "flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-500/80 bg-zinc-900/85 text-base font-black text-zinc-100 shadow-lg active:border-sky-400 active:bg-sky-600/50 sm:h-12 sm:w-12";

export function VirtualDpad({ onMove, className = "" }: VirtualDpadProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dirRef = useRef<{ dx: number; dz: number } | null>(null);

  const stopRepeat = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    dirRef.current = null;
  }, []);

  const startRepeat = useCallback(
    (dx: number, dz: number) => {
      dirRef.current = { dx, dz };
      onMove(dx, dz);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        const dir = dirRef.current;
        if (dir) onMove(dir.dx, dir.dz);
      }, REPEAT_MS);
    },
    [onMove],
  );

  const bind = (dx: number, dz: number) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      startRepeat(dx, dz);
    },
    onPointerUp: () => stopRepeat(),
    onPointerCancel: () => stopRepeat(),
    onLostPointerCapture: () => stopRepeat(),
  });

  return (
    <div
      className={`pointer-events-auto touch-none select-none ${className}`}
      aria-label="Movement controls"
    >
      <div className="grid grid-cols-3 grid-rows-3 gap-1.5">
        <div />
        <button type="button" className={BTN} aria-label="Move up" {...bind(0, -1)}>
          ↑
        </button>
        <div />
        <button type="button" className={BTN} aria-label="Move left" {...bind(-1, 0)}>
          ←
        </button>
        <div className="h-11 w-11 rounded-lg border border-zinc-700/40 bg-zinc-950/50 sm:h-12 sm:w-12" />
        <button type="button" className={BTN} aria-label="Move right" {...bind(1, 0)}>
          →
        </button>
        <div />
        <button type="button" className={BTN} aria-label="Move down" {...bind(0, 1)}>
          ↓
        </button>
        <div />
      </div>
    </div>
  );
}
