"use client";

import { useCallback, useState } from "react";
import type { NpcItem } from "@/types/room";
import { npcAcceptsBribes } from "@/types/room";
import { sendSolBribe, truncateAddress } from "@/lib/solana/client";
import { useSolanaWallet } from "@/hooks/useSolanaWallet";

interface BribePanelProps {
  npc: NpcItem;
  roomId: string;
  disabled?: boolean;
  onBribeVerified: (txSignature: string, playerWallet: string) => void;
}

export function BribePanel({
  npc,
  roomId,
  disabled,
  onBribeVerified,
}: BribePanelProps) {
  const {
    address,
    shortAddress,
    connecting,
    error: walletError,
    hasPhantom,
    connect,
    disconnect,
  } = useSolanaWallet();

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const walletAddress = npc.walletAddress?.trim() ?? "";
  const bribeAmount = npc.bribeAmountSol ?? 0;
  const acceptsBribes = npcAcceptsBribes(npc);

  const payBribe = useCallback(async () => {
    if (!acceptsBribes || !address) return;

    setPaying(true);
    setPayError(null);

    try {
      const signature = await sendSolBribe(
        address,
        walletAddress,
        bribeAmount,
      );
      setLastTx(signature);

      const res = await fetch("/api/wallet/verify-bribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          npcId: npc.id,
          txSignature: signature,
          playerWallet: address,
          npcWallet: walletAddress,
          minAmountSol: bribeAmount,
        }),
      });

      const data = (await res.json()) as {
        verified?: boolean;
        error?: string;
      };

      if (!res.ok || !data.verified) {
        setPayError(data.error ?? "Payment could not be verified on chain.");
        return;
      }

      onBribeVerified(signature, address);
    } catch (err) {
      setPayError(
        err instanceof Error ? err.message : "Payment failed. Try again.",
      );
    } finally {
      setPaying(false);
    }
  }, [
    acceptsBribes,
    address,
    walletAddress,
    bribeAmount,
    roomId,
    npc.id,
    onBribeVerified,
  ]);

  if (!acceptsBribes) return null;

  return (
    <div className="border-b border-zinc-800/80 px-4 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-amber-400/90">
          Agent wallet · bribe
        </p>
        <p className="text-[10px] text-zinc-500">
          {bribeAmount} SOL → {truncateAddress(walletAddress, 6)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {address ? (
          <>
            <span className="rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-300">
              {shortAddress}
            </span>
            <button
              type="button"
              onClick={() => void disconnect()}
              className="text-[10px] text-zinc-500 hover:text-zinc-300"
            >
              Disconnect
            </button>
            <button
              type="button"
              disabled={disabled || paying}
              onClick={() => void payBribe()}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {paying ? "Paying…" : `Pay ${bribeAmount} SOL`}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={disabled || connecting || !hasPhantom}
            onClick={() => void connect()}
            className="rounded-lg border border-amber-600/60 px-3 py-1.5 text-xs text-amber-300 disabled:opacity-50"
          >
            {connecting
              ? "Connecting…"
              : hasPhantom
                ? "Connect Phantom"
                : "Install Phantom wallet"}
          </button>
        )}
      </div>

      {(walletError || payError) && (
        <p className="mt-1.5 text-[10px] text-red-400">
          {payError ?? walletError}
        </p>
      )}

      {lastTx && !payError && (
        <p className="mt-1 text-[10px] text-emerald-400/90">
          Paid — tell the NPC you sent the bribe.
        </p>
      )}
    </div>
  );
}
