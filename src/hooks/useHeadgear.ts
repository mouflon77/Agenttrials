"use client";

import { useEffect, useState } from "react";
import { subscribeToHeadgear } from "@/lib/firestore/headgear";
import type { HeadgearItem } from "@/types/avatar";

export function useHeadgear() {
  const [items, setItems] = useState<HeadgearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToHeadgear(
      (data) => {
        setItems(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { items, loading, error };
}
