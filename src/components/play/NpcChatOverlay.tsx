"use client";

import { useEffect, useRef, useState } from "react";
import type { NpcItem } from "@/types/room";

interface NpcChatOverlayProps {
  npc: NpcItem;
  roomId: string;
  onClose: () => void;
  onPassed: (npcId: string) => void;
}

interface ChatLine {
  role: "user" | "npc";
  text: string;
}

export function NpcChatOverlay({
  npc,
  roomId,
  onClose,
  onPassed,
}: NpcChatOverlayProps) {
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<ChatLine[]>([
    {
      role: "npc",
      text: `Hi, I'm ${npc.name}. ${npc.prompt || "Convince me to unlock the portal."}`,
    },
  ]);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  const send = async () => {
    const message = input.trim();
    if (!message || sending) return;

    setInput("");
    setLines((prev) => [...prev, { role: "user", text: message }]);
    setSending(true);

    try {
      const res = await fetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          npcId: npc.id,
          npcName: npc.name,
          npcPrompt: npc.prompt,
          message,
          history: lines,
        }),
      });
      const data = (await res.json()) as { passed?: boolean; reply?: string };
      const reply = data.reply ?? "…";
      setLines((prev) => [...prev, { role: "npc", text: reply }]);
      if (data.passed) onPassed(npc.id);
    } catch {
      setLines((prev) => [
        ...prev,
        { role: "npc", text: "Something went wrong. Try again." },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">{npc.name}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Close
          </button>
        </div>
        <div
          ref={scrollRef}
          className="flex-1 space-y-2 overflow-y-auto px-4 py-3 text-sm"
        >
          {lines.map((line, i) => (
            <p
              key={i}
              className={
                line.role === "user"
                  ? "ml-8 text-right text-sky-300"
                  : "mr-8 text-zinc-200"
              }
            >
              {line.text}
            </p>
          ))}
        </div>
        <div className="flex gap-2 border-t border-zinc-800 p-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
            placeholder="Type your message…"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
          <button
            type="button"
            disabled={sending || !input.trim()}
            onClick={() => void send()}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
