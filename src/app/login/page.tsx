"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { user, loading, signInWithTwitter, saveEmailConsent } = useAuth();
  const router = useRouter();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  const handleSignIn = async () => {
    if (!acceptedTerms) {
      setError("Please accept the Privacy Policy and Terms of Service.");
      return;
    }

    setError(null);
    setSigningIn(true);
    try {
      await signInWithTwitter();
      if (email.trim()) {
        await saveEmailConsent(email.trim());
      }
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to sign in with X",
      );
    } finally {
      setSigningIn(false);
    }
  };

  if (loading || user) {
    return (
      <div className="scanlines flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-term-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="scanlines flex min-h-screen items-center justify-center px-4">
      <div className="terminal-bezel w-full max-w-md rounded-xl p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-3 w-3 animate-pulse rounded-full bg-term-red shadow-[0_0_8px_#ff3131]" />
          <h1 className="neon-text text-2xl font-black uppercase italic tracking-tighter text-term-blue">
            Agent Trials
          </h1>
          <p className="mt-2 font-mono text-xs text-zinc-500">
            AUTH_TERMINAL // SIGN IN WITH X
          </p>
        </div>

        <div className="mb-4">
          <label
            htmlFor="email"
            className="mb-1.5 block font-mono text-[10px] uppercase text-term-yellow"
          >
            Email (optional)
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="term-input w-full rounded px-3 py-2.5 text-sm"
          />
        </div>

        <label className="mb-6 flex items-start gap-2 font-mono text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 accent-term-green"
          />
          <span>
            I agree to the{" "}
            <Link href="/privacy" className="text-term-blue underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="text-term-blue underline">
              Terms of Service
            </Link>
            .
          </span>
        </label>

        <button
          type="button"
          onClick={() => void handleSignIn()}
          disabled={signingIn}
          className="chunky-btn btn-glow-green flex w-full items-center justify-center gap-3 rounded py-3 text-sm"
        >
          <XIcon />
          {signingIn ? "AUTHENTICATING..." : "SIGN IN WITH X"}
        </button>

        {error && (
          <p className="mt-4 rounded border border-term-red/40 bg-red-950/40 px-3 py-2 text-center font-mono text-xs text-term-red">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
