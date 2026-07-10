import { NextResponse } from "next/server";

import { AdminAuthError, requireAdminRequest } from "@/lib/server/admin-auth";
import { getLeagueById, reconcileLeague } from "@/lib/server/leagues";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ leagueId: string }> },
) {
  try {
    await requireAdminRequest(request);
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

    const result = await reconcileLeague(leagueId);
    return NextResponse.json({ ok: true, leagueId, ...result });
  } catch (error) {
    console.error("[api/admin/leagues/reconcile] POST failed:", error);
    return NextResponse.json(
      { error: "Could not reconcile league." },
      { status: 500 },
    );
  }
}
