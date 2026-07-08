"use client";

import { forwardRef, useEffect, useRef } from "react";
import type { NpcItem } from "@/types/room";
import type { ChatLine } from "@/hooks/useNpcChat";

interface NpcSpeechBubbleProps {
  npc: NpcItem;
  lines: ChatLine[];
}

export const NpcSpeechBubble = forwardRef<HTMLDivElement, NpcSpeechBubbleProps>(
  function NpcSpeechBubble({ npc, lines }, ref) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const visibleLines = lines.slice(-2);

    useEffect(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }, [lines]);

    return (
      <div
        ref={ref}
        className="pointer-events-none absolute left-0 top-0 z-20 w-[min(72vw,15rem)]"
        style={{ visibility: "hidden", willChange: "transform" }}
      >
        <div className="rounded-xl border border-zinc-600/80 bg-zinc-950/95 px-3 py-2.5 shadow-lg backdrop-blur-sm">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-sky-400">
            {npc.name}
          </p>
          <div
            ref={scrollRef}
            className="max-h-28 space-y-1.5 overflow-y-auto text-xs leading-relaxed text-zinc-100"
          >
            {visibleLines.map((line, i) => (
              <p
                key={i}
                className={line.pending ? "italic text-zinc-500" : undefined}
              >
                {line.text}
              </p>
            ))}
          </div>
        </div>
        <div
          className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[9px] border-t-[10px] border-x-transparent border-t-zinc-600/80"
          aria-hidden
        />
        <div
          className="absolute left-1/2 top-[calc(100%-1px)] h-0 w-0 -translate-x-1/2 border-x-[8px] border-t-[9px] border-x-transparent border-t-zinc-950/95"
          aria-hidden
        />
      </div>
    );
  },
);
