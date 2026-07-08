import { NextResponse } from "next/server";

import { AdminAuthError, requireUserRequest } from "@/lib/server/admin-auth";
import { ensureRoomNpcPuzzles, getGame } from "@/lib/server/game-saves";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { normalizeRoom } from "@/types/room";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  let uid: string;
  try {
    ({ uid } = await requireUserRequest(request));
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { gameId } = await params;
  let roomId = "";
  try {
    const body = (await request.json()) as { roomId?: string };
    roomId = body.roomId?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!roomId) {
    return NextResponse.json({ error: "roomId required" }, { status: 400 });
  }

  const existing = await getGame(uid, gameId);
  if (!existing) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }

  const roomSnap = await getFirebaseAdminDb().collection("rooms").doc(roomId).get();
  if (!roomSnap.exists) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const room = normalizeRoom(
    roomSnap.data() as Parameters<typeof normalizeRoom>[0],
  );
  const game = await ensureRoomNpcPuzzles(uid, gameId, roomId, room);
  if (!game) {
    return NextResponse.json({ error: "Could not update game." }, { status: 500 });
  }

  return NextResponse.json({ game });
}
