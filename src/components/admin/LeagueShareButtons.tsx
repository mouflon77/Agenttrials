"use client";

import { useState } from "react";
import { LeagueQrOverlay } from "@/components/admin/LeagueQrOverlay";
import { leagueJoinUrl } from "@/lib/league-share";

interface LeagueShareButtonsProps {
  leagueName: string;
  code: string;
  compact?: boolean;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function LeagueShareButtons({
  leagueName,
  code,
  compact = false,
}: LeagueShareButtonsProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2000);
  };

  const handleCopyCode = async () => {
    if (await copyText(code)) flash("Code copied");
  };

  const handleCopyLink = async () => {
    if (await copyText(leagueJoinUrl(code))) flash("Link copied");
  };

  const handleShare = async () => {
    const url = leagueJoinUrl(code);
    const shareData = {
      title: `Join ${leagueName}`,
      text: `Join league "${leagueName}" with code ${code}`,
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // user cancelled or unsupported payload
      }
    }
    if (await copyText(url)) flash("Link copied");
  };

  const btn = compact
    ? "chunky-btn rounded px-2 py-1.5 text-[9px] font-black uppercase"
    : "chunky-btn rounded px-3 py-2 text-[10px] font-black uppercase";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btn} onClick={() => void handleCopyCode()}>
          Copy code
        </button>
        <button type="button" className={btn} onClick={() => void handleCopyLink()}>
          Copy link
        </button>
        <button
          type="button"
          className={`${btn} border-term-yellow/50 text-term-yellow`}
          onClick={() => setQrOpen(true)}
        >
          Show QR
        </button>
        <button type="button" className={btn} onClick={() => void handleShare()}>
          Share
        </button>
      </div>
      {message && (
        <p className="mt-1 font-mono text-[9px] text-term-green">{message}</p>
      )}
      {qrOpen && (
        <LeagueQrOverlay
          leagueName={leagueName}
          code={code}
          onClose={() => setQrOpen(false)}
        />
      )}
    </>
  );
}
