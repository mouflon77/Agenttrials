"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { PendingTransactions } from "@/components/guardian/PendingTransactions";
import { RegisterDeviceButton } from "@/components/guardian/RegisterDeviceButton";
import { parseSetupLink } from "@/lib/guardian/link-setup";
import { loadWalletSession } from "@/lib/guardian/wallet-session";
import type { WalletSession } from "@/types/agent-wallet";

export default function GuardianPage() {
  const [session, setSession] = useState<WalletSession | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [linkSetup, setLinkSetup] = useState<{
    walletName: string;
    userName: string;
    subOrganizationId?: string;
    solanaAddress?: string;
  } | null>(null);

  useEffect(() => {
    setSession(loadWalletSession());

    const setupParam = new URLSearchParams(window.location.search).get("setup");
    if (!setupParam) return;

    try {
      const payload = parseSetupLink(setupParam);
      if (!payload) return;

      setLinkSetup({
        walletName: payload.walletName,
        userName: payload.userName,
        subOrganizationId: payload.subOrganizationId,
        solanaAddress: payload.solanaAddress,
      });
    } catch (error) {
      setSetupError(
        error instanceof Error ? error.message : "Invalid setup link.",
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-sky-400/80">
              Agent wallet guardian
            </p>
            <h1 className="text-xl font-semibold">Co-sign approvals</h1>
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Back to app
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <p className="text-sm text-zinc-400">
          Your phone is the co-signer for AI agent wallets. Register with a
          Passkey, then approve large transfers with Face ID / Touch ID.
        </p>

        {linkSetup ? (
          <section className="rounded-xl border border-sky-800/50 bg-sky-950/20 p-4 text-sm text-sky-100 space-y-2">
            <p>
              Linked from admin — wallet{" "}
              <strong>{linkSetup.walletName}</strong> for{" "}
              <strong>{linkSetup.userName}</strong>.
            </p>
            {linkSetup.solanaAddress ? (
              <p className="font-mono text-xs break-all text-zinc-300">
                Fund with devnet SOL: {linkSetup.solanaAddress}
              </p>
            ) : null}
          </section>
        ) : (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400">
            Open the guardian link from{" "}
            <Link href="/admin/wallets" className="text-sky-400 hover:underline">
              Admin → Agent wallets
            </Link>{" "}
            to register a new wallet.
          </section>
        )}

        {setupError ? (
          <section className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
            {setupError}
          </section>
        ) : null}

        {session ? (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-300 space-y-1">
            <p>
              Signed in as <strong>{session.displayName}</strong>
            </p>
            <p className="font-mono text-xs break-all">{session.solanaAddress}</p>
          </section>
        ) : null}

        <RegisterDeviceButton
          onRegistered={setSession}
          initialUserName={linkSetup?.userName}
          initialWalletName={linkSetup?.walletName}
          initialSubOrganizationId={linkSetup?.subOrganizationId}
          initialSolanaAddress={linkSetup?.solanaAddress}
        />

        <PendingTransactions session={session} />
      </main>
    </div>
  );
}
