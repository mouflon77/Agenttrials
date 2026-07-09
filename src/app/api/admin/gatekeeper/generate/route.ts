import { NextResponse } from "next/server";
import { AdminAuthError, requireAdminRequest } from "@/lib/server/admin-auth";
import { generateGatekeeperFieldsForAdmin } from "@/lib/server/npc-puzzle-generator";
import { parseRoomFloor } from "@/types/game";

export interface GenerateGatekeeperRequest {
  roomId?: string;
  floor?: number;
  name: string;
  role?: string;
  conversationalStyle?: string;
  signatureQuirks?: string;
}

export async function POST(request: Request) {
  try {
    await requireAdminRequest(request);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: GenerateGatekeeperRequest;
  try {
    body = (await request.json()) as GenerateGatekeeperRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const floor =
    typeof body.floor === "number" && body.floor > 0
      ? body.floor
      : parseRoomFloor(body.roomId ?? "room_01");

  const result = await generateGatekeeperFieldsForAdmin({
    floor,
    name,
    role: body.role?.trim(),
    conversationalStyle: body.conversationalStyle?.trim(),
    signatureQuirks: body.signatureQuirks?.trim(),
  });

  return NextResponse.json(result);
}
