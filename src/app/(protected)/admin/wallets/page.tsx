"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { UserProfileBar } from "@/components/UserProfileBar";
import { useAuth } from "@/contexts/AuthContext";
import {
  formatAgentWalletLabel,
  listAgentWallets,
} from "@/lib/firestore/agent-wallets";
import type { AgentWalletDocument } from "@/types/agent-wallet";

export default function AdminWalletsPage() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<AgentWalletDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("Gatekeeper");
  const [guardianName, setGuardianName] = useState("Guardian");
  const [lastCreated, setLastCreated] = useState<{
    guardianLink: string;
    solanaAddress: string;
    subOrganizationId: string;
  } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listAgentWallets();
      setWallets(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load wallets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCreate() {
    if (!user) return;

    setCreating(true);
    setError(null);
    setLastCreated(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/agent-wallet/provision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          guardianName: guardianName.trim(),
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        guardianLink?: string;
        solanaAddress?: string;
        subOrganizationId?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Provisioning failed.");
      }

      if (data.guardianLink && data.solanaAddress && data.subOrganizationId) {
        setLastCreated({
          guardianLink: data.guardianLink,
          solanaAddress: data.solanaAddress,
          subOrganizationId: data.subOrganizationId,
        });
      }

      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provisioning failed.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Dashboard
          </Link>
          <h1 className="text-sm font-semibold">Agent wallets</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/editor"
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Room editor
          </Link>
          <UserProfileBar />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Create agent wallet</h2>
          <p className="text-sm text-zinc-400">
            Provisions an MPC Solana wallet via Turnkey + GCP Secret Manager.
            Then open the guardian link on your phone to register a Passkey.
          </p>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Wallet name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Gatekeeper"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Guardian name (your phone)</span>
            <input
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Guardian"
            />
          </label>
          <button
            type="button"
            disabled={creating || !displayName.trim()}
            onClick={() => void handleCreate()}
            className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create wallet"}
          </button>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </section>

        {lastCreated ? (
          <section className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-5 space-y-3">
            <h3 className="font-medium text-emerald-200">Wallet created</h3>
            <p className="font-mono text-xs break-all text-zinc-300">
              {lastCreated.solanaAddress}
            </p>
            <p className="text-xs text-zinc-400">
              Fund this address on devnet, then open the guardian link on your
              phone:
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={lastCreated.guardianLink}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-medium text-white"
              >
                Open guardian link
              </a>
              <button
                type="button"
                onClick={() =>
                  void navigator.clipboard.writeText(lastCreated.guardianLink)
                }
                className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300"
              >
                Copy link
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              Assign this wallet to an NPC in the room editor (Agent wallet dropdown).
            </p>
          </section>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Registered wallets</h2>
          {loading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : wallets.length === 0 ? (
            <p className="text-sm text-zinc-500">No wallets yet.</p>
          ) : (
            <ul className="space-y-2">
              {wallets.map((wallet) => (
                <li
                  key={wallet.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
                >
                  <p className="text-sm font-medium">{wallet.displayName}</p>
                  <p className="text-xs text-zinc-400">
                    {formatAgentWalletLabel(wallet)}
                  </p>
                  <p className="mt-1 font-mono text-[10px] break-all text-zinc-500">
                    {wallet.solanaAddress}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
