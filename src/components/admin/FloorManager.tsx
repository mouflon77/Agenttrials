"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createRoom, updateRoomTitle } from "@/lib/firestore/rooms";
import {
  formatRoomLabel,
  sanitizeRoomId,
  suggestNextRoomId,
  type RoomListItem,
} from "@/types/room";

interface FloorManagerProps {
  currentRoomId: string;
  currentTitle?: string;
  rooms: RoomListItem[];
  roomsLoading?: boolean;
}

export function FloorManager({
  currentRoomId,
  currentTitle,
  rooms,
  roomsLoading = false,
}: FloorManagerProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [newId, setNewId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [titleDraft, setTitleDraft] = useState(currentTitle ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitleDraft(currentTitle ?? "");
  }, [currentRoomId, currentTitle]);

  const suggestedId = useMemo(
    () => suggestNextRoomId(rooms.map((room) => room.id)),
    [rooms],
  );

  useEffect(() => {
    if (creating && !newId) setNewId(suggestedId);
  }, [creating, suggestedId, newId]);

  const openCreate = () => {
    setError(null);
    setNewId(suggestedId);
    setNewTitle("");
    setCreating(true);
  };

  const switchFloor = (id: string) => {
    if (!id || id === currentRoomId) return;
    router.push(`/admin/editor?roomId=${encodeURIComponent(id)}`);
  };

  const handleCreate = async () => {
    const id = sanitizeRoomId(newId || suggestedId);
    if (!id) {
      setError("Enter a valid floor id.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const createdId = await createRoom(id, { title: newTitle });
      setCreating(false);
      router.push(`/admin/editor?roomId=${encodeURIComponent(createdId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create floor.");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveTitle = async () => {
    const next = titleDraft.trim();
    if (next === (currentTitle ?? "").trim()) return;
    setBusy(true);
    setError(null);
    try {
      await updateRoomTitle(currentRoomId, next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save title.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="floor-select">
          Floor
        </label>
        <select
          id="floor-select"
          value={currentRoomId}
          onChange={(e) => switchFloor(e.target.value)}
          disabled={roomsLoading || busy}
          className="max-w-[14rem] rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
        >
          {!rooms.some((room) => room.id === currentRoomId) && (
            <option value={currentRoomId}>{currentRoomId}</option>
          )}
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {formatRoomLabel(room)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={openCreate}
          disabled={busy}
          className="rounded border border-sky-800/80 bg-sky-950/40 px-2 py-1 text-[11px] text-sky-200 hover:bg-sky-900/50 disabled:opacity-50"
        >
          New floor
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <input
          type="text"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={() => void handleSaveTitle()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          placeholder="Floor title (e.g. Floor 1 — Lobby)"
          disabled={busy}
          className="min-w-[12rem] flex-1 rounded border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-[11px] text-zinc-200 placeholder:text-zinc-600"
        />
      </div>

      {creating && (
        <div className="mt-1 space-y-2 rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-lg">
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            New floor
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="text-[10px] text-zinc-500">Id</label>
              <input
                type="text"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                placeholder={suggestedId}
                className="w-full rounded bg-zinc-800 px-2 py-1 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500">Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Floor 2 — Archives"
                className="w-full rounded bg-zinc-800 px-2 py-1 text-xs"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleCreate()}
              className="rounded bg-sky-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setCreating(false);
                setError(null);
              }}
              className="rounded border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
