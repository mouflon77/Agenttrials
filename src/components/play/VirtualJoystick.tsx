"use client";

import { useCallback, useRef } from "react";

interface VirtualJoystickProps {
  onMove: (normX: number, normZ: number) => void;
  onEnd?: () => void;
  className?: string;
}

export function VirtualJoystick({
  onMove,
  onEnd,
  className = "",
}: VirtualJoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dirRef = useRef({ x: 0, z: 0 });

  const resetStick = useCallback(() => {
    if (stickRef.current) {
      stickRef.current.style.transform = "translate(-50%, -50%)";
    }
    dirRef.current = { x: 0, z: 0 };
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onEnd?.();
  }, [onEnd]);

  const updateStick = useCallback(
    (clientX: number, clientY: number) => {
      const base = baseRef.current;
      const stick = stickRef.current;
      if (!base || !stick) return;

      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const maxR = rect.width * 0.35;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > maxR) {
        dx = (dx / dist) * maxR;
        dy = (dy / dist) * maxR;
      }
      stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

      const normX = dx / maxR;
      const normZ = dy / maxR;
      dirRef.current = { x: normX, z: normZ };
    },
    [],
  );

  const startRepeat = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      const { x, z } = dirRef.current;
      onMove(x, z);
    }, 220);
  }, [onMove]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (touchIdRef.current !== null) return;
    touchIdRef.current = event.pointerId;
    baseRef.current?.setPointerCapture(event.pointerId);
    updateStick(event.clientX, event.clientY);
    startRepeat();
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (touchIdRef.current !== event.pointerId) return;
    updateStick(event.clientX, event.clientY);
  };

  const onPointerUp = (event: React.PointerEvent) => {
    if (touchIdRef.current !== event.pointerId) return;
    touchIdRef.current = null;
    resetStick();
  };

  return (
    <div
      className={`pointer-events-auto touch-none select-none ${className}`}
    >
      <div
        ref={baseRef}
        className="relative h-28 w-28 rounded-full border border-zinc-600/80 bg-zinc-900/60 backdrop-blur"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={stickRef}
          className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-500/60 bg-sky-500/40 shadow-lg"
          style={{ transform: "translate(-50%, -50%)" }}
        />
      </div>
    </div>
  );
}
