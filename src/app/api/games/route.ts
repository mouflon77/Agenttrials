import { NextResponse } from "next/server";

import { AdminAuthError, requireUserRequest } from "@/lib/server/admin-auth";
import { createGame } from "@/lib/server/game-saves";

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

  let startRoomId = "room_01";
  try {
    const body = (await request.json()) as { startRoomId?: string };
    if (body.startRoomId?.trim()) {
      startRoomId = body.startRoomId.trim();
    }
  } catch {
    // default start room
  }

  try {
    const game = await createGame(uid, startRoomId);
    return NextResponse.json({ game });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create game.";
    const status = message.includes("only keep") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
