"use client";

import { useEffect, useState } from "react";
import type { NpcItem } from "@/types/room";

interface PlayHudProps {
  nearbyNpc: NpcItem | null;
  portalLocked: boolean;
  portalNearby: boolean;
  onTalk: () => void;
  onEnterPortal: () => void;
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

export function PlayHud({
  nearbyNpc,
  portalLocked,
  portalNearby,
  onTalk,
  onEnterPortal,
}: PlayHudProps) {
  const isMobile = useIsMobile();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "e" && nearbyNpc) {
        event.preventDefault();
        onTalk();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nearbyNpc, onTalk]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex flex-col items-center gap-2 px-4">
      {nearbyNpc && (
        isMobile ? (
          <button
            type="button"
            onClick={onTalk}
            className="pointer-events-auto rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-lg"
          >
            Chat with {nearbyNpc.name}
          </button>
        ) : (
          <p className="rounded-full bg-zinc-900/90 px-4 py-2 text-sm text-zinc-100 shadow">
            Press <kbd className="rounded bg-zinc-700 px-1.5 py-0.5 font-mono text-xs">E</kbd> to
            talk to {nearbyNpc.name}
          </p>
        )
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
            : isMobile
              ? "Tap the portal to enter"
              : "Walk into the portal to continue"}
        </p>
      )}
      {portalNearby && !portalLocked && isMobile && (
        <button
          type="button"
          onClick={onEnterPortal}
          className="pointer-events-auto rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg"
        >
          Enter portal
        </button>
      )}
      <p className="text-[10px] text-zinc-500">
        WASD / arrow keys to move · click floor to walk
      </p>
    </div>
  );
}
