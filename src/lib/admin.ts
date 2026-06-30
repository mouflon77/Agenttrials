/** Firebase Auth UID of the sole app admin (set in .env.local and App Hosting env). */
export function getAdminUid(): string | undefined {
  return process.env.NEXT_PUBLIC_ADMIN_UID?.trim() || undefined;
}

export function isAdminUid(uid: string | undefined | null): boolean {
  if (!uid) return false;
  const adminUid = getAdminUid();
  return Boolean(adminUid && uid === adminUid);
}
