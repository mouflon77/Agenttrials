"use client";

import { useCallback, useEffect, useState } from "react";

function isMobilePlayDevice(): boolean {
  if (typeof window === "undefined") return false;
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  if (!hasTouch) return false;
  const landscape = window.matchMedia("(orientation: landscape)").matches;
  const shortEdge = landscape ? window.innerHeight : window.innerWidth;
  return shortEdge <= 520;
}

function isPortrait(): boolean {
  return window.matchMedia("(orientation: portrait)").matches;
}

function isFullscreenActive(): boolean {
  return Boolean(document.fullscreenElement);
}

function canRequestFullscreen(): boolean {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  return (
    typeof el.requestFullscreen === "function" ||
    typeof el.webkitRequestFullscreen === "function"
  );
}

/**
 * On phones/tablets: hard-require landscape (and fullscreen when the browser
 * supports it) before play. Desktop is unaffected.
 */
export function LandscapeGate({ children }: { children: React.ReactNode }) {
  const [mobile, setMobile] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [fullscreen, setFullscreen] = useState(true);
  const [fsSupported, setFsSupported] = useState(false);
  const [fsError, setFsError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const nextMobile = isMobilePlayDevice();
    const supported = canRequestFullscreen();
    setMobile(nextMobile);
    setPortrait(isPortrait());
    setFsSupported(supported);
    // If the browser can't do fullscreen (common on iOS Safari), only gate on landscape.
    setFullscreen(!nextMobile || !supported || isFullscreenActive());
  }, []);

  useEffect(() => {
    refresh();
    const mq = window.matchMedia("(orientation: portrait)");
    const onOrientation = () => refresh();
    const onFs = () => refresh();

    mq.addEventListener("change", onOrientation);
    window.addEventListener("resize", onOrientation);
    window.addEventListener("orientationchange", onOrientation);
    document.addEventListener("fullscreenchange", onFs);

    return () => {
      mq.removeEventListener("change", onOrientation);
      window.removeEventListener("resize", onOrientation);
      window.removeEventListener("orientationchange", onOrientation);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [refresh]);

  const enterFullscreen = useCallback(async () => {
    setFsError(null);
    try {
      const el = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void> | void;
      };
      if (!document.fullscreenElement) {
        if (typeof el.requestFullscreen === "function") {
          await el.requestFullscreen();
        } else if (typeof el.webkitRequestFullscreen === "function") {
          await el.webkitRequestFullscreen();
        }
      }
      refresh();
    } catch {
      setFsError(
        "Fullscreen was blocked. Tap Allow / try again, or use your browser’s fullscreen option.",
      );
      refresh();
    }
  }, [refresh]);

  const needsFullscreen = mobile && fsSupported && !fullscreen;
  const blocked = mobile && (portrait || needsFullscreen);

  return (
    <>
      {children}

      {blocked && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950 px-6 text-center">
          <div
            className="mb-5 font-mono text-5xl text-term-yellow"
            aria-hidden
          >
            {portrait ? "↻" : "⛶"}
          </div>
          <h2 className="text-lg font-black uppercase tracking-wide text-zinc-100">
            {portrait
              ? "Turn your phone sideways"
              : "Go fullscreen to play"}
          </h2>
          <p className="mt-3 max-w-sm font-mono text-xs leading-relaxed text-zinc-400">
            {portrait
              ? "Portrait hides the D-pad and interact buttons. Rotate to landscape first."
              : "Fullscreen keeps controls on screen and stops the browser chrome from covering them."}
          </p>

          {!portrait && needsFullscreen && (
            <button
              type="button"
              onClick={() => void enterFullscreen()}
              className="chunky-btn btn-glow-green mt-8 rounded-lg px-6 py-3 text-xs font-black uppercase text-white"
            >
              Enter fullscreen & play
            </button>
          )}

          {portrait && (
            <p className="mt-8 font-mono text-[10px] uppercase tracking-widest text-term-yellow">
              Waiting for landscape…
            </p>
          )}

          {fsError && (
            <p className="mt-4 max-w-sm font-mono text-[10px] text-term-red">
              {fsError}
            </p>
          )}
        </div>
      )}
    </>
  );
}
