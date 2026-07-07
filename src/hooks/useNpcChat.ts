"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import { subscribeToNegotiationChat } from "@/lib/firestore/negotiation-chat";
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
    : " Convince me if you want the portal unlocked.";
  return {
    role: "npc",
    text: `Hi, I'm ${npc.name}.${bribeHint}`,
  };
}

function linesFromStored(
  messages: Array<{ role: "user" | "npc"; text: string }>,
  npc: NpcItem,
): ChatLine[] {
  if (messages.length === 0) return [greetingFor(npc)];
  return messages.map((m) => ({ role: m.role, text: m.text }));
}

export function useNpcChat(
  gameId: string | null | undefined,
  roomId: string,
  npc: NpcItem | null,
  userId: string | null | undefined,
  onPassed: (npcId: string) => void,
) {
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [sending, setSending] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const bribeTxRef = useRef<{
    signature: string;
    playerWallet: string;
  } | null>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    sendingRef.current = sending;
  }, [sending]);

  useEffect(() => {
    if (!npc) {
      setLines([]);
      setInput("");
      setSending(false);
      setHistoryLoading(false);
      bribeTxRef.current = null;
      return;
    }

    if (!userId || !gameId) {
      setLines([greetingFor(npc)]);
      setInput("");
      setSending(false);
      setHistoryLoading(false);
      bribeTxRef.current = null;
      return;
    }

    setHistoryLoading(true);
    setInput("");
    setSending(false);
    bribeTxRef.current = null;

    const unsub = subscribeToNegotiationChat(userId, gameId, roomId, npc.id, (chat) => {
      setHistoryLoading(false);
      if (sendingRef.current) return;
      setLines(linesFromStored(chat?.messages ?? [], npc));
      if (chat?.passed) onPassed(npc.id);
    });

    return unsub;
  }, [npc?.id, roomId, gameId, userId, onPassed, npc]);

  const registerBribePayment = useCallback(
    (txSignature: string, playerWallet: string) => {
      bribeTxRef.current = { signature: txSignature, playerWallet };
    },
    [],
  );

  const send = useCallback(async () => {
    if (!npc || !userId || !gameId) return;
    const message = input.trim();
    if (!message || sending) return;

    const user = getFirebaseAuth().currentUser;
    if (!user) return;

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
      const token = await user.getIdToken(true);
      const res = await fetch("/api/negotiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameId,
          roomId,
          npcId: npc.id,
          npcName: npc.name,
          npcPrompt: npc.prompt,
          npcStats: npc.stats,
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
      } else if (!res.ok && data.error?.includes("token")) {
        reply = "Session expired — sign out and sign in again.";
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
  }, [npc, gameId, userId, input, sending, roomId, onPassed]);

  const npcLines = lines.filter((line) => line.role === "npc");
  const userLines = lines.filter((line) => line.role === "user");

  return {
    input,
    setInput,
    lines,
    npcLines,
    userLines,
    sending: sending || historyLoading,
    send,
    registerBribePayment,
  };
}
