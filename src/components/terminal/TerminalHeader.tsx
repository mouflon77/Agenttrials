"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { formatTwitterHandle } from "@/lib/twitter";

interface TerminalHeaderProps {
  className?: string;
}

function formatTerminalClock(): string {
  const now = new Date();
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const day = days[now.getDay()];
  const hours = now.getHours();
  const mins = String(now.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${day} ${String(h12).padStart(2, "0")}:${mins}${ampm} ${now.getFullYear()}`;
}

export function TerminalHeader({ className = "" }: TerminalHeaderProps) {
  const { user, userProfile } = useAuth();
  const isAdmin = useIsAdmin();
  const [clock, setClock] = useState(() => formatTerminalClock());

  useEffect(() => {
    const tick = () => setClock(formatTerminalClock());
    tick();
    const id = window.setInterval(tick, 10_000);
    return () => window.clearInterval(id);
  }, []);

  if (!user) return null;

  const photoURL = userProfile?.photoURL ?? user.photoURL;
  const handle = formatTwitterHandle(user, userProfile);
  const displayName = userProfile?.displayName ?? user.displayName;
  const label = handle ?? (displayName ? `@${displayName}` : "@OPERATOR");
  const shortId = user.uid.slice(0, 4).toUpperCase();

  return (
    <header
      className={`terminal-bezel mx-4 mt-4 flex flex-wrap items-center justify-between gap-4 rounded-t-xl px-4 py-4 sm:px-8 ${className}`}
    >
      <Link href="/dashboard" className="flex items-center gap-4">
        <div className="h-3 w-3 animate-pulse rounded-full bg-term-red shadow-[0_0_8px_#ff3131]" />
        <h1 className="neon-text text-2xl font-black uppercase italic tracking-tighter text-term-blue sm:text-3xl">
          Agent Trials
        </h1>
      </Link>

      <div className="flex flex-wrap items-center gap-3 sm:gap-6">
        <nav className="hidden items-center gap-2 sm:flex">
          <Link
            href="/dashboard"
            className="chunky-btn rounded px-3 py-1 text-[9px] text-white"
          >
            Dashboard
          </Link>
          <Link
            href="/leaderboard"
            className="chunky-btn rounded px-3 py-1 text-[9px] text-white"
          >
            Leaderboard
          </Link>
          {isAdmin && (
            <Link
              href="/admin/leagues"
              className="chunky-btn capacitor-btn rounded px-3 py-1 text-[9px] text-white"
            >
              Leagues
            </Link>
          )}
        </nav>

        <div className="flex gap-3 rounded border border-white/10 bg-black/50 px-3 py-1 font-mono text-xs text-term-green sm:gap-4 sm:text-sm">
          <span className="opacity-50">SYS_LOG: OK</span>
          <span className="tabular-nums">{clock}</span>
        </div>

        <Link
          href="/profile"
          className="terminal-bezel flex items-center gap-3 rounded border-zinc-700 bg-zinc-900 p-1 pr-4 transition hover:brightness-110"
        >
          <div className="h-10 w-10 overflow-hidden rounded border-2 border-term-yellow bg-black">
            {photoURL ? (
              <Image
                src={photoURL}
                alt=""
                width={40}
                height={40}
                className="h-full w-full object-cover contrast-125 grayscale"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-xs font-bold text-term-yellow">
                {label.replace(/^@/, "").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-term-yellow">
              {label.startsWith("@") ? label : `@${label}`}
            </span>
            <span className="font-mono text-[9px] text-zinc-500">
              ID_{shortId}-X
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
