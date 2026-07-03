"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getPhantomProvider,
  truncateAddress,
} from "@/lib/solana/client";

export function useSolanaWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const provider = getPhantomProvider();
    if (provider?.publicKey) {
      setAddress(provider.publicKey.toBase58());
    }
  }, []);

  const connect = useCallback(async () => {
    const provider = getPhantomProvider();
    if (!provider) {
      setError("Install Phantom wallet to pay bribes on Solana.");
      return null;
    }

    setConnecting(true);
    setError(null);
    try {
      const { publicKey } = await provider.connect();
      const next = publicKey.toBase58();
      setAddress(next);
      return next;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not connect wallet.";
      setError(message);
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    const provider = getPhantomProvider();
    if (provider) {
      try {
        await provider.disconnect();
      } catch {
        // ignore
      }
    }
    setAddress(null);
    setError(null);
  }, []);

  return {
    address,
    shortAddress: address ? truncateAddress(address) : null,
    connecting,
    error,
    hasPhantom: typeof window !== "undefined" && Boolean(getPhantomProvider()),
    connect,
    disconnect,
  };
}
