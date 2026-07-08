import { NextResponse } from "next/server";

import { AdminAuthError, requireAdminRequest } from "@/lib/server/admin-auth";
import { createLeague, listLeagues } from "@/lib/server/leagues";

export async function GET(request: Request) {
  try {
    await requireAdminRequest(request);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const leagues = await listLeagues();
  return NextResponse.json({ leagues });
}

export async function POST(request: Request) {
  let uid: string;
  try {
    ({ uid } = await requireAdminRequest(request));
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { name?: string; code?: string };
  try {
    body = (await request.json()) as { name?: string; code?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const league = await createLeague(uid, body.name ?? "", body.code);
    return NextResponse.json({ league });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create league.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
