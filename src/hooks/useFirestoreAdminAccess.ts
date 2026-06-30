"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { isAdminUid } from "@/lib/admin";

/** True when Firestore rules will allow admin writes (admins doc or config/app). */
export function useFirestoreAdminAccess(): {
  canWrite: boolean;
  loading: boolean;
} {
  const { user } = useAuth();
  const [canWrite, setCanWrite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCanWrite(false);
      setLoading(false);
      return;
    }

    if (!isAdminUid(user.uid)) {
      setCanWrite(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      const db = getFirebaseDb();
      const [adminSnap, configSnap] = await Promise.all([
        getDoc(doc(db, "admins", user.uid)),
        getDoc(doc(db, "config", "app")),
      ]);
      if (cancelled) return;
      const configUid = configSnap.exists()
        ? (configSnap.data().adminUid as string | undefined)
        : undefined;
      setCanWrite(
        adminSnap.exists() || configUid === user.uid,
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { canWrite, loading };
}
