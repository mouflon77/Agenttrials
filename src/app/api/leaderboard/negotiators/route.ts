import { NextResponse } from "next/server";

import { AdminAuthError, requireUserRequest } from "@/lib/server/admin-auth";
import { getTopPlayers } from "@/lib/server/leagues";

function parseIntParam(value: string | null, fallback: number): number {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(request: Request) {
  try {
    await requireUserRequest(request);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const limit = parseIntParam(url.searchParams.get("limit"), 50);
    const offset = parseIntParam(url.searchParams.get("offset"), 0);
    const page = await getTopPlayers(limit, offset);
    return NextResponse.json({
      entries: page.entries,
      hasMore: page.hasMore,
    });
  } catch (error) {
    console.error("[api/leaderboard/negotiators] GET failed:", error);
    return NextResponse.json(
      { error: "Could not load rankings." },
      { status: 500 },
    );
  }
}
