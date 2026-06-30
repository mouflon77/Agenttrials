"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const displayName = user?.displayName ?? "User";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Axonometric Sandbox
          </h1>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-zinc-600 dark:text-zinc-400">
          Welcome, {displayName}. Enter your room or open the editor.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/play/room_01"
            className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Play room_01
          </Link>
          <Link
            href="/admin/editor?roomId=room_01"
            className="rounded-xl border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Open editor
          </Link>
        </div>
      </main>
    </div>
  );
}
