import { NextResponse } from "next/server";

import { AdminAuthError, requireUserRequest } from "@/lib/server/admin-auth";
import { listUserLeagueMemberships } from "@/lib/server/leagues";

export async function GET(request: Request) {
  let uid: string;
  try {
    ({ uid } = await requireUserRequest(request));
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const memberships = await listUserLeagueMemberships(uid);
  return NextResponse.json({ memberships });
}
