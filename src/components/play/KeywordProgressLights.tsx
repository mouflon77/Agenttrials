"use client";

import type { KeywordLightState, KeywordProgress } from "@/lib/gatekeeper-keywords";

interface KeywordProgressLightsProps {
  progress: KeywordProgress | null;
  compact?: boolean;
}

const LIGHT_STYLES: Record<KeywordLightState, string> = {
  found: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.65)] border-emerald-300",
  hot: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.65)] border-amber-200 animate-pulse",
  missing: "bg-red-600/90 border-red-400/80",
};

export function KeywordProgressLights({
  progress,
  compact = false,
}: KeywordProgressLightsProps) {
  if (!progress || progress.total <= 0) return null;

  return (
    <div
      className={`flex items-center gap-2 ${compact ? "" : "rounded-lg border border-zinc-800 bg-black/40 px-3 py-2"}`}
    >
      <div className="flex items-center gap-1.5">
        {progress.lights.map((state, index) => (
          <span
            key={`kw-light-${index}`}
            title={
              state === "found"
                ? "Keyword found"
                : state === "hot"
                  ? "Getting warmer"
                  : "Still to find"
            }
            className={`block rounded-full border-2 ${compact ? "h-3 w-3" : "h-4 w-4"} ${LIGHT_STYLES[state]}`}
          />
        ))}
      </div>
      <p className={`font-mono tabular-nums text-zinc-400 ${compact ? "text-[9px]" : "text-[10px]"}`}>
        {progress.found}/{progress.total}
        {!compact && (
          <span className="ml-1 text-zinc-600">
            {progress.missing === 0 ? "· ready" : `· ${progress.missing} left`}
          </span>
        )}
      </p>
    </div>
  );
}
