import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase";
import {
  TILESET_CATEGORIES,
  createEmptyTilesetRegistry,
  getTilesetCollection,
  isProtectedTileId,
  type TileCategory,
  type TilesetRegistry,
} from "@/lib/tileset-collections";
import {
  clampTexturePx,
  contentTypeForTexture,
  formatForTexture,
  isSupportedTextureFile,
  readTextureDimensions,
  validateTextureDimensions,
} from "@/lib/texture-utils";
import type { TilesetDocument } from "@/types/room";

export function subscribeToTilesets(
  onData: (registry: TilesetRegistry) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const registry = createEmptyTilesetRegistry();

  const emit = () => {
    onData({
      floor: { ...registry.floor },
      wall: { ...registry.wall },
      door: { ...registry.door },
      window: { ...registry.window },
      furniture: { ...registry.furniture },
      standee: { ...registry.standee },
    });
  };

  const unsubscribes = TILESET_CATEGORIES.map((category) => {
    const col = collection(getFirebaseDb(), getTilesetCollection(category));
    return onSnapshot(
      col,
      (snapshot) => {
        const tiles: Record<string, TilesetDocument> = {};
        snapshot.forEach((d) => {
          tiles[d.id] = d.data() as TilesetDocument;
        });
        registry[category] = tiles;
        emit();
      },
      (error) => onError?.(error),
    );
  });

  return () => unsubscribes.forEach((unsub) => unsub());
}

export interface UploadTileOptions {
  file: File;
  name: string;
  category: TileCategory;
  pixelWidth: number;
  pixelHeight: number;
  gridWidth?: number;
  gridDepth?: number;
}

function uploadErrorMessage(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  const message =
    err instanceof Error ? err.message : "Upload failed. Try again.";

  if (
    code === "storage/unauthorized" ||
    code === "permission-denied" ||
    /unauthorized|permission/i.test(message)
  ) {
    return "Upload blocked by Firebase rules. Deploy storage + Firestore rules (SVG support), then retry.";
  }
  if (code === "storage/canceled") {
    return "Upload was canceled.";
  }
  if (code === "storage/retry-limit-exceeded") {
    return "Upload timed out. Check your network and try again.";
  }
  return message;
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s.`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function uploadTileTexture(
  options: UploadTileOptions,
): Promise<{ id: string; tile: TilesetDocument }> {
  const {
    file,
    name,
    category,
    pixelWidth,
    pixelHeight,
    gridWidth,
    gridDepth,
  } = options;

  try {
    if (!isSupportedTextureFile(file)) {
      throw new Error("Only PNG and SVG files are supported.");
    }

    const format = formatForTexture(file);
    // Re-validate intrinsic size for rasters; SVG display size is set by the editor.
    if (format === "png") {
      const actual = await readTextureDimensions(file);
      const dimensionError = validateTextureDimensions(
        actual.width,
        actual.height,
      );
      if (dimensionError) {
        throw new Error(dimensionError);
      }
    }

    const pxW = clampTexturePx(pixelWidth);
    const pxH = clampTexturePx(pixelHeight);
    const sizeError = validateTextureDimensions(pxW, pxH);
    if (sizeError) {
      throw new Error(sizeError);
    }

    // Keep a stable extension so vector URLs are detected as SVG in the room.
    const ext = format === "svg" ? ".svg" : ".png";
    const baseName = file.name
      .replace(/\.(png|svg)$/i, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    const id = `${Date.now()}_${baseName}${ext}`;
    const collectionName = getTilesetCollection(category);
    const contentType = contentTypeForTexture(file);
    const storageRef = ref(
      getFirebaseStorage(),
      `tilesets/${collectionName}/${id}`,
    );

    // Read bytes once so prior file.text() reads cannot interfere with upload.
    const bytes = await file.arrayBuffer();
    const blob = new Blob([bytes], { type: contentType });

    await withTimeout(
      uploadBytes(storageRef, blob, { contentType }),
      45_000,
      "Storage upload",
    );
    const textureUrl = await withTimeout(
      getDownloadURL(storageRef),
      15_000,
      "Getting download URL",
    );

    const metadata: TilesetDocument = {
      name,
      textureUrl,
      width: Math.round(gridWidth ?? (category === "furniture" ? 2 : 1)),
      depth: Math.round(gridDepth ?? 1),
      pixelWidth: pxW,
      pixelHeight: pxH,
      format,
    };

    await withTimeout(
      setDoc(doc(getFirebaseDb(), collectionName, id), metadata),
      15_000,
      "Saving tile metadata",
    );
    return { id, tile: metadata };
  } catch (err) {
    throw new Error(uploadErrorMessage(err));
  }
}

export async function renameTile(
  category: TileCategory,
  tileId: string,
  name: string,
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Name cannot be empty.");
  }
  if (trimmed.length > 100) {
    throw new Error("Name must be 100 characters or less.");
  }

  const collectionName = getTilesetCollection(category);
  const ref = doc(getFirebaseDb(), collectionName, tileId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Tile not found.");
  }

  await updateDoc(ref, { name: trimmed });
}

export async function deleteTile(
  category: TileCategory,
  tileId: string,
): Promise<void> {
  if (isProtectedTileId(tileId)) {
    throw new Error("Built-in tiles cannot be deleted.");
  }

  const collectionName = getTilesetCollection(category);
  const docRef = doc(getFirebaseDb(), collectionName, tileId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error("Tile not found.");
  }

  const data = snap.data() as TilesetDocument;
  if (data.textureUrl) {
    try {
      const storageRef = ref(
        getFirebaseStorage(),
        `tilesets/${collectionName}/${tileId}`,
      );
      await deleteObject(storageRef);
    } catch {
      // Texture may already be missing from storage.
    }
  }

  await deleteDoc(docRef);
}

const DEFAULT_PIXEL = 64;

function tile(name: string, width = 1, depth = 1): TilesetDocument {
  return {
    name,
    textureUrl: "",
    width,
    depth,
    pixelWidth: DEFAULT_PIXEL,
    pixelHeight: DEFAULT_PIXEL,
  };
}

const DEFAULT_TILES: Record<
  TileCategory,
  Record<string, TilesetDocument>
> = {
  floor: { default_floor: tile("Default Floor") },
  wall: { default_wall: tile("Default Wall") },
  door: { default_door: tile("Default Door") },
  window: { default_window: tile("Default Window") },
  furniture: {
    sofa_2x1: tile("Sofa 2x1", 2, 1),
    desk_2x2: tile("Large Desk 2x2", 2, 2),
  },
  standee: {
    default_standee: tile("Default Standee", 1, 1),
  },
};

export async function seedDefaultTilesets(): Promise<void> {
  for (const category of TILESET_CATEGORIES) {
    const collectionName = getTilesetCollection(category);
    for (const [id, data] of Object.entries(DEFAULT_TILES[category])) {
      await setDoc(doc(getFirebaseDb(), collectionName, id), data, { merge: true });
    }
  }
}

/** @deprecated Use seedDefaultTilesets */
export const seedDefaultTileset = seedDefaultTilesets;
