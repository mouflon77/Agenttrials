"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useRoom } from "@/hooks/useRoom";
import { useTileset } from "@/hooks/useTileset";
import {
  addFurnitureItem,
  ensureRoom,
  updateDoorTile,
  updateFloorTile,
  updateRoomColors,
  updateWallTile,
  updateWindowTile,
} from "@/lib/firestore/rooms";
import { seedDefaultTilesets, uploadTileTexture } from "@/lib/firestore/tileset";
import {
  clampTexturePx,
  readImageDimensions,
  validateTextureDimensions,
} from "@/lib/texture-utils";
import {
  EDITOR_TABS,
  getTile,
} from "@/lib/tileset-collections";
import {
  GRID_SIZE,
  MAX_TEXTURE_PX,
  floorIndex,
  wallKey,
  type EditorMode,
  type WallSide,
} from "@/types/room";
import {
  getFootprintCells,
  isFootprintValid,
} from "@/components/room/Furniture";

const EditorScene = dynamic(
  () => import("@/components/room/EditorScene").then((m) => m.EditorScene),
  {
    ssr: false,
    loading: () => <div className="p-8 text-zinc-500">Loading editor…</div>,
  },
);

const DEFAULT_SELECTION: Record<EditorMode, string> = {
  floor: "default_floor",
  wall: "default_wall",
  door: "default_door",
  window: "default_window",
  furniture: "sofa_2x1",
};

export default function AdminEditorClient() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId") ?? "room_01";
  const { room, loading, error } = useRoom(roomId);
  const { tilesets, isEmpty } = useTileset();

  const [mode, setMode] = useState<EditorMode>("floor");
  const [selectedByMode, setSelectedByMode] = useState(DEFAULT_SELECTION);
  const [furnitureRotation, setFurnitureRotation] = useState(0);
  const [ghostPosition, setGhostPosition] = useState<{
    x: number;
    z: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pixelWidth, setPixelWidth] = useState(64);
  const [pixelHeight, setPixelHeight] = useState(64);
  const [gridWidth, setGridWidth] = useState(1);
  const [gridDepth, setGridDepth] = useState(1);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const selectedTileId = selectedByMode[mode];

  useEffect(() => {
    if (!loading && !room) void ensureRoom(roomId);
  }, [loading, room, roomId]);

  useEffect(() => {
    if (isEmpty) {
      void seedDefaultTilesets();
    }
  }, [isEmpty]);

  const occupied = useMemo(() => {
    const set = new Set<string>();
    room?.furniture.forEach((f) => {
      const def = getTile(tilesets, "furniture", f.type);
      const cells = getFootprintCells(
        f.x,
        f.z,
        def?.width ?? 1,
        def?.depth ?? 1,
        f.rotation,
      );
      cells.forEach((c) => set.add(`${c.x},${c.z}`));
    });
    return set;
  }, [room?.furniture, tilesets]);

  const ghostValid = useMemo(() => {
    if (!ghostPosition || mode !== "furniture") return false;
    const def = getTile(tilesets, "furniture", selectedTileId);
    return isFootprintValid(
      ghostPosition.x,
      ghostPosition.z,
      def?.width ?? 1,
      def?.depth ?? 1,
      furnitureRotation,
      GRID_SIZE,
      occupied,
    );
  }, [
    ghostPosition,
    mode,
    selectedTileId,
    furnitureRotation,
    tilesets,
    occupied,
  ]);

  const paletteItems = Object.entries(tilesets[mode]);

  const selectItem = (id: string) => {
    setSelectedByMode((prev) => ({ ...prev, [mode]: id }));
  };

  const handleFloorClick = async (x: number, z: number) => {
    if (!room) return;

    if (mode === "floor") {
      await updateFloorTile(roomId, floorIndex(x, z), selectedTileId);
      return;
    }

    if (mode === "furniture" && ghostValid) {
      await addFurnitureItem(roomId, {
        id: `f_${Date.now()}`,
        type: selectedTileId,
        x,
        z,
        rotation: furnitureRotation,
      });
      setGhostPosition(null);
    }
  };

  const handleWallClick = async (
    side: WallSide,
    along: number,
    height: number,
  ) => {
    const key = wallKey(side, along, height);
    if (mode === "wall") {
      await updateWallTile(roomId, key, selectedTileId);
    } else if (mode === "door") {
      await updateDoorTile(roomId, key, selectedTileId);
    } else if (mode === "window") {
      await updateWindowTile(roomId, key, selectedTileId);
    }
  };

  const handleFileSelect = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    try {
      const dims = await readImageDimensions(file);
      const err = validateTextureDimensions(dims.width, dims.height);
      if (err) {
        setUploadError(err);
        return;
      }
      setPendingFile(file);
      setPixelWidth(clampTexturePx(dims.width));
      setPixelHeight(clampTexturePx(dims.height));
    } catch {
      setUploadError("Could not read PNG dimensions.");
    }
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const id = await uploadTileTexture({
        file: pendingFile,
        name: pendingFile.name.replace(/\.png$/i, ""),
        category: mode,
        pixelWidth,
        pixelHeight,
        gridWidth: mode === "furniture" ? gridWidth : 1,
        gridDepth: mode === "furniture" ? gridDepth : 1,
      });
      selectItem(id);
      setPendingFile(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <div className="relative flex-1">
        <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 py-2 backdrop-blur">
          <div>
            <h1 className="text-sm font-semibold">Room Editor</h1>
            <p className="text-xs text-zinc-500">{roomId}</p>
          </div>
          <Link
            href={`/play/${roomId}`}
            className="text-xs text-zinc-400 underline"
          >
            Play view
          </Link>
        </header>

        {loading && (
          <div className="flex h-full items-center justify-center">Loading…</div>
        )}
        {error && <div className="p-8 text-red-400">{error}</div>}
        {room && (
          <EditorScene
            room={room}
            tilesets={tilesets}
            mode={mode}
            selectedTileId={selectedTileId}
            selectedFurnitureType={selectedTileId}
            furnitureRotation={furnitureRotation}
            ghostPosition={ghostPosition}
            ghostValid={ghostValid}
            onFloorClick={handleFloorClick}
            onWallClick={handleWallClick}
            onFloorHover={(x, z) =>
              mode === "furniture" && setGhostPosition({ x, z })
            }
            onFloorHoverEnd={() => setGhostPosition(null)}
          />
        )}
      </div>

      <aside className="w-80 overflow-y-auto border-l border-zinc-800 bg-zinc-900 p-4">
        <div className="mb-4 flex flex-wrap gap-1">
          {EDITOR_TABS.map(({ mode: tabMode, label }) => (
            <button
              key={tabMode}
              type="button"
              onClick={() => {
                setMode(tabMode);
                setGhostPosition(null);
                setPendingFile(null);
              }}
              className={`rounded-lg px-2.5 py-1.5 text-xs ${
                mode === tabMode
                  ? "bg-zinc-100 text-zinc-900"
                  : "bg-zinc-800 text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {(mode === "floor" || mode === "wall") && room && (
          <div className="mb-4 space-y-2">
            {mode === "floor" && (
              <>
                <label className="text-xs text-zinc-400">Floor tint (live)</label>
                <input
                  type="color"
                  value={room.floorColor}
                  onChange={(e) =>
                    void updateRoomColors(roomId, {
                      floorColor: e.target.value,
                    })
                  }
                  className="h-8 w-full cursor-pointer rounded"
                />
              </>
            )}
            {mode === "wall" && (
              <>
                <label className="text-xs text-zinc-400">Wall tint (live)</label>
                <input
                  type="color"
                  value={room.wallColor}
                  onChange={(e) =>
                    void updateRoomColors(roomId, {
                      wallColor: e.target.value,
                    })
                  }
                  className="h-8 w-full cursor-pointer rounded"
                />
              </>
            )}
          </div>
        )}

        {mode === "furniture" && (
          <div className="mb-4">
            <label className="text-xs text-zinc-400">Rotation</label>
            <select
              value={furnitureRotation}
              onChange={(e) => setFurnitureRotation(Number(e.target.value))}
              className="mt-1 w-full rounded bg-zinc-800 px-2 py-1.5 text-xs"
            >
              <option value={0}>0°</option>
              <option value={90}>90°</option>
              <option value={180}>180°</option>
              <option value={270}>270°</option>
            </select>
            <p className="mt-2 text-[10px] text-zinc-500">
              Hover floor tiles to preview. Green = valid, red = blocked.
            </p>
          </div>
        )}

        {(mode === "wall" || mode === "door" || mode === "window") && (
          <p className="mb-3 text-[10px] text-zinc-500">
            Click any wall tile to paint. Spin the camera to reach all four
            walls.
          </p>
        )}

        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Palette
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {paletteItems.map(([id, tile]) => (
            <button
              key={id}
              type="button"
              onClick={() => selectItem(id)}
              className={`rounded-lg border p-2 text-left text-xs ${
                selectedTileId === id
                  ? "border-zinc-100 bg-zinc-800"
                  : "border-zinc-700"
              }`}
            >
              {tile.textureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tile.textureUrl}
                  alt={tile.name}
                  className="mb-1 h-12 w-full object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <div className="mb-1 flex h-12 items-center justify-center bg-zinc-700 text-[10px]">
                  No texture
                </div>
              )}
              <span>{tile.name}</span>
              <span className="block text-[10px] text-zinc-500">
                {tile.pixelWidth ?? 64}×{tile.pixelHeight ?? 64}px
                {mode === "furniture" && ` · ${tile.width}×${tile.depth} grid`}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Upload sprite (.png)
          </h2>
          <input
            type="file"
            accept="image/png"
            disabled={uploading}
            onChange={(e) => void handleFileSelect(e.target.files?.[0])}
            className="w-full text-xs"
          />
          <p className="text-[10px] text-zinc-500">
            Max {MAX_TEXTURE_PX}×{MAX_TEXTURE_PX}px. 64px = 1 tile unit.
          </p>

          {pendingFile && (
            <div className="space-y-2 rounded-lg border border-zinc-700 p-3">
              <p className="truncate text-xs text-zinc-400">{pendingFile.name}</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] text-zinc-500">
                  Width (px)
                  <input
                    type="number"
                    min={1}
                    max={MAX_TEXTURE_PX}
                    value={pixelWidth}
                    onChange={(e) =>
                      setPixelWidth(clampTexturePx(Number(e.target.value)))
                    }
                    className="mt-1 w-full rounded bg-zinc-800 px-2 py-1 text-xs"
                  />
                </label>
                <label className="text-[10px] text-zinc-500">
                  Height (px)
                  <input
                    type="number"
                    min={1}
                    max={MAX_TEXTURE_PX}
                    value={pixelHeight}
                    onChange={(e) =>
                      setPixelHeight(clampTexturePx(Number(e.target.value)))
                    }
                    className="mt-1 w-full rounded bg-zinc-800 px-2 py-1 text-xs"
                  />
                </label>
              </div>
              {mode === "furniture" && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] text-zinc-500">
                    Grid width
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={gridWidth}
                      onChange={(e) => setGridWidth(Number(e.target.value))}
                      className="mt-1 w-full rounded bg-zinc-800 px-2 py-1 text-xs"
                    />
                  </label>
                  <label className="text-[10px] text-zinc-500">
                    Grid depth
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={gridDepth}
                      onChange={(e) => setGridDepth(Number(e.target.value))}
                      className="mt-1 w-full rounded bg-zinc-800 px-2 py-1 text-xs"
                    />
                  </label>
                </div>
              )}
              <button
                type="button"
                disabled={uploading}
                onClick={() => void handleUpload()}
                className="w-full rounded-lg bg-zinc-100 py-2 text-xs font-medium text-zinc-900 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Upload to tileset"}
              </button>
            </div>
          )}

          {uploadError && (
            <p className="text-xs text-red-400">{uploadError}</p>
          )}
        </div>
      </aside>
    </div>
  );
}
