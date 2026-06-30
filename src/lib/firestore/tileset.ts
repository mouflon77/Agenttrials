import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase";
import {
  TILESET_CATEGORIES,
  createEmptyTilesetRegistry,
  getTilesetCollection,
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
  const pending = new Set(TILESET_CATEGORIES);
  let reported = false;

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

        if (!reported) {
          pending.delete(category);
          if (pending.size === 0) {
            reported = true;
            onData({ ...registry });
          }
        } else {
          onData({ ...registry });
        }
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
): Promise<string> {
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
  await uploadBytes(storageRef, file);
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
  return id;
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
