"use client";

import { useEffect } from "react";
import { isTypingTarget } from "@/lib/keyboard";
import type { NpcItem } from "@/types/room";

interface PlayHudProps {
  touchControls: boolean;
  chatOpen: boolean;
  nearbyNpc: NpcItem | null;
  portalLocked: boolean;
  portalNearby: boolean;
  onTalk: () => void;
  onEnterPortal: () => void;
}

export function PlayHud({
  touchControls,
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

  const showDesktopHud = !touchControls;

  return (
    <>
      {showDesktopHud && (
        <div
          className={`pointer-events-none absolute inset-x-0 z-10 flex flex-col items-center gap-2 px-4 ${
            chatOpen ? "bottom-28" : "bottom-4"
          }`}
        >
          {nearbyNpc && !chatOpen && (
            <p className="rounded-full bg-zinc-900/90 px-4 py-2 text-sm text-zinc-100 shadow">
              Press{" "}
              <kbd className="rounded bg-zinc-700 px-1.5 py-0.5 font-mono text-xs">
                E
              </kbd>{" "}
              to talk to {nearbyNpc.name}
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
      )}

      {/* Touch: fixed right — interact + portal (landscape play) */}
      {touchControls && !chatOpen && (
        <div className="pointer-events-none absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] z-30 flex max-w-[45%] flex-col items-end gap-2">
          {nearbyNpc && (
            <button
              type="button"
              onClick={onTalk}
              className="pointer-events-auto rounded-xl border border-sky-400/60 bg-sky-600 px-5 py-3 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-sky-900/50"
            >
              Interact
              <span className="mt-0.5 block text-[9px] font-semibold normal-case opacity-90">
                {nearbyNpc.name}
              </span>
            </button>
          )}
          {portalNearby && !portalLocked && (
            <button
              type="button"
              onClick={onEnterPortal}
              className="pointer-events-auto rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black uppercase text-white shadow-lg"
            >
              Enter portal
            </button>
          )}
          {portalNearby && portalLocked && (
            <p className="rounded-xl bg-red-950/90 px-4 py-2 text-[10px] font-semibold text-red-200 shadow">
              Portal locked
            </p>
          )}
        </div>
      )}
    </>
  );
}
