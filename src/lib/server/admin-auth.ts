import { getAdminUid } from "@/lib/admin";
import { getFirebaseAdminAuth } from "@/lib/server/firebase-admin";

export class AdminAuthError extends Error {
  readonly status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AdminAuthError";
    this.status = status;
  }
}

/** Verify Firebase ID token and ensure caller is the app admin. */
export async function requireAdminRequest(
  request: Request,
): Promise<{ uid: string }> {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new AdminAuthError("Missing authorization token.");
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    throw new AdminAuthError("Missing authorization token.");
  }

  let uid: string;
  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    throw new AdminAuthError("Invalid or expired token.");
  }

  const adminUid = getAdminUid();
  if (!adminUid || uid !== adminUid) {
    throw new AdminAuthError("Admin access required.", 403);
  }

  return { uid };
}
