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
import { deleteObject, ref } from "firebase/storage";
import { getFirebaseAuth, getFirebaseDb, getFirebaseStorage } from "@/lib/firebase";
import {
  TILESET_CATEGORIES,
  createEmptyTilesetRegistry,
  getTilesetCollection,
  isProtectedTileId,
  type TileCategory,
  type TilesetRegistry,
} from "@/lib/tileset-collections";
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

async function readUploadResponse(
  response: Response,
): Promise<{ id?: string; tile?: TilesetDocument; error?: string }> {
  const text = await response.text();
  if (!text) {
    return { error: `Upload failed (${response.status}).` };
  }

  try {
    return JSON.parse(text) as {
      id?: string;
      tile?: TilesetDocument;
      error?: string;
    };
  } catch {
    return {
      error:
        response.status >= 500
          ? "Server error during upload. Try again in a moment."
          : text.slice(0, 200),
    };
  }
}

/** Upload via server API — avoids browser Storage CORS on App Hosting. */
export async function uploadTileTexture(
  options: UploadTileOptions,
): Promise<{ id: string; tile: TilesetDocument }> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("You must be signed in to upload.");
  }

  const form = new FormData();
  form.append("file", options.file);
  form.append("name", options.name);
  form.append("category", options.category);
  form.append("pixelWidth", String(options.pixelWidth));
  form.append("pixelHeight", String(options.pixelHeight));
  if (options.gridWidth != null) {
    form.append("gridWidth", String(options.gridWidth));
  }
  if (options.gridDepth != null) {
    form.append("gridDepth", String(options.gridDepth));
  }

  let token = await user.getIdToken(true);
  let response = await fetch("/api/admin/tileset/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (response.status === 401) {
    token = await user.getIdToken(true);
    response = await fetch("/api/admin/tileset/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  }

  const payload = await readUploadResponse(response);

  if (!response.ok) {
    throw new Error(payload.error ?? "Upload failed. Try again.");
  }
  if (!payload.id || !payload.tile) {
    throw new Error("Upload succeeded but server returned an invalid response.");
  }

  return { id: payload.id, tile: payload.tile };
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
  door: { default_door: tile("Default Door", 1, 2), default_door_double: tile("Double Door", 2, 2) },
  window: {
    default_window: tile("Default Window", 1, 1),
    default_window_2w: tile("Window 2 Wide", 2, 1),
    default_window_2h: tile("Window 2 Tall", 1, 2),
    default_window_2x2: tile("Window 2×2", 2, 2),
  },
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
