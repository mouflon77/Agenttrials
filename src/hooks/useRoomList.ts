"use client";

import { useEffect, useState } from "react";
import { subscribeToRoomList } from "@/lib/firestore/rooms";
import type { RoomListItem } from "@/types/room";

export function useRoomList() {
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    return subscribeToRoomList(
      (next) => {
        setRooms(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
  }, []);

  return { rooms, loading, error };
}
