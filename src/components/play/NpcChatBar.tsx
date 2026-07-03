"use client";

import type { NpcItem } from "@/types/room";
import type { ChatLine } from "@/hooks/useNpcChat";
import { BribePanel } from "@/components/play/BribePanel";

interface NpcChatBarProps {
  npc: NpcItem;
  roomId: string;
  userLines: ChatLine[];
  input: string;
  sending: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
  onBribeVerified: (txSignature: string, playerWallet: string) => void;
}

export function NpcChatBar({
  npc,
  roomId,
  userLines,
  input,
  sending,
  onInputChange,
  onSend,
  onClose,
  onBribeVerified,
}: NpcChatBarProps) {
  const recentUserLines = userLines.slice(-3);

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 border-t border-zinc-700/80 bg-zinc-950/95 backdrop-blur-md">
      <BribePanel
        npc={npc}
        roomId={roomId}
        disabled={sending}
        onBribeVerified={onBribeVerified}
      />
      {recentUserLines.length > 0 && (
        <div className="space-y-0.5 border-b border-zinc-800/80 px-4 py-2">
          {recentUserLines.map((line, i) => (
            <p key={i} className="text-right text-xs text-sky-300/90">
              You: {line.text}
            </p>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
        <div className="min-w-0 flex-1">
          <p className="mb-1 truncate text-[10px] text-zinc-500">
            Talking to {npc.name} · Escape to close
          </p>
          <input
            type="text"
            value={input}
            autoFocus
            disabled={sending}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter" && !sending) onSend();
              if (e.key === "Escape") onClose();
            }}
            placeholder="Type your message…"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 disabled:opacity-60"
          />
        </div>
        <button
          type="button"
          disabled={sending || !input.trim()}
          onClick={onSend}
          className="shrink-0 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {sending ? "…" : "Send"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-zinc-700 px-3 py-2.5 text-xs text-zinc-400 hover:text-zinc-200"
        >
          Close
        </button>
      </div>
    </div>
  );
}
