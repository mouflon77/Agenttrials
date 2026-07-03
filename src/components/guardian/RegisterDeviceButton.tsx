"use client";

import { useEffect, useState } from "react";

import { getUserDevice } from "@/lib/guardian/device";
import { loadWalletSession, saveWalletSession } from "@/lib/guardian/wallet-session";
import type { WalletSession } from "@/types/agent-wallet";

interface RegisterDeviceButtonProps {
  onRegistered: (session: WalletSession) => void;
  initialUserName?: string;
  initialWalletName?: string;
  initialSubOrganizationId?: string;
  initialSolanaAddress?: string;
}

export function RegisterDeviceButton({
  onRegistered,
  initialUserName,
  initialWalletName,
  initialSubOrganizationId,
  initialSolanaAddress,
}: RegisterDeviceButtonProps) {
  const [displayName, setDisplayName] = useState(initialUserName ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const requiresVerification = Boolean(
    initialSubOrganizationId && initialSolanaAddress,
  );

  useEffect(() => {
    if (initialUserName) setDisplayName(initialUserName);
  }, [initialUserName]);

  async function handleRegister() {
    if (!displayName.trim()) {
      setError("Enter your name first.");
      return;
    }

    if (requiresVerification && !verified) {
      setError("Confirm the wallet address matches admin before registering.");
      return;
    }

    if (!initialSubOrganizationId?.trim()) {
      setError("Missing wallet id — open the guardian link from admin.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const device = getUserDevice();
      const passkey = await device.registerPasskey(displayName.trim());

      const response = await fetch("/api/guardian/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          subOrganizationId: initialSubOrganizationId,
          passkey,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        subOrganizationId?: string;
        solanaAddress?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Registration failed.");
      }

      if (
        initialSolanaAddress &&
        data.solanaAddress &&
        data.solanaAddress !== initialSolanaAddress
      ) {
        throw new Error(
          "Wallet address mismatch — do not register. Check your admin link.",
        );
      }

      const session: WalletSession = {
        displayName: displayName.trim(),
        subOrganizationId: data.subOrganizationId ?? initialSubOrganizationId,
        solanaAddress: data.solanaAddress ?? initialSolanaAddress ?? "",
      };

      saveWalletSession(session);
      onRegistered(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  const existing = loadWalletSession();

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Register device</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Create a Passkey on this device (Face ID / Touch ID). You become the
          guardian for this agent wallet and approve large transfers.
        </p>
      </div>

      {requiresVerification ? (
        <div className="rounded-lg border border-amber-600/40 bg-amber-950/30 p-4 space-y-3">
          <p className="text-sm font-medium text-amber-100">
            Confirm this is the wallet from admin
          </p>
          <div className="space-y-1 font-mono text-xs break-all text-zinc-200">
            <p>
              <span className="text-zinc-500">Sub-org:</span>{" "}
              {initialSubOrganizationId}
            </p>
            <p>
              <span className="text-zinc-500">Address:</span>{" "}
              {initialSolanaAddress}
            </p>
          </div>
          <label className="flex items-start gap-2 text-sm text-zinc-200 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
              disabled={loading || Boolean(existing)}
            />
            <span>I verified these match the admin wallet setup screen</span>
          </label>
        </div>
      ) : null}

      {existing ? (
        <p className="text-sm text-emerald-400">
          Device already registered as <strong>{existing.displayName}</strong>.
        </p>
      ) : (
        <label className="block space-y-2">
          <span className="text-sm text-zinc-400">Your name</span>
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            placeholder="Alice"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
          />
        </label>
      )}

      {initialWalletName ? (
        <p className="text-xs text-zinc-500">
          Wallet: <span className="text-zinc-300">{initialWalletName}</span>
        </p>
      ) : null}

      <button
        type="button"
        className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        onClick={() => void handleRegister()}
        disabled={
          loading ||
          Boolean(existing) ||
          (requiresVerification && !verified)
        }
      >
        {loading ? "Waiting for Passkey…" : "Register device"}
      </button>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </section>
  );
}
