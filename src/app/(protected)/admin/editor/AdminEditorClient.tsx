"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { UserProfileBar } from "@/components/UserProfileBar";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRoom } from "@/hooks/useRoom";
import { useTileset } from "@/hooks/useTileset";
import {
  addFurnitureItem,
  ensureRoom,
  fillFloorTiles,
  removeFurnitureItem,
  resetRoom,
  migrateFurnitureIds,
  updateDoorTile,
  updateFloorTile,
  updateFurnitureItem,
  updateRoomColors,
  updateWallTile,
  updateWindowTile,
} from "@/lib/firestore/rooms";
import { seedDefaultTilesets, deleteTile, renameTile, uploadTileTexture } from "@/lib/firestore/tileset";
import {
  clampTexturePx,
  readImageDimensions,
  validateTextureDimensions,
} from "@/lib/texture-utils";
import {
  EDITOR_TAB_LABELS,
  EDITOR_TABS,
  getTile,
  isProtectedTileId,
  sortedTileEntries,
} from "@/lib/tileset-collections";
import {
  DEFAULT_FURNITURE_COLOR,
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

const SELECTION_STORAGE_KEY = "agenttrials-editor-selection";

export default function AdminEditorClient() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId") ?? "room_01";
  const { room, loading, error } = useRoom(roomId);
  const { tilesets, isEmpty, loading: tilesetLoading, addTile, renameTileName, removeTile } =
    useTileset();

  const [mode, setMode] = useState<EditorMode>("floor");
  const [selectedByMode, setSelectedByMode] =
    useState<Record<EditorMode, string>>(DEFAULT_SELECTION);
  const [furnitureRotation, setFurnitureRotation] = useState(0);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(
    null,
  );
  const [furnitureColor, setFurnitureColor] = useState(DEFAULT_FURNITURE_COLOR);
  const [ghostPosition, setGhostPosition] = useState<{
    x: number;
    z: number;
  } | null>(null);
  const [hoverFloor, setHoverFloor] = useState<{ x: number; z: number } | null>(
    null,
  );
  const [hoverWall, setHoverWall] = useState<{
    side: WallSide;
    along: number;
    height: number;
  } | null>(null);
  const [painting, setPainting] = useState(false);
  const [paintError, setPaintError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [pixelWidth, setPixelWidth] = useState(64);
  const [pixelHeight, setPixelHeight] = useState(64);
  const [gridWidth, setGridWidth] = useState(1);
  const [gridDepth, setGridDepth] = useState(1);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingTileName, setPendingTileName] = useState("");
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(
    null,
  );
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const dragPaintingRef = useRef(false);
  const lastPaintedFloorRef = useRef<string | null>(null);
  const lastPaintedWallRef = useRef<string | null>(null);

  useEffect(() => {
    const endDrag = () => {
      dragPaintingRef.current = false;
      lastPaintedFloorRef.current = null;
      lastPaintedWallRef.current = null;
    };
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  const selectedTileId = selectedByMode[mode];

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SELECTION_STORAGE_KEY);
      if (stored) {
        setSelectedByMode({ ...DEFAULT_SELECTION, ...JSON.parse(stored) });
      }
    } catch {
      // ignore invalid stored selection
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(
      SELECTION_STORAGE_KEY,
      JSON.stringify(selectedByMode),
    );
  }, [selectedByMode]);

  useEffect(() => {
    if (!loading && !room) void ensureRoom(roomId);
  }, [loading, room, roomId]);

  useEffect(() => {
    if (!loading && room) void migrateFurnitureIds(roomId);
  }, [loading, room, roomId]);

  useEffect(() => {
    if (isEmpty) {
      void seedDefaultTilesets();
    }
  }, [isEmpty]);

  const occupied = useMemo(() => {
    const set = new Set<string>();
    room?.furniture.forEach((f) => {
      if (f.id === selectedFurnitureId) return;
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
  }, [room?.furniture, tilesets, selectedFurnitureId]);

  const selectedPlacedFurniture = useMemo(
    () => room?.furniture.find((f) => f.id === selectedFurnitureId) ?? null,
    [room?.furniture, selectedFurnitureId],
  );

  const ghostValid = useMemo(() => {
    if (!ghostPosition || mode !== "furniture") return false;

    if (selectedPlacedFurniture) {
      const def = getTile(tilesets, "furniture", selectedPlacedFurniture.type);
      return isFootprintValid(
        ghostPosition.x,
        ghostPosition.z,
        def?.width ?? 1,
        def?.depth ?? 1,
        selectedPlacedFurniture.rotation,
        GRID_SIZE,
        occupied,
      );
    }

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
    selectedPlacedFurniture,
    furnitureRotation,
    tilesets,
    occupied,
  ]);

  const brushPreview = useMemo(() => {
    if (mode === "furniture") return null;
    if (mode === "floor" && hoverFloor) {
      return {
        category: "floor" as const,
        tileId: selectedTileId,
        floorCell: hoverFloor,
      };
    }
    if (
      (mode === "wall" || mode === "door" || mode === "window") &&
      hoverWall
    ) {
      return {
        category: mode,
        tileId: selectedTileId,
        wallCell: hoverWall,
      };
    }
    return null;
  }, [mode, hoverFloor, hoverWall, selectedTileId]);

  const paletteItems = useMemo(
    () => sortedTileEntries(tilesets[mode]),
    [tilesets, mode],
  );
  const selectedTile = getTile(tilesets, mode, selectedTileId);

  useEffect(() => {
    setRenameValue(selectedTile?.name ?? "");
    setRenameError(null);
    setDeleteError(null);
  }, [selectedTileId, mode, selectedTile?.name]);

  const selectItem = (id: string) => {
    setSelectedByMode((prev) => ({ ...prev, [mode]: id }));
    if (mode === "furniture") {
      setSelectedFurnitureId(null);
    }
  };

  const runPaint = async (action: () => Promise<void>) => {
    setPainting(true);
    setPaintError(null);
    try {
      await action();
    } catch (err) {
      setPaintError(err instanceof Error ? err.message : "Could not save paint");
    } finally {
      setPainting(false);
    }
  };

  const paintFloorCell = (x: number, z: number) => {
    const key = floorIndex(x, z);
    if (lastPaintedFloorRef.current === key) return;
    lastPaintedFloorRef.current = key;
    void runPaint(() => updateFloorTile(roomId, key, selectedTileId));
  };

  const paintWallCell = (
    side: WallSide,
    along: number,
    height: number,
    gridKey: string,
    paint: () => Promise<void>,
  ) => {
    const stamp = `${gridKey}`;
    if (lastPaintedWallRef.current === stamp) return;
    lastPaintedWallRef.current = stamp;
    void runPaint(paint);
  };

  const handleFloorClick = (x: number, z: number) => {
    if (!room) return;

    if (mode === "floor") {
      dragPaintingRef.current = true;
      paintFloorCell(x, z);
      return;
    }

    if (mode === "furniture") {
      if (selectedPlacedFurniture && ghostValid) {
        void runPaint(() =>
          updateFurnitureItem(roomId, selectedPlacedFurniture.id, {
            x,
            z,
          }),
        );
        return;
      }

      if (ghostValid) {
        void runPaint(() =>
          addFurnitureItem(roomId, {
            id: `f_${Date.now()}`,
            type: selectedTileId,
            x,
            z,
            rotation: furnitureRotation,
            color: furnitureColor,
          }),
        );
        setGhostPosition(null);
      }
      return;
    }
  };

  const handleWallClick = (
    side: WallSide,
    along: number,
    height: number,
  ) => {
    const key = wallKey(side, along, height);
    dragPaintingRef.current = true;

    if (mode === "wall") {
      paintWallCell(side, along, height, key, () =>
        updateWallTile(roomId, key, selectedTileId),
      );
    } else if (mode === "door") {
      paintWallCell(side, along, height, key, () =>
        updateDoorTile(roomId, key, selectedTileId),
      );
    } else if (mode === "window") {
      paintWallCell(side, along, height, key, () =>
        updateWindowTile(roomId, key, selectedTileId),
      );
    }
  };

  const handleFillFloor = () => {
    void runPaint(() => fillFloorTiles(roomId, selectedTileId));
  };

  const handleFurnitureSelect = (id: string) => {
    if (mode !== "furniture" || !room) return;
    setSelectedFurnitureId(id);
    const item = room.furniture.find((f) => f.id === id);
    if (item) {
      setFurnitureRotation(item.rotation);
      setFurnitureColor(item.color ?? DEFAULT_FURNITURE_COLOR);
    }
  };

  const handleFurnitureRotationChange = (rotation: number) => {
    setFurnitureRotation(rotation);
    if (selectedFurnitureId) {
      void runPaint(() =>
        updateFurnitureItem(roomId, selectedFurnitureId, { rotation }),
      );
    }
  };

  const handleFurnitureColorChange = (color: string) => {
    setFurnitureColor(color);
    if (selectedFurnitureId) {
      void runPaint(() =>
        updateFurnitureItem(roomId, selectedFurnitureId, { color }),
      );
    }
  };

  const handleRemoveFurniture = () => {
    if (!selectedFurnitureId) return;
    void runPaint(async () => {
      await removeFurnitureItem(roomId, selectedFurnitureId);
      setSelectedFurnitureId(null);
      setFurnitureColor(DEFAULT_FURNITURE_COLOR);
    });
  };

  const handleResetRoom = () => {
    const confirmed = window.confirm(
      `Reset “${roomId}”? This deletes all furniture, floor paint, doors, and windows and restores the default room.`,
    );
    if (!confirmed) return;

    setResetting(true);
    setPaintError(null);
    void resetRoom(roomId)
      .then(() => {
        setSelectedFurnitureId(null);
        setFurnitureColor(DEFAULT_FURNITURE_COLOR);
        setGhostPosition(null);
      })
      .catch((err) => {
        setPaintError(err instanceof Error ? err.message : "Reset failed");
      })
      .finally(() => setResetting(false));
  };

  const clearPendingUpload = () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
    setPendingTileName("");
  };

  const handleRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === selectedTile?.name) return;

    setRenaming(true);
    setRenameError(null);
    try {
      await renameTile(mode, selectedTileId, trimmed);
      renameTileName(mode, selectedTileId, trimmed);
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : "Rename failed");
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTile || isProtectedTileId(selectedTileId)) return;

    const confirmed = window.confirm(
      `Delete “${selectedTile.name}” from the tileset? Rooms already painted with this tile will show the base color.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteTile(mode, selectedTileId);
      removeTile(mode, selectedTileId);

      const remaining = sortedTileEntries(tilesets[mode]).filter(
        ([id]) => id !== selectedTileId,
      );
      const nextId = remaining[0]?.[0] ?? DEFAULT_SELECTION[mode];
      selectItem(nextId);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const handleFileSelect = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const dims = await readImageDimensions(file);
      const err = validateTextureDimensions(dims.width, dims.height);
      if (err) {
        setUploadError(err);
        return;
      }
      setPendingFile(file);
      setPendingTileName(file.name.replace(/\.png$/i, ""));
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
      setPendingPreviewUrl(URL.createObjectURL(file));
      setPixelWidth(clampTexturePx(dims.width));
      setPixelHeight(clampTexturePx(dims.height));
    } catch {
      setUploadError("Could not read PNG dimensions.");
    }
  };

  const handleUpload = async () => {
    if (!pendingFile || !pendingTileName.trim()) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const { id, tile } = await uploadTileTexture({
        file: pendingFile,
        name: pendingTileName.trim(),
        category: mode,
        pixelWidth,
        pixelHeight,
        gridWidth: mode === "furniture" ? gridWidth : 1,
        gridDepth: mode === "furniture" ? gridDepth : 1,
      });
      addTile(mode, id, tile);
      selectItem(id);
      clearPendingUpload();
      setUploadSuccess(
        `“${tile.name}” saved to ${EDITOR_TAB_LABELS[mode]} tileset`,
      );
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
            <p className="text-xs text-zinc-500">
              {roomId}
              {painting ? " · Saving…" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[10px] text-zinc-500 sm:inline">
              Left-click paint · Right-drag orbit
            </span>
            <button
              type="button"
              onClick={handleResetRoom}
              disabled={resetting || !room}
              className="rounded border border-red-900/60 px-2 py-1 text-[11px] text-red-400 hover:bg-red-950/50 disabled:opacity-50"
            >
              {resetting ? "Resetting…" : "Reset room"}
            </button>
            <Link
              href={`/play/${roomId}`}
              className="text-xs text-zinc-400 underline"
            >
              Play view
            </Link>
            <UserProfileBar />
          </div>
        </header>

        {paintError && (
          <div className="absolute left-4 right-4 top-14 z-10 rounded bg-red-950/90 px-3 py-2 text-xs text-red-300">
            {paintError}
          </div>
        )}

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
            selectedFurnitureId={selectedFurnitureId}
            furnitureRotation={furnitureRotation}
            ghostPosition={ghostPosition}
            ghostValid={ghostValid}
            brushPreview={brushPreview}
            onFloorClick={handleFloorClick}
            onWallClick={handleWallClick}
            onFloorHover={(x, z) => {
              if (mode === "furniture") {
                setGhostPosition({ x, z });
              } else if (mode === "floor") {
                setHoverFloor({ x, z });
                if (dragPaintingRef.current) {
                  paintFloorCell(x, z);
                }
              }
            }}
            onFloorHoverEnd={() => {
              if (mode === "furniture") {
                setGhostPosition(null);
              } else if (mode === "floor") {
                setHoverFloor(null);
              }
            }}
            onWallHover={(side, along, height) => {
              if (mode === "wall" || mode === "door" || mode === "window") {
                setHoverWall({ side, along, height });
                if (dragPaintingRef.current) {
                  handleWallClick(side, along, height);
                }
              }
            }}
            onWallHoverEnd={() => {
              if (mode === "wall" || mode === "door" || mode === "window") {
                setHoverWall(null);
              }
            }}
            onFurnitureSelect={handleFurnitureSelect}
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
                setHoverFloor(null);
                setHoverWall(null);
                clearPendingUpload();
                setUploadSuccess(null);
                setSelectedFurnitureId(null);
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
                <label className="text-xs text-zinc-400">
                  Base floor color (untitled tiles)
                </label>
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
                <button
                  type="button"
                  disabled={painting}
                  onClick={handleFillFloor}
                  className="w-full rounded-lg border border-zinc-600 py-2 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                >
                  Fill entire floor with selected tile
                </button>
              </>
            )}
            {mode === "wall" && (
              <>
                <label className="text-xs text-zinc-400">
                  Base wall color (untitled tiles)
                </label>
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
          <div className="mb-4 space-y-3">
            {selectedPlacedFurniture ? (
              <>
                <p className="text-xs text-zinc-300">Editing placed item</p>
                <p className="text-[10px] text-zinc-500">
                  Click a floor tile to move. Changes save automatically.
                </p>
              </>
            ) : (
              <p className="text-[10px] text-zinc-500">
                Pick a type below, hover the floor, then click to place. Click an
                existing item to edit it.
              </p>
            )}
            <label className="text-xs text-zinc-400">Rotation</label>
            <select
              value={furnitureRotation}
              onChange={(e) =>
                handleFurnitureRotationChange(Number(e.target.value))
              }
              className="mt-1 w-full rounded bg-zinc-800 px-2 py-1.5 text-xs"
            >
              <option value={0}>0°</option>
              <option value={90}>90°</option>
              <option value={180}>180°</option>
              <option value={270}>270°</option>
            </select>
            <label className="text-xs text-zinc-400">Color</label>
            <input
              type="color"
              value={furnitureColor}
              onChange={(e) => handleFurnitureColorChange(e.target.value)}
              className="h-8 w-full cursor-pointer rounded"
            />
            {selectedPlacedFurniture && (
              <button
                type="button"
                disabled={painting}
                onClick={handleRemoveFurniture}
                className="w-full rounded-lg border border-red-900/60 py-2 text-xs text-red-400 hover:bg-red-950/40 disabled:opacity-50"
              >
                Remove selected
              </button>
            )}
            {room && room.furniture.length > 0 && (
              <div className="space-y-2 border-t border-zinc-800 pt-3">
                <p className="text-xs text-zinc-400">
                  Placed items ({room.furniture.length})
                </p>
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {room.furniture.map((item) => {
                    const def = getTile(tilesets, "furniture", item.type);
                    const label = def?.name ?? item.type;
                    const isSelected = selectedFurnitureId === item.id;
                    return (
                      <li
                        key={item.id}
                        className={`flex items-center gap-2 rounded px-2 py-1.5 text-[11px] ${
                          isSelected
                            ? "bg-blue-950/50 text-blue-200"
                            : "bg-zinc-900 text-zinc-300"
                        }`}
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate text-left hover:underline"
                          onClick={() => handleFurnitureSelect(item.id)}
                        >
                          {label} @ ({item.x}, {item.z})
                        </button>
                        <button
                          type="button"
                          disabled={painting}
                          title="Delete this item"
                          onClick={() => {
                            setSelectedFurnitureId(item.id);
                            void runPaint(async () => {
                              await removeFurnitureItem(roomId, item.id);
                              setSelectedFurnitureId(null);
                              setFurnitureColor(DEFAULT_FURNITURE_COLOR);
                            });
                          }}
                          className="shrink-0 rounded px-1.5 py-0.5 text-red-400 hover:bg-red-950/50 disabled:opacity-50"
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {selectedPlacedFurniture && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFurnitureId(null);
                  setFurnitureColor(DEFAULT_FURNITURE_COLOR);
                }}
                className="w-full rounded-lg border border-zinc-600 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                Place new instead
              </button>
            )}
          </div>
        )}

        {(mode === "wall" || mode === "door" || mode === "window") && (
          <p className="mb-3 text-[10px] text-zinc-500">
            Click any wall tile to paint. Spin the camera to reach all four
            walls.
          </p>
        )}

        {mode === "floor" && (
          <p className="mb-3 text-[10px] text-zinc-500">
            Left-click or click-drag to paint. Right-drag to orbit the camera.
          </p>
        )}

        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {EDITOR_TAB_LABELS[mode]} tileset
        </h2>
        <p className="mb-2 text-[10px] text-zinc-500">
          Sorted A–Z. Tileset uploads and room paint save to the cloud immediately.
        </p>

        {selectedTile && (
          <div className="mb-3 space-y-2 rounded-lg border border-zinc-700 p-2">
            {selectedTile.textureUrl && (
              <>
                <p className="text-[10px] text-zinc-500">Selected brush</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedTile.textureUrl}
                  alt={selectedTile.name}
                  className="h-16 w-full object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              </>
            )}
            <label className="block text-[10px] text-zinc-500">
              Tile name
              <input
                type="text"
                value={renameValue}
                maxLength={100}
                disabled={renaming}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleRename();
                }}
                className="mt-1 w-full rounded bg-zinc-800 px-2 py-1.5 text-xs text-zinc-100"
              />
            </label>
            <button
              type="button"
              disabled={
                renaming ||
                !renameValue.trim() ||
                renameValue.trim() === selectedTile.name
              }
              onClick={() => void handleRename()}
              className="w-full rounded-lg border border-zinc-600 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
            >
              {renaming ? "Renaming…" : "Rename tile"}
            </button>
            {renameError && (
              <p className="text-xs text-red-400">{renameError}</p>
            )}
            {!isProtectedTileId(selectedTileId) ? (
              <button
                type="button"
                disabled={deleting || renaming}
                onClick={() => void handleDelete()}
                className="w-full rounded-lg border border-red-900/60 py-1.5 text-xs text-red-400 hover:bg-red-950/40 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete tile"}
              </button>
            ) : (
              <p className="text-[10px] text-zinc-500">
                Built-in tiles cannot be deleted.
              </p>
            )}
            {deleteError && (
              <p className="text-xs text-red-400">{deleteError}</p>
            )}
          </div>
        )}

        {tilesetLoading ? (
          <p className="text-xs text-zinc-500">Loading tileset…</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {paletteItems.length === 0 ? (
              <p className="col-span-2 text-xs text-zinc-500">
                No tiles yet. Upload one below.
              </p>
            ) : (
              paletteItems.map(([id, tile]) => (
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
                    {mode === "furniture" &&
                      ` · ${tile.width}×${tile.depth} grid`}
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Add tile to tileset
          </h2>
          <input
            type="file"
            accept="image/png"
            disabled={uploading}
            onChange={(e) => void handleFileSelect(e.target.files?.[0])}
            className="w-full text-xs"
          />
          <p className="text-[10px] text-zinc-500">
            PNG only. Max {MAX_TEXTURE_PX}×{MAX_TEXTURE_PX}px. 64px = 1 tile
            unit.
          </p>

          {pendingFile && (
            <div className="space-y-2 rounded-lg border border-zinc-700 p-3">
              {pendingPreviewUrl && (
                <div className="rounded bg-zinc-800 p-2">
                  <p className="mb-2 text-[10px] text-zinc-500">Preview</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pendingPreviewUrl}
                    alt="Upload preview"
                    className="mx-auto h-24 w-full object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>
              )}
              <label className="block text-[10px] text-zinc-500">
                Tile name
                <input
                  type="text"
                  value={pendingTileName}
                  maxLength={100}
                  disabled={uploading}
                  onChange={(e) => setPendingTileName(e.target.value)}
                  className="mt-1 w-full rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-100"
                />
              </label>
              <p className="truncate text-xs text-zinc-500">{pendingFile.name}</p>
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
                disabled={uploading || !pendingTileName.trim()}
                onClick={() => void handleUpload()}
                className="w-full rounded-lg bg-zinc-100 py-2 text-xs font-medium text-zinc-900 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Save to tileset"}
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={clearPendingUpload}
                className="w-full rounded-lg border border-zinc-600 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          )}

          {uploadSuccess && (
            <p className="text-xs text-emerald-400">{uploadSuccess}</p>
          )}
          {uploadError && (
            <p className="text-xs text-red-400">{uploadError}</p>
          )}
        </div>
      </aside>
    </div>
  );
}
