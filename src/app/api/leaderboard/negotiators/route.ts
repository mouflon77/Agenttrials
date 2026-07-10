import { NextResponse } from "next/server";

import { AdminAuthError, requireUserRequest } from "@/lib/server/admin-auth";
import { getTopPlayers } from "@/lib/server/leagues";

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
    const entries = await getTopPlayers();
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("[api/leaderboard/negotiators] GET failed:", error);
    return NextResponse.json(
      { error: "Could not load rankings." },
      { status: 500 },
    );
  }
}
