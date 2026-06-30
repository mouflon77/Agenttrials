"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useFirestoreAdminAccess } from "@/hooks/useFirestoreAdminAccess";

export function FirestoreAdminBanner() {
  const { user } = useAuth();
  const { canWrite, loading } = useFirestoreAdminAccess();

  if (loading || canWrite || !user) return null;

  return (
    <div className="absolute left-4 right-4 top-14 z-20 rounded-lg border border-amber-700/60 bg-amber-950/95 px-4 py-3 text-xs text-amber-100">
      <p className="font-semibold">Firestore admin not configured — saves will fail</p>
      <p className="mt-1 text-amber-200/90">
        In Firebase Console → Firestore, create document{" "}
        <code className="rounded bg-amber-900/60 px-1">config/app</code> with field{" "}
        <code className="rounded bg-amber-900/60 px-1">adminUid</code> ={" "}
        <code className="rounded bg-amber-900/60 px-1">{user.uid}</code> (string).
        Or create an empty doc at{" "}
        <code className="rounded bg-amber-900/60 px-1">admins/{user.uid}</code>.
        Then run{" "}
        <code className="rounded bg-amber-900/60 px-1">
          firebase deploy --only firestore:rules
        </code>
        .
      </p>
      <button
        type="button"
        onClick={() => void navigator.clipboard.writeText(user.uid)}
        className="mt-2 rounded border border-amber-600 px-2 py-1 text-[11px] hover:bg-amber-900/50"
      >
        Copy UID
      </button>
    </div>
  );
}
