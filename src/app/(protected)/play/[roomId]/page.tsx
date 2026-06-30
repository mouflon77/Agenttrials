"use client";

import { Suspense } from "react";
import PlayPageClient from "./PlayPageClient";

function PlayPageFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-zinc-900 text-sm text-zinc-500">
      Loading room…
    </div>
  );
}

export default function PlayPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  return (
    <Suspense fallback={<PlayPageFallback />}>
      <PlayPageClient params={params} />
    </Suspense>
  );
}
