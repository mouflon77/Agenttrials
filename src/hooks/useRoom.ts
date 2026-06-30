"use client";

import { useEffect, useState } from "react";
import { subscribeToRoom } from "@/lib/firestore/rooms";
import type { RoomDocument } from "@/types/room";

export function useRoom(roomId: string) {
  const [room, setRoom] = useState<RoomDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToRoom(
      roomId,
      (data) => {
        setRoom(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [roomId]);

  return { room, loading, error };
}
