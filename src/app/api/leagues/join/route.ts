import { NextResponse } from "next/server";

import { AdminAuthError, requireUserRequest } from "@/lib/server/admin-auth";
import { joinLeague } from "@/lib/server/leagues";

export async function POST(request: Request) {
  let uid: string;
  try {
    ({ uid } = await requireUserRequest(request));
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { code?: string; gameId?: string };
  try {
    body = (await request.json()) as { code?: string; gameId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const code = body.code?.trim() ?? "";
  const gameId = body.gameId?.trim() ?? "";
  if (!code || !gameId) {
    return NextResponse.json(
      { error: "League code and game are required." },
      { status: 400 },
    );
  }

  try {
    const membership = await joinLeague(uid, code, gameId);
    return NextResponse.json({
      membership: {
        leagueId: membership.leagueId,
        leagueName: membership.leagueName,
        gameId: membership.gameId,
        joinedAt: membership.joinedAt,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not join league.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
