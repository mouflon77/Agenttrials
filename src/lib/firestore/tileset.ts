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
  readImageDimensions,
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

  const actual = await readImageDimensions(file);
  const dimensionError = validateTextureDimensions(
    actual.width,
    actual.height,
  );
  if (dimensionError) {
    throw new Error(dimensionError);
  }

  const pxW = clampTexturePx(pixelWidth);
  const pxH = clampTexturePx(pixelHeight);
  const sizeError = validateTextureDimensions(pxW, pxH);
  if (sizeError) {
    throw new Error(sizeError);
  }

  const id = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const collectionName = getTilesetCollection(category);
  const storageRef = ref(getFirebaseStorage(), `tilesets/${collectionName}/${id}`);
  await uploadBytes(storageRef, file, {
    contentType: file.type || "image/png",
  });
  const textureUrl = await getDownloadURL(storageRef);

  const metadata: TilesetDocument = {
    name,
    textureUrl,
    width: gridWidth ?? (category === "furniture" ? 2 : 1),
    depth: gridDepth ?? 1,
    pixelWidth: pxW,
    pixelHeight: pxH,
  };

  await setDoc(doc(getFirebaseDb(), collectionName, id), metadata);
  return { id, tile: metadata };
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
