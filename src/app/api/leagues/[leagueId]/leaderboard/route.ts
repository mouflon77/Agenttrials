import { NextResponse } from "next/server";

import { AdminAuthError, requireUserRequest } from "@/lib/server/admin-auth";
import { getLeaderboard, getLeagueById } from "@/lib/server/leagues";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leagueId: string }> },
) {
  try {
    await requireUserRequest(request);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { leagueId } = await params;
    const league = await getLeagueById(leagueId);
    if (!league) {
      return NextResponse.json({ error: "League not found." }, { status: 404 });
    }

    const entries = await getLeaderboard(leagueId);
    const { code: _code, ...publicLeague } = league;
    return NextResponse.json({ league: publicLeague, entries });
  } catch (error) {
    console.error("[api/leagues/leaderboard] GET failed:", error);
    return NextResponse.json(
      { error: "Could not load leaderboard." },
      { status: 500 },
    );
  }
}
