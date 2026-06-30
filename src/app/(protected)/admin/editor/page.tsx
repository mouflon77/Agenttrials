import { Suspense } from "react";
import AdminEditorClient from "./AdminEditorClient";

export default function AdminEditorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500">Loading editor…</div>}>
      <AdminEditorClient />
    </Suspense>
  );
}
