"use client";

import { useEffect, useState } from "react";

import { listAgentWallets } from "@/lib/firestore/agent-wallets";
import type { AgentWalletDocument } from "@/types/agent-wallet";

export function useAgentWallets() {
  const [wallets, setWallets] = useState<AgentWalletDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void listAgentWallets()
      .then((items) => {
        if (!cancelled) setWallets(items);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { wallets, loading };
}
