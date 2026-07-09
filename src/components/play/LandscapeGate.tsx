"use client";

import { useCallback, useEffect, useState } from "react";

const GRACE_MS = 12_000;
const DISMISS_KEY = "landscape-gate-dismissed";

export function LandscapeGate({ children }: { children: React.ReactNode }) {
  const [portrait, setPortrait] = useState(false);
  const [graceDone, setGraceDone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedSession = sessionStorage.getItem(DISMISS_KEY) === "1";
    setDismissed(dismissedSession);

    const mq = window.matchMedia("(orientation: portrait)");
    const update = () => setPortrait(mq.matches);

    const graceTimer = window.setTimeout(() => {
      setGraceDone(true);
      update();
    }, GRACE_MS);

    mq.addEventListener("change", update);

    return () => {
      window.clearTimeout(graceTimer);
      mq.removeEventListener("change", update);
    };
  }, []);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }, []);

  const showHardBlock = portrait && graceDone && !dismissed;
  const showSoftHint = portrait && !graceDone && !dismissed;

  return (
    <>
      {children}

      {showSoftHint && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <p className="mx-auto max-w-sm rounded-lg border border-term-yellow/30 bg-zinc-950/90 px-3 py-2 text-center font-mono text-[10px] text-term-yellow shadow-lg backdrop-blur">
            Rotate to landscape for the best view — you can keep playing for now.
          </p>
        </div>
      )}

      {showHardBlock && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950/85 px-6 text-center backdrop-blur-md">
          <div className="mb-6 text-5xl text-zinc-300" aria-hidden>
            ↻
          </div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Rotate to landscape for the best experience
          </h2>
          <p className="mt-2 max-w-xs text-sm text-zinc-400">
            Use the D-pad on the left and Interact on the right.
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="chunky-btn mt-6 rounded-lg px-5 py-2.5 text-xs font-black uppercase text-white"
          >
            Continue in portrait
          </button>
        </div>
      )}
    </>
  );
}
