import { NextResponse } from "next/server";

import { AdminAuthError, requireUserRequest } from "@/lib/server/admin-auth";
import { deleteGame, getGame, updateGame } from "@/lib/server/game-saves";
import type { GameSavePatch } from "@/types/game";

export async function GET(
  request: Request,
  context: { params: Promise<{ gameId: string }> },
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

  const { gameId } = await context.params;
  const game = await getGame(uid, gameId);
  if (!game) {
    return NextResponse.json({ error: "Game not found." }, { status: 404 });
  }
  return NextResponse.json({ game });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ gameId: string }> },
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

  const { gameId } = await context.params;
  let patch: GameSavePatch;
  try {
    patch = (await request.json()) as GameSavePatch;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const game = await updateGame(uid, gameId, patch);
    return NextResponse.json({ game });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save game.";
    const status = message === "Game not found." ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ gameId: string }> },
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

  const { gameId } = await context.params;
  await deleteGame(uid, gameId);
  return NextResponse.json({ ok: true });
}
