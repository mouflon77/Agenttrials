"use client";

import {
  formatNegotiationScore,
  hasNegotiationScore,
  negotiationScoreBgStyle,
  negotiationScoreTextClass,
} from "@/types/league";

interface NegotiationScoreBadgeProps {
  score?: number | null;
  compact?: boolean;
}

export function NegotiationScoreBadge({
  score,
  compact = false,
}: NegotiationScoreBadgeProps) {
  if (!hasNegotiationScore(score)) {
    return (
      <div className={`text-center ${compact ? "" : "min-w-[4.5rem]"}`}>
        {!compact && (
          <p className="mb-0.5 font-mono text-[8px] uppercase tracking-widest text-zinc-600">
            Neg. Score
          </p>
        )}
        <span
          className="inline-block rounded border border-zinc-700/80 bg-zinc-900/80 px-2 py-0.5 font-mono text-sm font-black text-zinc-500"
          title="Negotiation score appears after your first correct keyword guess."
        >
          —
        </span>
      </div>
    );
  }

  const style = negotiationScoreBgStyle(score);
  const textClass = negotiationScoreTextClass(score);

  return (
    <div className={`text-center ${compact ? "" : "min-w-[4.5rem]"}`}>
      {!compact && (
        <p className="mb-0.5 font-mono text-[8px] uppercase tracking-widest text-zinc-600">
          Neg. Score
        </p>
      )}
      <span
        className={`inline-block rounded border border-white/10 px-2 py-0.5 font-mono text-sm font-black ${textClass}`}
        style={style}
        title="Negotiation quality (100 = best). Median of per-level medians."
      >
        {formatNegotiationScore(score)}
      </span>
    </div>
  );
}
