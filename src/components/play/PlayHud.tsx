"use client";

import { useEffect } from "react";
import { isTypingTarget } from "@/lib/keyboard";
import type { NpcItem } from "@/types/room";

interface PlayHudProps {
  isMobile: boolean;
  chatOpen: boolean;
  nearbyNpc: NpcItem | null;
  portalLocked: boolean;
  portalNearby: boolean;
  onTalk: () => void;
  onEnterPortal: () => void;
}

export function PlayHud({
  isMobile,
  chatOpen,
  nearbyNpc,
  portalLocked,
  portalNearby,
  onTalk,
  onEnterPortal,
}: PlayHudProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (chatOpen || isTypingTarget(event.target)) return;
      if (event.key.toLowerCase() === "e" && nearbyNpc) {
        event.preventDefault();
        onTalk();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nearbyNpc, onTalk, chatOpen]);

  return (
    <>
      {/* Desktop: bottom-center prompts */}
      <div
        className={`pointer-events-none absolute inset-x-0 z-10 hidden flex-col items-center gap-2 px-4 md:flex ${
          chatOpen ? "bottom-28" : "bottom-4"
        }`}
      >
        {nearbyNpc && !chatOpen && (
          <p className="rounded-full bg-zinc-900/90 px-4 py-2 text-sm text-zinc-100 shadow">
            Press <kbd className="rounded bg-zinc-700 px-1.5 py-0.5 font-mono text-xs">E</kbd> to
            talk to {nearbyNpc.name}
          </p>
        )}
        {portalNearby && (
          <p
            className={`rounded-full px-4 py-2 text-sm shadow ${
              portalLocked
                ? "bg-red-950/90 text-red-200"
                : "bg-emerald-950/90 text-emerald-200"
            }`}
          >
            {portalLocked
              ? "Portal locked — negotiate with the NPC"
              : "Walk into the portal to continue"}
          </p>
        )}
        <p className="text-[10px] text-zinc-500">
          {chatOpen
            ? "Type below to reply"
            : "WASD / arrows to move · scroll to zoom"}
        </p>
      </div>

      {/* Mobile: top-right actions — clear of bottom-left joystick */}
      <div className="pointer-events-none absolute right-3 top-3 z-20 flex max-w-[55%] flex-col items-end gap-2 md:hidden">
        {nearbyNpc && !chatOpen && (
          <button
            type="button"
            onClick={onTalk}
            className="pointer-events-auto rounded-full bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg"
          >
            Chat · {nearbyNpc.name}
          </button>
        )}
        {portalNearby && !portalLocked && (
          <button
            type="button"
            onClick={onEnterPortal}
            className="pointer-events-auto rounded-full bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg"
          >
            Enter portal
          </button>
        )}
        {portalNearby && portalLocked && (
          <p className="rounded-full bg-red-950/90 px-3 py-1.5 text-[10px] text-red-200 shadow">
            Portal locked
          </p>
        )}
      </div>

      {/* Mobile: hint above joystick zone */}
      {isMobile && !nearbyNpc && !portalNearby && (
        <p className="pointer-events-none absolute bottom-36 left-4 z-10 text-[10px] text-zinc-500 md:hidden">
          Use joystick to move
        </p>
      )}
    </>
  );
}
