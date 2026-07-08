import { getDownloadURL } from "firebase-admin/storage";

import {
  getTilesetCollection,
  type TileCategory,
} from "@/lib/tileset-collections";
import {
  clampTexturePx,
  isSvgFile,
  validateTextureDimensions,
} from "@/lib/texture-utils";
import { getFirebaseAdminBucket, getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import type { TilesetDocument } from "@/types/room";

export interface ServerUploadTileInput {
  file: File;
  name: string;
  category: TileCategory;
  pixelWidth: number;
  pixelHeight: number;
  gridWidth?: number;
  gridDepth?: number;
}

export async function serverUploadTileTexture(
  input: ServerUploadTileInput,
): Promise<{ id: string; tile: TilesetDocument }> {
  const {
    file,
    name,
    category,
    pixelWidth,
    pixelHeight,
    gridWidth,
    gridDepth,
  } = input;

  const isSvg = isSvgFile(file);
  if (!isSvg && !/\.png$/i.test(file.name) && file.type !== "image/png") {
    throw new Error("Only PNG and SVG files are supported.");
  }

  if (!isSvg) {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("PNG must be 5 MB or smaller.");
    }
  }

  const pxW = clampTexturePx(pixelWidth);
  const pxH = clampTexturePx(pixelHeight);
  const sizeError = validateTextureDimensions(pxW, pxH);
  if (sizeError) {
    throw new Error(sizeError);
  }

  const id = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const collectionName = getTilesetCollection(category);
  const storagePath = `tilesets/${collectionName}/${id}`;
  const contentType = isSvg ? "image/svg+xml" : "image/png";
  const bytes = Buffer.from(await file.arrayBuffer());

  const bucket = getFirebaseAdminBucket();
  const storageFile = bucket.file(storagePath);
  await storageFile.save(bytes, {
    metadata: { contentType },
    resumable: false,
  });

  const textureUrl = await getDownloadURL(storageFile);

  const metadata: TilesetDocument = {
    name,
    textureUrl,
    width: Math.round(gridWidth ?? (category === "furniture" ? 2 : 1)),
    depth: Math.round(
      gridDepth ?? (category === "door" ? 2 : category === "furniture" ? 1 : 1),
    ),
    pixelWidth: pxW,
    pixelHeight: pxH,
    ...(isSvg ? { format: "svg" as const } : {}),
  };

  await getFirebaseAdminDb().collection(collectionName).doc(id).set(metadata);
  return { id, tile: metadata };
}
