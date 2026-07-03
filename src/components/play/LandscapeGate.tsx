"use client";

import { useEffect, useState } from "react";

export function LandscapeGate({ children }: { children: React.ReactNode }) {
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const update = () => setPortrait(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!portrait) return <>{children}</>;

  return (
    <>
      {children}
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950/85 px-8 text-center backdrop-blur-md">
        <div
          className="mb-6 text-5xl text-zinc-300"
          aria-hidden
        >
          ↻
        </div>
        <h2 className="text-lg font-semibold text-zinc-100">
          Please rotate your device to Landscape to enter the Trial.
        </h2>
        <p className="mt-2 max-w-xs text-sm text-zinc-400">
          The room view works best in landscape mode with on-screen controls.
        </p>
      </div>
    </>
  );
}
