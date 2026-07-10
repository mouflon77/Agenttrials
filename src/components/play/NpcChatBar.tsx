"use client";

import { useMemo, useState } from "react";
import { KeywordProgressLights } from "@/components/play/KeywordProgressLights";
import type { KeywordProgress } from "@/lib/gatekeeper-keywords";
import type { ChatLine } from "@/hooks/useNpcChat";
import type { NpcItem } from "@/types/room";
import { BribePanel } from "@/components/play/BribePanel";
import { NpcRetroBubble } from "@/components/play/NpcRetroBubble";

interface NpcChatBarProps {
  npc: NpcItem;
  roomId: string;
  lines: ChatLine[];
  input: string;
  sending: boolean;
  isMobile?: boolean;
  keywordProgress?: KeywordProgress | null;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
  onBribeVerified: (txSignature: string, playerWallet: string) => void;
}

function latestNpcReply(lines: ChatLine[]): ChatLine | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line?.role === "npc") return line;
  }
  return null;
}

export function NpcChatBar({
  npc,
  roomId,
  lines,
  input,
  sending,
  isMobile = false,
  keywordProgress = null,
  onInputChange,
  onSend,
  onClose,
  onBribeVerified,
}: NpcChatBarProps) {
  const [logOpen, setLogOpen] = useState(false);
  const latestNpc = useMemo(() => latestNpcReply(lines), [lines]);

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-30 border-t-4 border-black bg-zinc-950/98 backdrop-blur-md"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <BribePanel
        npc={npc}
        roomId={roomId}
        disabled={sending}
        onBribeVerified={onBribeVerified}
      />

      {/* Mobile / in-panel retro bubble — latest NPC line only */}
      {isMobile && latestNpc && (
        <div className="border-b-4 border-black px-3 py-3">
          <NpcRetroBubble
            npcName={npc.name}
            text={latestNpc.text}
            pending={latestNpc.pending}
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-2">
        <p className="truncate font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          Negotiating with {npc.name}
        </p>
        <KeywordProgressLights progress={keywordProgress} compact />
      </div>

      <div className="border-b border-zinc-800">
        <button
          type="button"
          onClick={() => setLogOpen((open) => !open)}
          className="flex w-full items-center justify-between px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-term-blue hover:bg-black/40"
        >
          <span>Conversation script</span>
          <span className="text-zinc-500">{logOpen ? "▲" : "▼"}</span>
        </button>
        {logOpen && (
          <div
            className={`space-y-2 overflow-y-auto border-t border-zinc-800 bg-black/50 px-4 py-3 ${
              isMobile ? "max-h-40" : "max-h-48"
            }`}
          >
            {lines.length === 0 ? (
              <p className="font-mono text-xs text-zinc-600">No messages yet.</p>
            ) : (
              lines.map((line, i) => (
                <p
                  key={`${line.role}-${i}-${line.text.slice(0, 16)}`}
                  className={`font-mono text-xs leading-relaxed ${
                    line.role === "user"
                      ? "text-right text-sky-300/90"
                      : "text-left text-[#f4e4bc]"
                  } ${line.pending ? "italic opacity-70" : ""}`}
                >
                  {line.role === "user" ? "YOU: " : `${npc.name.toUpperCase()}: `}
                  {line.text}
                </p>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
        <div className="min-w-0 flex-1">
          <p className="mb-1 truncate font-mono text-[10px] text-zinc-500">
            Reply to {npc.name}
            {isMobile ? " · Tap outside to close" : " · Escape to close"}
          </p>
          <input
            type="text"
            value={input}
            autoFocus={!isMobile}
            disabled={sending}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter" && !sending) onSend();
              if (e.key === "Escape") onClose();
            }}
            placeholder="Type your message…"
            className="w-full rounded-lg border-2 border-zinc-700 bg-zinc-900 px-3 py-2.5 font-mono text-sm text-zinc-100 placeholder:text-zinc-500 disabled:opacity-60"
          />
        </div>
        <button
          type="button"
          disabled={sending || !input.trim()}
          onClick={onSend}
          className="chunky-btn shrink-0 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
        >
          {sending ? "…" : "Send"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border-2 border-zinc-700 px-3 py-2.5 font-mono text-xs text-zinc-400 hover:text-zinc-200"
        >
          Close
        </button>
      </div>
    </div>
  );
}
