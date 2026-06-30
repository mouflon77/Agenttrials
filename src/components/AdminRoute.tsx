"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [user, loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center">
        <h1 className="text-lg font-semibold text-zinc-100">Admin only</h1>
        <p className="max-w-sm text-sm text-zinc-400">
          The room editor and tileset tools are restricted to the app owner.
        </p>
        <Link
          href="/dashboard"
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
