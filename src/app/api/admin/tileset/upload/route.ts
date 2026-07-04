import { NextResponse } from "next/server";

import { AdminAuthError, requireAdminRequest } from "@/lib/server/admin-auth";
import { serverUploadTileTexture } from "@/lib/server/tileset-upload";
import { TILESET_CATEGORIES, type TileCategory } from "@/lib/tileset-collections";

export const runtime = "nodejs";

function isTileCategory(value: string): value is TileCategory {
  return (TILESET_CATEGORIES as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  try {
    await requireAdminRequest(request);

    const form = await request.formData();
    const file = form.get("file");
    const name = String(form.get("name") ?? "").trim();
    const category = String(form.get("category") ?? "");
    const pixelWidth = Number(form.get("pixelWidth"));
    const pixelHeight = Number(form.get("pixelHeight"));
    const gridWidthRaw = form.get("gridWidth");
    const gridDepthRaw = form.get("gridDepth");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required." }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "name is required." }, { status: 400 });
    }
    if (!isTileCategory(category)) {
      return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    }

    const result = await serverUploadTileTexture({
      file,
      name,
      category,
      pixelWidth,
      pixelHeight,
      gridWidth: gridWidthRaw != null ? Number(gridWidthRaw) : undefined,
      gridDepth: gridDepthRaw != null ? Number(gridDepthRaw) : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Upload failed. Try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
