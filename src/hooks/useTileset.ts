"use client";

import { useEffect, useState } from "react";
import {
  createEmptyTilesetRegistry,
  isTilesetRegistryEmpty,
  type TilesetRegistry,
} from "@/lib/tileset-collections";
import { subscribeToTilesets } from "@/lib/firestore/tileset";

export function useTileset() {
  const [tilesets, setTilesets] = useState<TilesetRegistry>(
    createEmptyTilesetRegistry,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToTilesets(
      (data) => {
        setTilesets(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { tilesets, loading, error, isEmpty: isTilesetRegistryEmpty(tilesets) };
}
