"use client";

import { forwardRef } from "react";
import { NpcRetroBubble } from "@/components/play/NpcRetroBubble";
import type { NpcItem } from "@/types/room";
import type { ChatLine } from "@/hooks/useNpcChat";

interface NpcSpeechBubbleProps {
  npc: NpcItem;
  lines: ChatLine[];
}

function latestNpcReply(lines: ChatLine[]): ChatLine | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line?.role === "npc") return line;
  }
  return null;
}

export const NpcSpeechBubble = forwardRef<HTMLDivElement, NpcSpeechBubbleProps>(
  function NpcSpeechBubble({ npc, lines }, ref) {
    const latest = latestNpcReply(lines);
    if (!latest) return null;

    return (
      <div
        ref={ref}
        className="pointer-events-none absolute left-0 top-0 z-20 w-[min(85vw,18rem)]"
        style={{ visibility: "hidden", willChange: "transform" }}
      >
        <NpcRetroBubble
          npcName={npc.name}
          text={latest.text}
          pending={latest.pending}
        />
      </div>
    );
  },
);
