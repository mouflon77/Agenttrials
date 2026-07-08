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
  let spawnOverride: { x: number; z: number } | undefined;
  try {
    const body = (await request.json()) as {
      startRoomId?: string;
      playerSpawnX?: number;
      playerSpawnZ?: number;
    };
    if (body.startRoomId?.trim()) {
      startRoomId = body.startRoomId.trim();
    }
    if (
      Number.isFinite(body.playerSpawnX) &&
      Number.isFinite(body.playerSpawnZ)
    ) {
      spawnOverride = {
        x: body.playerSpawnX as number,
        z: body.playerSpawnZ as number,
      };
    }
  } catch {
    // default start room
  }

  try {
    const game = await createGame(uid, startRoomId, spawnOverride);
    return NextResponse.json({ game });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create game.";
    const status = message.includes("only keep") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
