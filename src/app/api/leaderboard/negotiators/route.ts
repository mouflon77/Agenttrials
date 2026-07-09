import { NextResponse } from "next/server";

import { AdminAuthError, requireUserRequest } from "@/lib/server/admin-auth";
import { getTopNegotiators } from "@/lib/server/leagues";

export async function GET(request: Request) {
  try {
    await requireUserRequest(request);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const entries = await getTopNegotiators();
  return NextResponse.json({ entries });
}
