"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createEmptyTilesetRegistry,
  isTilesetRegistryEmpty,
  type TileCategory,
  type TilesetRegistry,
} from "@/lib/tileset-collections";
import { subscribeToTilesets } from "@/lib/firestore/tileset";
import type { TilesetDocument } from "@/types/room";

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

  const addTile = useCallback(
    (category: TileCategory, id: string, tile: TilesetDocument) => {
      setTilesets((prev) => ({
        ...prev,
        [category]: { ...prev[category], [id]: tile },
      }));
    },
    [],
  );

  const renameTileName = useCallback(
    (category: TileCategory, id: string, name: string) => {
      setTilesets((prev) => {
        const existing = prev[category][id];
        if (!existing) return prev;
        return {
          ...prev,
          [category]: {
            ...prev[category],
            [id]: { ...existing, name },
          },
        };
      });
    },
    [],
  );

  const removeTile = useCallback((category: TileCategory, id: string) => {
    setTilesets((prev) => {
      const nextCategory = { ...prev[category] };
      delete nextCategory[id];
      return { ...prev, [category]: nextCategory };
    });
  }, []);

  return {
    tilesets,
    loading,
    error,
    isEmpty: isTilesetRegistryEmpty(tilesets),
    addTile,
    renameTileName,
    removeTile,
  };
}
