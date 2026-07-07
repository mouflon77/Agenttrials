"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GameSavesPanel } from "@/components/dashboard/GameSavesPanel";
import { UserProfileBar } from "@/components/UserProfileBar";
import { useGames } from "@/hooks/useGames";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useRoomList } from "@/hooks/useRoomList";
import { formatRoomLabel } from "@/types/room";

function AdminSetupCard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
      <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
        Admin setup required
      </h2>
      <p className="mt-2 text-sm text-amber-800 dark:text-amber-300/90">
        The editor is locked to one account. Add your Firebase UID to{" "}
        <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">
          NEXT_PUBLIC_ADMIN_UID
        </code>{" "}
        in <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">.env.local</code>{" "}
        and App Hosting env, then in Firestore create document{" "}
        <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">config/app</code>{" "}
        with field{" "}
        <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">adminUid</code>{" "}
        (string) = your UID below. Alternatively create an empty doc at{" "}
        <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">
          admins/{user.uid}
        </code>
        .
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="max-w-full truncate rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-zinc-800 dark:border-amber-800 dark:bg-zinc-900 dark:text-zinc-200">
          {user.uid}
        </code>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(user.uid)}
          className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
        >
          Copy UID
        </button>
      </div>
      <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
        Restart <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">npm run dev</code>{" "}
        after updating env. Deploy Firestore rules with{" "}
        <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">
          firebase deploy --only firestore:rules
        </code>
        .
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { user, userProfile } = useAuth();
  const isAdmin = useIsAdmin();
  const { games, loading: gamesLoading } = useGames(user?.uid);
  const { rooms, loading: roomsLoading } = useRoomList();

  const displayName =
    userProfile?.displayName ?? userProfile?.twitterHandle ?? "there";

  const playRooms = rooms.length > 0 ? rooms : [{ id: "room_01" }];
  const defaultStartRoomId = playRooms[0]?.id ?? "room_01";
  const roomsById = useMemo(
    () => new Map(rooms.map((room) => [room.id, room])),
    [rooms],
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Agenttrials
          </h1>
          <UserProfileBar variant="light" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-zinc-600 dark:text-zinc-400">
          Welcome, {displayName}. Start a new game or continue a saved one
          {isAdmin ? ", or open the editor" : ""}.
        </p>

        <GameSavesPanel
          games={games}
          loading={gamesLoading}
          roomsById={roomsById}
          defaultStartRoomId={defaultStartRoomId}
        />

        {isAdmin && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Floors (admin)
          </h2>
          {roomsLoading ? (
            <p className="mt-3 text-sm text-zinc-500">Loading floors…</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {playRooms.map((room) => (
                <li
                  key={room.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {formatRoomLabel(room)}
                    </p>
                    <p className="font-mono text-[11px] text-zinc-500">{room.id}</p>
                  </div>
                  <Link
                    href={`/admin/editor?roomId=${encodeURIComponent(room.id)}`}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Edit
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        )}

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/profile"
            className="rounded-xl border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Customize avatar
          </Link>
          {isAdmin && (
            <>
              <Link
                href="/admin/wallets"
                className="rounded-xl border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Agent wallets
              </Link>
              <Link
                href="/admin/editor?roomId=room_01"
                className="rounded-xl border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Open editor
              </Link>
            </>
          )}
        </div>

        {user && !isAdmin && <AdminSetupCard />}
      </main>
    </div>
  );
}
