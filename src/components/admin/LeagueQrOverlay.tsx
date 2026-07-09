"use client";

import { QRCodeSVG } from "qrcode.react";
import { leagueJoinUrl } from "@/lib/league-share";

interface LeagueQrOverlayProps {
  leagueName: string;
  code: string;
  onClose: () => void;
}

export function LeagueQrOverlay({ leagueName, code, onClose }: LeagueQrOverlayProps) {
  const joinUrl = leagueJoinUrl(code);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/95 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal
      aria-label={`Join code for ${leagueName}`}
    >
      <div className="terminal-bezel w-full max-w-md rounded-2xl border-4 border-black p-8 text-center shadow-[8px_8px_0_0_#000]">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-term-pink">
          Scan to join
        </p>
        <h2 className="mt-2 text-xl font-black uppercase text-white">{leagueName}</h2>

        <div className="mx-auto mt-6 inline-block rounded-xl border-4 border-black bg-white p-4">
          <QRCodeSVG value={joinUrl} size={280} level="M" includeMargin={false} />
        </div>

        <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          Or enter code manually
        </p>
        <p className="mt-2 font-mono text-4xl font-black tracking-[0.35em] text-term-yellow">
          {code}
        </p>
        <p className="mt-4 break-all font-mono text-[9px] text-zinc-600">{joinUrl}</p>

        <button
          type="button"
          onClick={onClose}
          className="chunky-btn mt-8 w-full rounded-lg py-3 text-xs font-black uppercase"
        >
          Close
        </button>
      </div>
    </div>
  );
}
