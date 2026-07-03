"use client";

import { useCallback, useEffect, useState } from "react";

import { getUserDevice } from "@/lib/guardian/device";
import {
  deserializeTransaction,
  serializeTransaction,
} from "@/lib/guardian/solana-tx";
import type { PendingTransactionDocument, WalletSession } from "@/types/agent-wallet";

interface PendingTransactionsProps {
  session: WalletSession | null;
}

export function PendingTransactions({ session }: PendingTransactionsProps) {
  const [pending, setPending] = useState<PendingTransactionDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) {
      setPending([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/guardian/pending?subOrganizationId=${encodeURIComponent(session.subOrganizationId)}`,
      );
      const data = (await response.json()) as {
        pending?: PendingTransactionDocument[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load pending transactions.");
      }

      setPending(data.pending ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function handleApprove(item: PendingTransactionDocument) {
    if (!session) return;

    setApprovingId(item.id);
    setError(null);
    setMessage(null);

    try {
      const device = getUserDevice();
      await device.login(session.subOrganizationId, session.solanaAddress);

      const wallet = device.getWallet(
        session.subOrganizationId,
        session.solanaAddress,
      );

      const unsignedTx = deserializeTransaction(item.serializedTx);
      const signedTx = await wallet.signTransaction(unsignedTx);
      const signedSerializedTx = serializeTransaction(signedTx);

      const response = await fetch(
        `/api/guardian/pending/${item.id}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signedSerializedTx }),
        },
      );

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Approval failed.");
      }

      setMessage(`Approved "${item.description}" with your Passkey.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setApprovingId(null);
    }
  }

  async function handleSeedDemo() {
    if (!session) return;

    setSeeding(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/guardian/pending/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subOrganizationId: session.subOrganizationId,
          transferSol: 1.25,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to simulate agent request.");
      }

      setMessage("Simulated agent queued a 1.25 SOL transfer.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed.");
    } finally {
      setSeeding(false);
    }
  }

  if (!session) {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
        <h2 className="text-lg font-semibold text-zinc-100">
          Pending transactions
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Register your device first to see agent requests.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Pending transactions
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            High-value transfers queued by the agent. Approve with Passkey.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
            onClick={() => void refresh()}
            disabled={loading}
          >
            Refresh
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
            onClick={() => void handleSeedDemo()}
            disabled={seeding}
          >
            {seeding ? "Simulating…" : "Simulate request"}
          </button>
        </div>
      </div>

      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {!loading && pending.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">
          No pending transactions.
        </p>
      ) : (
        <ul className="space-y-3">
          {pending.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="font-medium text-zinc-100">{item.description}</p>
                <p className="text-sm text-zinc-400">
                  {item.transferSol} SOL →{" "}
                  <span className="font-mono text-xs">{item.recipient}</span>
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                onClick={() => void handleApprove(item)}
                disabled={approvingId === item.id}
              >
                {approvingId === item.id ? "Confirm with Passkey…" : "Approve"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
