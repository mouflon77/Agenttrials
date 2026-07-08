import { NextResponse } from "next/server";

import { AdminAuthError, requireAdminRequest } from "@/lib/server/admin-auth";
import { deleteLeague } from "@/lib/server/leagues";

export async function DELETE(
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

  const { leagueId } = await params;
  await deleteLeague(leagueId);
  return NextResponse.json({ ok: true });
}
