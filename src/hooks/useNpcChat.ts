"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NpcItem } from "@/types/room";
import { npcAcceptsBribes } from "@/types/room";

export interface ChatLine {
  role: "user" | "npc";
  text: string;
  pending?: boolean;
}

function greetingFor(npc: NpcItem): ChatLine {
  const bribeHint = npcAcceptsBribes(npc)
    ? ` I accept ${npc.bribeAmountSol} SOL bribes — or try to talk your way through.`
    : "";
  return {
    role: "npc",
    text: `Hi, I'm ${npc.name}. ${npc.prompt || "Convince me to unlock the portal."}${bribeHint}`,
  };
}

export function useNpcChat(
  roomId: string,
  npc: NpcItem | null,
  onPassed: (npcId: string) => void,
) {
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [sending, setSending] = useState(false);
  const bribeTxRef = useRef<{
    signature: string;
    playerWallet: string;
  } | null>(null);

  useEffect(() => {
    if (npc) {
      setLines([greetingFor(npc)]);
      setInput("");
      setSending(false);
      bribeTxRef.current = null;
    } else {
      setLines([]);
      setInput("");
      setSending(false);
      bribeTxRef.current = null;
    }
  }, [npc?.id]);

  const registerBribePayment = useCallback(
    (txSignature: string, playerWallet: string) => {
      bribeTxRef.current = { signature: txSignature, playerWallet };
    },
    [],
  );

  const send = useCallback(async () => {
    if (!npc) return;
    const message = input.trim();
    if (!message || sending) return;

    setInput("");
    setSending(true);

    let historyForApi: ChatLine[] = [];
    setLines((prev) => {
      historyForApi = prev.filter((line) => !line.pending);
      return [
        ...prev,
        { role: "user", text: message },
        { role: "npc", text: "Thinking…", pending: true },
      ];
    });

    const bribeTx = bribeTxRef.current;

    try {
      const res = await fetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          npcId: npc.id,
          npcName: npc.name,
          npcPrompt: npc.prompt,
          npcWalletAddress: npc.walletAddress,
          bribeAmountSol: npc.bribeAmountSol,
          message,
          history: historyForApi,
          ...(bribeTx
            ? {
                txSignature: bribeTx.signature,
                playerWallet: bribeTx.playerWallet,
              }
            : {}),
        }),
      });

      let data: {
        passed?: boolean;
        reply?: string;
        error?: string;
        bribeVerified?: boolean;
      } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        data = {};
      }

      let reply: string;
      if (res.ok && data.reply?.trim()) {
        reply = data.reply.trim();
      } else if (!res.ok && data.error === "Invalid request") {
        reply = "Could not send that message. Try closing and reopening chat.";
      } else if (!res.ok) {
        reply =
          "The server had trouble replying (this is a technical error). Try again.";
      } else {
        reply =
          "I'm having trouble responding right now. Try again in a moment.";
      }

      setLines((prev) => {
        const withoutPending = prev.filter((line) => !line.pending);
        return [...withoutPending, { role: "npc", text: reply }];
      });

      if (res.ok && data.passed) onPassed(npc.id);
    } catch {
      setLines((prev) => {
        const withoutPending = prev.filter((line) => !line.pending);
        return [
          ...withoutPending,
          {
            role: "npc",
            text: "Connection error. Check your network and try again.",
          },
        ];
      });
    } finally {
      setSending(false);
    }
  }, [npc, input, sending, roomId, onPassed]);

  const npcLines = lines.filter((line) => line.role === "npc");
  const userLines = lines.filter((line) => line.role === "user");

  return {
    input,
    setInput,
    lines,
    npcLines,
    userLines,
    sending,
    send,
    registerBribePayment,
  };
}
