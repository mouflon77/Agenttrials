"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GameSavesPanel } from "@/components/dashboard/GameSavesPanel";
import { TerminalShell } from "@/components/terminal/TerminalShell";
import { useGames } from "@/hooks/useGames";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useRoomList } from "@/hooks/useRoomList";
import { formatRoomLabel } from "@/types/room";

function AdminSetupCard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="terminal-bezel mt-8 rounded-xl border-amber-900/40 bg-amber-950/30 p-4">
      <h2 className="text-sm font-black uppercase text-term-yellow">
        Admin setup required
      </h2>
      <p className="mt-2 font-mono text-xs leading-relaxed text-amber-200/80">
        Add your Firebase UID to{" "}
        <code className="text-term-green">NEXT_PUBLIC_ADMIN_UID</code> in{" "}
        <code className="text-term-green">.env.local</code>, then create{" "}
        <code className="text-term-green">config/app</code> with field{" "}
        <code className="text-term-green">adminUid</code>, or doc{" "}
        <code className="text-term-green">admins/{user.uid}</code>.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="max-w-full truncate rounded border border-zinc-700 bg-black/60 px-3 py-2 font-mono text-[10px] text-term-green">
          {user.uid}
        </code>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(user.uid)}
          className="chunky-btn rounded px-3 py-2 text-[10px] text-white"
        >
          Copy UID
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, userProfile } = useAuth();
  const isAdmin = useIsAdmin();
  const { games, loading: gamesLoading } = useGames(user?.uid);
  const { rooms, loading: roomsLoading } = useRoomList();

  const displayName =
    userProfile?.displayName ?? userProfile?.twitterHandle ?? "OPERATOR";

  const playRooms = rooms.length > 0 ? rooms : [{ id: "room_01" }];
  const defaultStartRoomId = playRooms[0]?.id ?? "room_01";
  const roomsById = useMemo(
    () => new Map(rooms.map((room) => [room.id, room])),
    [rooms],
  );

  return (
    <TerminalShell>
      <div className="mb-8 border-l-4 border-term-pink py-2 pl-6">
        <p className="font-mono text-sm leading-relaxed text-zinc-400">
          &gt; SESSION_START:{" "}
          <span className="font-bold text-white">{displayName}</span>
          <br />
          &gt; INITIALIZING HARDWARE INTERFACE... READY.
          <br />
          &gt; SELECT STORAGE MEDIUM OR INITIALIZE NEW INSTANCE.
        </p>
        <Link
          href="/leaderboard"
          className="chunky-btn mt-4 inline-block rounded px-5 py-2 text-[10px] text-white"
        >
          Leaderboards →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="terminal-bezel rounded-xl p-6 lg:col-span-7">
          <GameSavesPanel
            games={games}
            loading={gamesLoading}
            roomsById={roomsById}
            defaultStartRoomId={defaultStartRoomId}
          />
        </section>

        {isAdmin && (
          <section className="flex flex-col gap-6 lg:col-span-5">
            <div className="terminal-bezel circuit-bg relative flex-grow rounded-xl p-6">
              <div className="relative z-10 mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-black uppercase italic tracking-widest text-term-blue">
                  Floor Admin{" "}
                  <span className="text-[10px] not-italic text-zinc-500">v.01b</span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/admin/leagues"
                    className="chunky-btn capacitor-btn rounded px-4 py-2 text-[10px] text-white"
                  >
                    Leagues
                  </Link>
                  <Link
                    href="/admin/wallets"
                    className="chunky-btn rounded px-4 py-2 text-[10px] text-white"
                  >
                    Wallets
                  </Link>
                </div>
              </div>
              <div className="relative z-10 space-y-4">
                {roomsLoading ? (
                  <p className="font-mono text-xs text-zinc-500">
                    LOADING_SECTORS...
                  </p>
                ) : (
                  playRooms.map((room, index) => (
                    <div
                      key={room.id}
                      className="flex items-center justify-between rounded border-2 border-zinc-800 bg-black/60 p-4 shadow-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full shadow-[0_0_5px] ${
                              index % 2 === 0
                                ? "bg-term-blue shadow-term-blue"
                                : "bg-term-pink shadow-term-pink"
                            }`}
                          />
                          <span className="text-sm font-bold uppercase tracking-widest text-white">
                            {room.id}
                          </span>
                        </div>
                        <span className="ml-4 font-mono text-[10px] italic text-term-green/50">
                          sys/sectors/{String(index + 1).padStart(2, "0")}
                        </span>
                        {room.title && (
                          <p className="ml-4 mt-0.5 font-mono text-[9px] text-zinc-600">
                            {formatRoomLabel(room)}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/admin/editor?roomId=${encodeURIComponent(room.id)}`}
                        className="chunky-btn capacitor-btn rounded px-6 py-2 text-[10px] text-white"
                      >
                        EDIT
                      </Link>
                    </div>
                  ))
                )}
              </div>
              <div className="relative z-10 mt-8 grid grid-cols-2 gap-2 border-t border-zinc-800 pt-4 font-mono text-[9px] uppercase text-zinc-600">
                <div>Mem_Alloc: 512kb</div>
                <div>Baud_Rate: 9600</div>
                <div>Parity: None</div>
                <div>Mode: Admin_X</div>
              </div>
            </div>
          </section>
        )}
      </div>

      {isAdmin && (
        <section className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Link
            href="/admin/leagues"
            className="chunky-btn rounded-lg border-term-yellow/30 py-6 hover:bg-term-yellow/10"
          >
            <div className="flex flex-col items-center">
              <span className="mb-1 text-sm font-black text-term-yellow">
                Leagues
              </span>
              <span className="font-mono text-[9px] text-zinc-500">
                [ PROTOCOL: RANK_CTRL ]
              </span>
            </div>
          </Link>
          <Link
            href="/admin/wallets"
            className="chunky-btn rounded-lg border-term-green/30 py-6 hover:bg-term-green/10"
          >
            <div className="flex flex-col items-center">
              <span className="mb-1 text-sm font-black text-term-green">
                Agent Wallets
              </span>
              <span className="font-mono text-[9px] text-zinc-500">
                [ PROTOCOL: CRED_VAL ]
              </span>
            </div>
          </Link>
          <Link
            href="/admin/editor?roomId=room_01"
            className="chunky-btn rounded-lg border-term-pink/30 py-6 hover:bg-term-pink/10"
          >
            <div className="flex flex-col items-center">
              <span className="mb-1 text-sm font-black text-term-pink">
                Open Editor
              </span>
              <span className="font-mono text-[9px] text-zinc-500">
                [ PROTOCOL: SYS_OVER ]
              </span>
            </div>
          </Link>
        </section>
      )}

      {user && !isAdmin && <AdminSetupCard />}
    </TerminalShell>
  );
}
